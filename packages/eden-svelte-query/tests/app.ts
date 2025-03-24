import { Elysia, t } from 'elysia'

export const app = new Elysia().post(
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
