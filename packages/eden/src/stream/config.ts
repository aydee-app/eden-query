import type { EventSourceLike } from './types'

export interface ConsumerConfig {
  data: unknown
  error: unknown
  EventSource: EventSourceLike.AnyConstructor
}

export interface SSEClientOptions {
  /**
   * Timeout and reconnect after inactivity in milliseconds
   * @default undefined
   */
  reconnectAfterInactivityMs?: number
}
