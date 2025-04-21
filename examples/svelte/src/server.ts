import { batchPlugin, transformPlugin } from '@ap0nia/eden/plugins'
import { Elysia, t } from 'elysia'
import SuperJSON from 'superjson'

type Post = {
  id: string
  message: string
}

const posts = Array.from({ length: 5 }, (_, index) => {
  return {
    id: index + '',
    message: 'Post' + index,
  }
}) satisfies Array<Post>

export const app = new Elysia({ prefix: '/api' })
  .use(transformPlugin({ types: true, transformer: SuperJSON }))
  .use(batchPlugin({ types: true }))
  .get('/', () => 'Hello, SvelteKit')
  .get('/posts/:id', (context) => posts.find((post) => post.id === context.params.id))
  .patch(
    '/posts/:id',
    (context) => {
      const id = context.params.id
      const message = context.body

      const index = posts.findIndex((post) => post.id === id)

      if (!~index) {
        posts.push({ id, message })
      } else {
        posts[index] = { id, message }
      }
    },
    {
      body: t.String(),
    },
  )
  .get('/numbers', async function* () {
    for (let i = 0; i < 1_000; i++) {
      yield BigInt(i)
      await new Promise((resolve) => setTimeout(resolve, 1_000))
    }
  })

export type App = typeof app
