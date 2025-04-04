import { Unpromise } from '@trpc/server/unstable-core-do-not-import'

import type { DataTransformer } from '../core/transform'
import type { MaybePromise } from '../utils/types'
import type { ConsumerConfig, SSEClientOptions } from './config'
import type { ConsumerStreamResult } from './dto'
import type { inferTrackedOutput } from './tracked'
import type { EventSourceLike } from './types'

export interface SSEStreamConsumerOptions<TConfig extends ConsumerConfig> {
  url: () => MaybePromise<string>

  init: () => MaybePromise<EventSourceLike.InitDictOf<TConfig['EventSource']>> | undefined

  signal: AbortSignal

  deserialize?: DataTransformer['deserialize']

  EventSource: TConfig['EventSource']
}

type ResourceStreamGetter = {
  read(): Promise<Bun.ReadableStreamDefaultReadResult<ConsumerStreamResult<any>>>
  recreate(): Promise<void>
} & AsyncDisposable

const PING_EVENT = 'ping'

const SERIALIZED_ERROR_EVENT = 'serialized-error'

const CONNECTED_EVENT = 'connected'

const RETURN_EVENT = 'return'

interface SSEvent {
  id?: string
  data: unknown
  comment?: string
  event?: string
}

/**
 * @see https://html.spec.whatwg.org/multipage/server-sent-events.html
 */
export function sseStreamConsumer<TConfig extends ConsumerConfig>(
  opts: SSEStreamConsumerOptions<TConfig>,
): AsyncIterable<ConsumerStreamResult<TConfig>> {
  const { deserialize = (v) => v } = opts

  let clientOptions: SSEClientOptions = {}

  const signal = opts.signal

  let _es: InstanceType<TConfig['EventSource']> | null = null

  const createStream = () => {
    const stream = new ReadableStream<ConsumerStreamResult<TConfig>>({
      async start(controller) {
        const [url, init] = await Promise.all([opts.url(), opts.init()])

        type TEventSource = InstanceType<TConfig['EventSource']>

        const eventSource = (_es = new opts.EventSource(url, init) as TEventSource)

        controller.enqueue({
          type: 'connecting',
          eventSource: _es,
          event: null,
        })

        eventSource.addEventListener(CONNECTED_EVENT, (_msg) => {
          const msg = _msg as EventSourceLike.MessageEvent

          const options: SSEClientOptions = JSON.parse(msg.data)

          clientOptions = options

          controller.enqueue({
            type: 'connected',
            options,
            eventSource,
          })
        })

        eventSource.addEventListener(SERIALIZED_ERROR_EVENT, (_msg) => {
          const msg = _msg as EventSourceLike.MessageEvent

          controller.enqueue({
            type: 'serialized-error',
            error: deserialize(JSON.parse(msg.data)),
            eventSource,
          })
        })

        eventSource.addEventListener(PING_EVENT, () => {
          controller.enqueue({
            type: 'ping',
            eventSource,
          })
        })

        eventSource.addEventListener(RETURN_EVENT, () => {
          eventSource.close()
          controller.close()
          _es = null
        })

        eventSource.addEventListener('error', (event) => {
          if (eventSource.readyState === _es?.CLOSED) {
            controller.error(event)
          } else {
            controller.enqueue({
              type: 'connecting',
              eventSource,
              event,
            })
          }
        })

        eventSource.addEventListener('message', (_msg) => {
          const msg = _msg as EventSourceLike.MessageEvent

          const chunk = deserialize(JSON.parse(msg.data))

          const def: SSEvent = { data: chunk }

          if (msg.lastEventId) {
            def.id = msg.lastEventId
          }

          controller.enqueue({
            type: 'data',
            data: def as inferTrackedOutput<TConfig['data']>,
            eventSource,
          })
        })

        const onAbort = () => {
          try {
            eventSource.close()
            controller.close()
          } catch {
            // ignore errors in case the controller is already closed
          }
        }

        if (signal.aborted) {
          onAbort()
        } else {
          signal.addEventListener('abort', onAbort)
        }
      },
      cancel() {
        _es?.close()
      },
    })

    return stream
  }

  const getStreamResource = () => {
    let stream = createStream()
    let reader = stream.getReader()

    async function dispose() {
      await reader.cancel()
      _es = null
    }

    return makeAsyncResource(
      {
        read() {
          return reader.read()
        },
        async recreate() {
          await dispose()

          stream = createStream()
          reader = stream.getReader()
        },
      },
      dispose,
    )
  }

  return runStreamReader(getStreamResource, _es, clientOptions)
}

async function* runStreamReader(
  getStreamResource: () => ResourceStreamGetter,
  _es: EventSourceLike.AnyConstructor | null,
  clientOptions: SSEClientOptions,
) {
  await using stream = getStreamResource()

  while (true) {
    let promise = stream.read()

    const timeoutMs = clientOptions.reconnectAfterInactivityMs

    if (timeoutMs) {
      promise = withTimeout({
        promise,
        timeoutMs,
        onTimeout: async () => {
          const res: Awaited<typeof promise> = {
            value: {
              type: 'timeout',
              ms: timeoutMs,
              eventSource: _es,
            },
            done: false,
          }

          // Close and release old reader
          await stream.recreate()

          return res
        },
      })
    }

    const result = await promise

    if (result.done) {
      return result.value
    }

    yield result.value
  }
}

async function withTimeout<T>(opts: {
  promise: Promise<T>
  timeoutMs: number
  onTimeout: () => Promise<NoInfer<T>>
}): Promise<T> {
  using timeoutPromise = timerResource(opts.timeoutMs)

  const res = await Unpromise.race([opts.promise, timeoutPromise.start()])

  if (res === disposablePromiseTimerResult) {
    return await opts.onTimeout()
  }
  return res
}

export const disposablePromiseTimerResult = Symbol()

export function timerResource(ms: number) {
  let timer: ReturnType<typeof setTimeout> | null = null

  return makeResource(
    {
      start() {
        if (timer) {
          throw new Error('Timer already started')
        }

        const promise = new Promise<typeof disposablePromiseTimerResult>((resolve) => {
          timer = setTimeout(() => resolve(disposablePromiseTimerResult), ms)
        })
        return promise
      },
    },
    () => {
      if (timer) {
        clearTimeout(timer)
      }
    },
  )
}

// @ts-expect-error - polyfilling symbol

Symbol.dispose ??= Symbol()

// @ts-expect-error - polyfilling symbol

Symbol.asyncDispose ??= Symbol()

/**
 * Takes a value and a dispose function and returns a new object that implements the Disposable interface.
 * The returned object is the original value augmented with a Symbol.dispose method.
 * @param thing The value to make disposable
 * @param dispose Function to call when disposing the resource
 * @returns The original value with Symbol.dispose method added
 */
export function makeResource<T>(thing: T, dispose: () => void): T & Disposable {
  const it = thing as T & Partial<Disposable>

  const existing = it[Symbol.dispose]

  it[Symbol.dispose] = () => {
    dispose()
    existing?.()
  }

  return it as T & Disposable
}

/**
 * Takes a value and an async dispose function and returns a new object that implements the AsyncDisposable interface.
 * The returned object is the original value augmented with a Symbol.asyncDispose method.
 * @param thing The value to make async disposable
 * @param dispose Async function to call when disposing the resource
 * @returns The original value with Symbol.asyncDispose method added
 */
export function makeAsyncResource<T>(thing: T, dispose: () => Promise<void>): T & AsyncDisposable {
  const it = thing as T & Partial<AsyncDisposable>

  const existing = it[Symbol.asyncDispose]

  it[Symbol.asyncDispose] = async () => {
    await dispose()
    await existing?.()
  }

  return it as T & AsyncDisposable
}
