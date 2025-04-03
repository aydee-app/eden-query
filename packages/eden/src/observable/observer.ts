export type Observer<TValue = any, TError = any> = {
  next: (value: TValue) => void
  error: (err: TError) => void
  complete: () => void
}
