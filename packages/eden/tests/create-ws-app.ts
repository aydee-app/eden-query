import { Elysia, getSchemaValidator, ValidationError } from 'elysia'
import { BunAdapter } from 'elysia/adapter/bun'
import { createHandleWSResponse, createWSMessageParser, ElysiaWS } from 'elysia/ws'
import type { ServerWebSocket } from 'elysia/ws/bun'
import { ws } from 'msw'

import { server } from './setup'

export function createWsApp(origin: string) {
  const app = new Elysia({
    adapter: {
      ...BunAdapter,
      async ws(app, path, options) {
        const { parse, body, response } = options

        const validateMessage = getSchemaValidator(body, {
          // @ts-expect-error private property
          modules: app.definitions.typebox,
          // @ts-expect-error private property
          models: app.definitions.type as Record<string, TSchema>,
          normalize: app.config.normalize,
        })

        const validateResponse = getSchemaValidator(response, {
          // @ts-expect-error private property
          modules: app.definitions.typebox,
          // @ts-expect-error private property
          models: app.definitions.type as Record<string, TSchema>,
          normalize: app.config.normalize,
        })

        const handleResponse = createHandleWSResponse(validateResponse)

        const parseMessage = createWSMessageParser(parse)

        const link = ws.link(`${origin}${path}`)

        server.use(
          link.addEventListener('connection', (connection) => {
            const { client } = connection

            const bunWs: ServerWebSocket<{}> = {
              send(data, _compress) {
                client.send(data)
                return 1
              },
              sendText(_data, _compress) {
                return 1
              },
              sendBinary(_data, _compress) {
                return 1
              },
              close(_code, _reason) {
                return 1
              },
              ping(_data) {
                return 1
              },
              pong(_data) {
                return 1
              },
              publish(_topic, _data, _compress) {
                return 1
              },
              publishText(_topic, _data, _compress) {
                return 1
              },
              publishBinary(_topic, _data, _compress) {
                return 1
              },
              terminate() {
                return 1
              },
              subscribe(_topic) {
                return 1
              },
              unsubscribe(_topic) {
                return 1
              },
              isSubscribed(_topic) {
                return false
              },
              cork(_callback) {
                return false as any
              },
              remoteAddress: '',
              readyState: 1,
              data: {},
            }

            connection.client.addEventListener('message', async (event) => {
              const message = await parseMessage(bunWs, event.data)

              if (validateMessage?.Check(message) === false) {
                const error = new ValidationError('message', validateMessage, message)
                client.send(error.message)
                return
              }

              const elysiaWs = new ElysiaWS(bunWs, {}, message)

              const result = options.message?.(elysiaWs, message)

              handleResponse(bunWs, result)
            })
          }),
        )
      },
    },
  })

  return app
}
