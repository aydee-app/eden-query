interface EdenConnectionStateBase<TError> {
  type: 'state'
  data?: never
  error: TError | null
}

interface EdenConnectionIdleState<TError> extends EdenConnectionStateBase<TError> {
  state: 'idle'
  error: null
}

interface EdenConnectionConnectingState<TError> extends EdenConnectionStateBase<TError> {
  state: 'connecting'
  error: TError | null
}

interface EdenConnectionPendingState extends EdenConnectionStateBase<never> {
  state: 'pending'
  error: null
}

export type EdenConnectionState<TError> =
  | EdenConnectionIdleState<TError>
  | EdenConnectionConnectingState<TError>
  | EdenConnectionPendingState
