import type { ConsumerConfig, SSEClientOptions } from './config'
import type { inferTrackedOutput } from './tracked'
import type { EventSourceLike } from './types'

interface ConsumerStreamResultBase<TConfig extends ConsumerConfig> {
  eventSource: InstanceType<TConfig['EventSource']> | null
}

interface ConsumerStreamResultData<TConfig extends ConsumerConfig>
  extends ConsumerStreamResultBase<TConfig> {
  type: 'data'
  data: inferTrackedOutput<TConfig['data']>
}

interface ConsumerStreamResultError<TConfig extends ConsumerConfig>
  extends ConsumerStreamResultBase<TConfig> {
  type: 'serialized-error'
  error: TConfig['error']
}

interface ConsumerStreamResultConnecting<TConfig extends ConsumerConfig>
  extends ConsumerStreamResultBase<TConfig> {
  type: 'connecting'
  event: EventSourceLike.EventOf<TConfig['EventSource']> | null
}
interface ConsumerStreamResultTimeout<TConfig extends ConsumerConfig>
  extends ConsumerStreamResultBase<TConfig> {
  type: 'timeout'
  ms: number
}
interface ConsumerStreamResultPing<TConfig extends ConsumerConfig>
  extends ConsumerStreamResultBase<TConfig> {
  type: 'ping'
}

interface ConsumerStreamResultConnected<TConfig extends ConsumerConfig>
  extends ConsumerStreamResultBase<TConfig> {
  type: 'connected'
  options: SSEClientOptions
}

export type ConsumerStreamResult<TConfig extends ConsumerConfig> =
  | ConsumerStreamResultData<TConfig>
  | ConsumerStreamResultError<TConfig>
  | ConsumerStreamResultConnecting<TConfig>
  | ConsumerStreamResultTimeout<TConfig>
  | ConsumerStreamResultPing<TConfig>
  | ConsumerStreamResultConnected<TConfig>
