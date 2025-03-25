import { Elysia, t } from 'elysia'

export const app = new Elysia()
  .get('/posts', async () => {
    await new Promise((resolve) => setTimeout(resolve, 500))
    return ['A', 'B', 'C']
  })
  .post(
    '/posts/:id',
    async (context) => {
      return context.params.id
    },
    {
      body: t.Object({
        message: t.String(),
      }),
    },
  )

export type App = typeof app
