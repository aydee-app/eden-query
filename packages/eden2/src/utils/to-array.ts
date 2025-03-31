export function toArray<const T>(value?: T): Extract<T, any[]> extends Array<infer A> ? A[] : T[] {
  if (value == null) return [] as any
  return (Array.isArray(value) ? value : [value]) as any
}
