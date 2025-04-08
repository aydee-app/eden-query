import { Elysia } from 'elysia'

import { EDEN_STATE_KEY, WS_ENDPOINT } from '../constants'
import type { EdenRequestParams } from '../core/config'
import type { EdenWsFetchRequest, EdenWsIncomingMessage, EdenWsOutgoingMessage } from '../core/dto'
import { resolveEdenRequest } from '../core/resolve'
import type {
  DefinedTypeConfig,
  InternalElysia,
  ResolveTypeConfig,
  TypeConfig,
} from '../core/types'
import type { MaybeArray } from '../utils/types'

export interface WsPluginConfig<
  _TElysia extends InternalElysia = InternalElysia,
  _TConfig extends TypeConfig = any,
> {
  endpoint?: string
  types?: DefinedTypeConfig
}

/**
 */
export function wsPlugin<const T extends WsPluginConfig>(config: T = {} as any) {
  type TResolvedConfig = ResolveTypeConfig<T['types']>

  type TResolvedKey = TResolvedConfig['key'] extends PropertyKey ? TResolvedConfig['key'] : never

  const endpoint = config?.endpoint ?? WS_ENDPOINT

  const defaultKey = config.types === true ? EDEN_STATE_KEY : (config.types?.key ?? EDEN_STATE_KEY)

  const key = config.types ? defaultKey : undefined

  /**
   * @todo
   * Decide whether it is worth it to return an instance with strongly-typed batch routes.
   * For now, the returned application does not contain the registered routes since
   * the batch methods are not intended to be invoked directly...
   */
  const plugin = (app: Elysia) => {
    const appWithState = app.state((_state) => {
      type TResolvedState = Record<TResolvedKey, { ws: T }>

      const result = {}

      if (key) {
        result[key as never] = { ws: config } as never
      }

      return result as TResolvedState
    })

    const wsMessageHandler = handleWsMessage.bind(null, app)

    appWithState.ws(endpoint, {
      message: async (ws, raw) => {
        const messageOrMessages: MaybeArray<EdenWsOutgoingMessage> =
          typeof raw === 'string' ? JSON.parse(raw) : raw

        // For simplicity, if a single message was sent, respond in-kind with a single response.
        if (!Array.isArray(messageOrMessages)) {
          const incomingMessage = await wsMessageHandler(messageOrMessages)
          ws.send(incomingMessage)
          return
        }

        const operations = messageOrMessages.map(wsMessageHandler)
        const incomingMessages = await Promise.all(operations)
        ws.send(incomingMessages)
      },
    })

    return appWithState
  }

  return plugin
}

async function handleWsMessage(domain: Elysia, message: EdenWsOutgoingMessage) {
  switch (message.method) {
    case 'query': // falls through

    case 'mutation': {
      const incomingMessage = handleWsFetchRequest(domain, message)
      return incomingMessage
    }

    default: {
      console.log('UNKNOWN MESSAGE', message)
      return
    }
  }
}

async function handleWsFetchRequest(
  domain: Elysia,
  message: Extract<EdenWsOutgoingMessage, EdenWsFetchRequest>,
) {
  const resolvedParams: EdenRequestParams = {
    // Dummy origin as fallback. It will be routed to the Elysia.js server application instance regardless.
    base: 'http://e.ly',
    ...message.params.params,
    domain: domain,
  }

  const result = await resolveEdenRequest(resolvedParams)

  if (result.error) {
    const incomingMessage: EdenWsIncomingMessage = {
      id: message.id,
      error: { error: result.error, response: result.response },
      result: undefined,
    }

    return incomingMessage
  }

  const incomingMessage: EdenWsIncomingMessage = {
    id: message.id,
    error: result.error || undefined,
    result: {
      type: 'data',
      data: result.data,
      response: result.response,
    },
  }

  return incomingMessage
}
