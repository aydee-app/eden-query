import type { EdenError } from '../core/error'
import type { InternalElysia } from '../core/types'
import { Observable, tap } from '../observable'
import type { EdenLink, Operation, OperationLink, OperationLinkResult } from './types'

/**
 * @see https://github.com/trpc/trpc/blob/0abf82448043f49c09dcdbb557b5a2b5344faf18/packages/client/src/links/loggerLink.ts#L16
 */
type ConsoleEsque = {
  log: (...args: any[]) => void
  error: (...args: any[]) => void
}

/**
 * @se https://github.com/trpc/trpc/blob/0abf82448043f49c09dcdbb557b5a2b5344faf18/packages/client/src/links/loggerLink.ts#L21
 */
type EnableFnOptions<T extends InternalElysia> =
  | {
      direction: 'down'
      result: OperationLinkResult<unknown, EdenError<T>> | EdenError<T>
    }
  | (Operation & {
      direction: 'up'
    })

/**
 * @see https://github.com/trpc/trpc/blob/0abf82448043f49c09dcdbb557b5a2b5344faf18/packages/client/src/links/loggerLink.ts#L31
 */
type EnabledFn<T extends InternalElysia> = (opts: EnableFnOptions<T>) => boolean

/**
 * @see https://github.com/trpc/trpc/blob/0abf82448043f49c09dcdbb557b5a2b5344faf18/packages/client/src/links/loggerLink.ts#L35
 */
type LoggerLinkFnOptions<T extends InternalElysia> = Operation &
  (
    | {
        /**
         * Request result
         */
        direction: 'down'
        result: OperationLinkResult<unknown, EdenError<T>> | EdenError<T>
        elapsedMs: number
      }
    | {
        /**
         * Request was just initialized
         */
        direction: 'up'
      }
  )

type LoggerLinkFn<T extends InternalElysia> = (opts: LoggerLinkFnOptions<T>) => void

type ColorMode = 'ansi' | 'css' | 'none'

/**
 * @see https://github.com/trpc/trpc/blob/0abf82448043f49c09dcdbb557b5a2b5344faf18/packages/client/src/links/loggerLink.ts#L61
 */
export interface LoggerLinkOptions<T extends InternalElysia> {
  logger?: LoggerLinkFn<T>

  enabled?: EnabledFn<T>

  /**
   * Used in the built-in defaultLogger
   */
  console?: ConsoleEsque

  /**
   * Color mode
   * @default typeof window === 'undefined' ? 'ansi' : 'css'
   */
  colorMode?: ColorMode

  /**
   * Include context in the log - defaults to false unless `colorMode` is 'css'
   */
  withContext?: boolean
}

const palettes = {
  css: {
    query: ['72e3ff', '3fb0d8'],
    mutation: ['c5a3fc', '904dfc'],
    subscription: ['ff49e1', 'd83fbe'],
  },
  ansi: {
    regular: {
      // Cyan background, black and white text respectively
      query: ['\x1b[30;46m', '\x1b[97;46m'],

      // Magenta background, black and white text respectively
      mutation: ['\x1b[30;45m', '\x1b[97;45m'],

      // Green background, black and white text respectively
      subscription: ['\x1b[30;42m', '\x1b[97;42m'],
    },
    bold: {
      query: ['\x1b[1;30;46m', '\x1b[1;97;46m'],
      mutation: ['\x1b[1;30;45m', '\x1b[1;97;45m'],
      subscription: ['\x1b[1;30;42m', '\x1b[1;97;42m'],
    },
  },
} as const

/**
 * @see https://github.com/trpc/trpc/blob/0abf82448043f49c09dcdbb557b5a2b5344faf18/packages/client/src/links/loggerLink.ts#L112-L115
 */
export type ExtendedLoggerFnOptions = LoggerLinkFnOptions<any> & {
  colorMode: ColorMode
  withContext?: boolean
}

function constructPartsAndArgs(opts: ExtendedLoggerFnOptions) {
  const { direction, type, withContext, id, params } = opts

  const parts: string[] = []

  const args: any[] = []

  const path = params.path ?? ''

  switch (opts.colorMode) {
    case 'none': {
      parts.push(direction === 'up' ? '>>' : '<<', type, `#${id}`, path)

      break
    }

    case 'ansi': {
      const [lightRegular, darkRegular] = palettes.ansi.regular[type]
      const [lightBold, darkBold] = palettes.ansi.bold[type]
      const reset = '\x1b[0m'

      parts.push(
        direction === 'up' ? lightRegular : darkRegular,
        direction === 'up' ? '>>' : '<<',
        type,
        direction === 'up' ? lightBold : darkBold,
        `#${id}`,
        path,
        reset,
      )

      break
    }

    case 'css':
    // falls through

    default: {
      const [light, dark] = palettes.css[type]
      const css = `
    background-color: #${direction === 'up' ? light : dark};
    color: ${direction === 'up' ? 'black' : 'white'};
    padding: 2px;
  `

      parts.push('%c', direction === 'up' ? '>>' : '<<', type, `#${id}`, `%c${path}%c`, '%O')
      args.push(css, `${css}; font-weight: bold;`, `${css}; font-weight: normal;`)
    }
  }

  switch (direction) {
    case 'up': {
      args.push(withContext ? { params, context: opts.context } : { params })
      break
    }

    case 'down':
    // falls through

    default: {
      args.push({
        params,
        result: opts.result,
        elapsedMs: opts.elapsedMs,
        ...(withContext && { context: opts.context }),
      })
    }
  }

  return { parts, args }
}

export type LoggerOptions = {
  c?: ConsoleEsque
  colorMode?: ColorMode
  withContext?: boolean
}

/**
 * Maybe this should be moved to it's own package?
 */
function defaultLogger<T extends InternalElysia>(options: LoggerOptions): LoggerLinkFn<T> {
  const { c = console, colorMode = 'css', withContext } = options

  return (props) => {
    const params = props.params

    const { parts, args } = constructPartsAndArgs({ ...props, colorMode, params, withContext })

    const fn: 'error' | 'log' =
      props.direction === 'down' &&
      props.result &&
      (props.result instanceof Error || 'error' in props.result)
        ? 'error'
        : 'log'

    c[fn].apply(null, [parts.join(' ')].concat(args))
  }
}

/**
 * @see https://trpc.io/docs/v11/client/links/loggerLink
 */
export function loggerLink<T extends InternalElysia>(options?: LoggerLinkOptions<T>): EdenLink<T> {
  const enabled = options?.enabled ?? (() => true)

  const colorMode = options?.colorMode ?? (typeof window === 'undefined' ? 'ansi' : 'css')

  const withContext = options?.withContext ?? colorMode === 'css'

  const logger = options?.logger ?? defaultLogger({ c: options?.console, colorMode, withContext })

  const logResult = (
    op: Operation,
    requestStartTime: number,
    result: OperationLinkResult<unknown, EdenError<T>> | EdenError<T>,
  ) => {
    const elapsedMs = Date.now() - requestStartTime

    if (enabled({ ...op, direction: 'down', result })) {
      logger({ ...op, direction: 'down', elapsedMs, result })
    }
  }

  const link: EdenLink<T> = (_runtime) => {
    const operationLink: OperationLink<T> = ({ op, next }) => {
      return new Observable((observer) => {
        if (enabled({ ...op, direction: 'up' })) {
          logger({ ...op, direction: 'up' })
        }

        const requestStartTime = Date.now()

        return next(op)
          .pipe(
            tap({
              next: (result) => {
                logResult(op, requestStartTime, result)
              },
              error: (result) => {
                logResult(op, requestStartTime, result)
              },
            }),
          )
          .subscribe(observer)
      })
    }

    return operationLink
  }

  return link
}
