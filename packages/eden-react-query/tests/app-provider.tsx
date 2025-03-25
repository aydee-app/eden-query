import { httpBatchLink } from '@ap0nia/eden-react-query'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React, { useState } from 'react'

import { eden } from './eden'

function getAuthCookie() {
  return undefined
}

export function App(props: { children?: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())

  const [edenClient] = useState(() =>
    eden.createClient({
      links: [
        httpBatchLink({
          domain: 'http://localhost:3000',

          // You can pass any HTTP headers you wish here
          async headers() {
            return {
              authorization: getAuthCookie(),
            }
          },
        }),
      ],
    }),
  )

  return (
    <eden.Provider client={edenClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{props.children}</QueryClientProvider>
    </eden.Provider>
  )
}

export default App
