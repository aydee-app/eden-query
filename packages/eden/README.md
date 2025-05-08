# Eden

> Type-safe client for [Elysia.js](https://elysiajs.com/).
>
> Custom, enhanced implementation of the official [Eden](https://github.com/elysiajs/eden/tree/main).

## Getting Started

### Installation

```sh
bun add elysia @ap0nia/eden@next
```

### Usage

```ts
// server.ts
import { Elysia, t } from 'elysia'

const app = new Elysia()
    .get('/', () => 'Hi Elysia')
    .get('/id/:id', ({ params: { id } }) => id)
    .post('/mirror', ({ body }) => body, {
        body: t.Object({
            id: t.Number(),
            name: t.String()
        })
    })
    .listen(3000)

export type App = typeof app 

// client.ts
import { treaty } from '@elysiajs/eden'
import type { App } from './server'

const client = treaty<App>('localhost:3000') 

// response: Hi Elysia
const { data: index } = await client.get()

// response: 1895
const { data: id } = await client.id({ id: 1895 }).get()

// response: { id: 1895, name: 'Skadi' }
const { data: nendoroid } = await client.mirror.post({
    id: 1895,
    name: 'Skadi'
})
```

## APIs

Eden exposes two main APIs, [fetch](#fetch) and [treaty](#treaty)

### Fetch

The syntax for `edenFetch` will look like this. Key points:

- The full path is written with the labels for path parameters included.
- Path parameters are specified in the second argument, along with query parameters, method, body, and headers.

```ts
import { edenFetch } from '@ap0nia/eden'
import type { App } from './server'

const eden = edenFetch<App>('http://localhost:8080')

eden('/id/:id', { params: { id: '1895' } })

eden('/mirror', { body: { method: 'POST', body: { id: 1895, name: 'Skadi' } }})
```

### Treaty

The syntax for `edenTreaty` will look like this. Key points:

- A request path is built by invoking a proxy.
- Path parameters are specified by invoking a property as a function method.
- Path parameters are not required as an input.
- The method is the last property invoked as a function method.
- First argument to GET requests is the same as second argument to `edenFetch`, e.g. query parameters, headers, etc.
- First argument to non GET requests, e.g. POST, PATCH, etc. is the body, and the second argument is query parameters, headers, etc.

```ts
import { edenFetch } from '@ap0nia/eden'
import type { App } from './server'

const eden = edenFetch<App>('http://localhost:8080')

eden.id({ id: 1895 }).get()
eden.mirror.post({ id: 1895, name: 'Skadi' })
```

## Request Resolution

`@ap0nia/eden` provides two request resolution strategies. Basic HTTP networking mode and links mode,
inspired byApollo GraphQL
[links](https://www.apollographql.com/docs/react/api/link/introduction)
and
[basic HTTP networking](https://www.apollographql.com/docs/react/networking/basic-http-networking).

### Basic HTTP Networking

By default, a light wrapper around the native `fetch` function is called to resolve the request.
See the implementation of [resolveEdenRequest](https://github.com/ap0nia/eden-query/blob/e880b97568a2fc0c58654f1fd105a5cd2ee6fb1e/packages/eden/src/core/resolve.ts#L188).
This function is generally called in both modes, but in different ways. In this mode, the function will be called directly.

### Links mode

Links can be specified to customize the flow of data on the client. The equivalent of "Basic HTTP Networking can be accomplished like so.

```ts
import { edenFetch, httpLink } from '@ap0nia/eden'
import type { App } from './server'

const eden = edenFetch<App>('http://localhost:8080', {
  links: [httpLink()]
})
```

All [tRPC links](https://trpc.io/docs/client/links) are implemented by this library.
However, some links may require server-side Elysia.js plugins to operate properly.
Links and their prerequisites are listed below.

#### HTTP Link

Basic HTTP interaction.

> No prerequisites.

```ts
import { edenFetch, httpLink } from '@ap0nia/eden'
import type { App } from './server'

const eden = edenFetch<App>('http://localhost:8080', {
  links: [httpLink()]
})
```

#### HTTP Batch Link

Requests made in the same event loop will be batched into a single request.
A server application plugin is needed to handle the batch request.
The plugin adds a new route. Batch requests can generally be GET or POST.
POST requests are versatile and the default.

> Elysia.js server application requires the batch plugin.

```ts
// server.ts
import { Elysia, t } from 'elysia'
import { batch } from '@ap0nia/eden/plugins'

const app = new Elysia()
    .batch({ types: true })
    .get('/', () => 'Hi Elysia')
    .get('/id/:id', ({ params: { id } }) => id)
    .post('/mirror', ({ body }) => body, {
        body: t.Object({
            id: t.Number(),
            name: t.String()
        })
    })
    .listen(3000)

export type App = typeof app 

// client.ts
import { edenFetch, httpBatchLink } from '@ap0nia/eden'
import type { App } from './server'

const eden = edenFetch<App>('http://localhost:8080', {
  links: [httpBatchLink({ types: true })]
})
```

### HTTP Batch Stream Link

Same as the HTTP Batch Link but allows response to be streamed,
preventing grouped requests from being blocked by one slow endpoint.

> Elysia.js server application requires the batch plugin.

### HTTP Subscription Link

A specific link for SSE subscriptions.
Experimental, not sure how to build this functionality out to match tRPC.

### Retry Link

Same as [tRPC retry link](https://trpc.io/docs/client/links/retryLink).

### Split Link

Same as [tRPC split link](https://trpc.io/docs/client/links/splitLink).

### Logger Link

Same as [tRPC logger link](https://trpc.io/docs/client/links/loggerLink).

### WS Link

WS link allows all HTTP requests to be sent via WebSockets.
This does __not__ allow WS or SSE subscriptions.
tRPC allows this because it handles subscriptions separately from the server.
Eden cannnot handle this because WebSocket routes are registered directly on the
server application, and cannot be proxied by any plugin.

> Elysia.js server application requires the ws plugin.

### Link types

Type-safety for links is provided as an opt-in feature. Type-safety will indicate errors in the following circumstances (non-exhaustive).

- Client uses HTTP Batch link but the batch plugin is not detected on the server application.
- Client uses a tranformer on the client but the transform plugin is not detected on the server application.
- Client uses the WS link but the ws plugin is not detected on the server application.
