export class ObservableAbortError extends Error {
  constructor(message?: string) {
    super(message)
    this.name = 'ObservableAbortError'
    Object.setPrototypeOf(this, ObservableAbortError.prototype)
  }
}
