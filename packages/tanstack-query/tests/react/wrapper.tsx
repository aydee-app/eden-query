import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useMemo } from 'react'

export function wrapper(props: { children?: React.ReactNode }) {
  const client = useMemo(() => new QueryClient(), [])
  return <QueryClientProvider client={client}>{props.children}</QueryClientProvider>
}
