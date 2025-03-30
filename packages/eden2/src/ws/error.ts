export interface EdenWebSocketClosedErrorOptions {
  message: string
  cause?: unknown
}

export class EdenWebSocketClosedError extends Error {
  constructor(options: EdenWebSocketClosedErrorOptions) {
    super(options.message, { cause: options.cause })

    this.name = 'TRPCWebSocketClosedError'

    Object.setPrototypeOf(this, EdenWebSocketClosedError.prototype)
  }
}

export class EdenWebSocketError extends Error {}
