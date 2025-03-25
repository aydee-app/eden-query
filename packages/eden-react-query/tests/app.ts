import { Elysia, t } from 'elysia'

export const app = new Elysia()
  .get('/posts', () => {
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
