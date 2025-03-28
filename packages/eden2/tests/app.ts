import { uneval } from 'devalue'
import { Elysia } from 'elysia'
import SuperJSON from 'superjson'

import { batchPlugin, jsonTransformerPlugin } from '../src/extensions/server/batch'

export const app = new Elysia()
  .use(batchPlugin())
  .use(
    jsonTransformerPlugin({
      transformer: [
        SuperJSON,
        {
          id: 'devalue',
          serialize: uneval,
          deserialize: (object) => eval(`(${object})`),
        },
      ],
    }),
  )

  .get('/hello', () => 'GET!')
  .post('/hello', async (context) => {
    // console.log(await context.request.formData())
    console.log({ body: context.body })

    return { hello: 'POST!', value: 12345n }
  })

export type App = typeof app
