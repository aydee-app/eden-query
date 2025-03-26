export function toArray<T>(value?: T): T extends Array<any> ? T : Array<T> {
  if (value == null) return [] as any
  return (Array.isArray(value) ? value : [value]) as any
}
