/**
 * Utility class for managing a timeout that can be started, stopped, and reset.
 * Useful for scenarios where the timeout duration is reset dynamically based on events.
 */
export class ResettableTimeout {
  private timeout?: ReturnType<typeof setTimeout>

  constructor(
    private readonly onTimeout: () => void,
    private readonly timeoutMs: number,
  ) {}

  /**
   * Resets the current timeout, restarting it with the same duration.
   * Does nothing if no timeout is active.
   */
  public reset() {
    if (!this.timeout) return

    clearTimeout(this.timeout)
    this.timeout = setTimeout(this.onTimeout, this.timeoutMs)
  }

  public start() {
    clearTimeout(this.timeout)
    this.timeout = setTimeout(this.onTimeout, this.timeoutMs)
  }

  public stop() {
    clearTimeout(this.timeout)
    this.timeout = undefined
  }
}
