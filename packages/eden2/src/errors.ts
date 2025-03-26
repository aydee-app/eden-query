/**
 * @see https://github.com/elysiajs/eden/blob/7b4e3d90f9f69bc79ca108da4f514ee845c7d9d2/src/errors.ts
 */
export class EdenFetchError<Status extends number = number, Value = unknown> extends Error {
  constructor(
    public status: Status,
    public value: Value,
  ) {
    super(value + '')
  }
}
