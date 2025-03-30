export function sleep(duration = 0): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, duration))
}
