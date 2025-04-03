import { describe, expect, test } from 'vitest'

import {
  isNumericString,
  isStringifiedObject,
  parseStringifiedDate,
  parseStringifiedObject,
  parseStringifiedValue,
} from '../../src/utils/parse'

describe('isNumericString', () => {
  test('returns true for numeric string', () => {
    expect(isNumericString(`${123}`)).toBeTruthy()
  })

  test('returns true for bigint string', () => {
    expect(isNumericString(`${123n}`)).toBeTruthy()
  })

  test('returns false for non-numeric string', () => {
    expect(isNumericString('')).toBeFalsy()
  })
})

describe('isStringifiedObject', () => {
  test('returns true for object', () => {
    expect(isStringifiedObject(JSON.stringify({}))).toBeTruthy()
  })

  test('returns true for array', () => {
    expect(isStringifiedObject(JSON.stringify([]))).toBeTruthy()
  })

  test('returns false for string', () => {
    expect(isStringifiedObject(JSON.stringify('Hello'))).toBeFalsy()
  })
})

describe('parseStringifiedDate', () => {
  test('returns false if not string', () => {
    expect(parseStringifiedDate({})).toBeFalsy()
    expect(parseStringifiedDate([])).toBeFalsy()
    expect(parseStringifiedDate(null)).toBeFalsy()
    expect(parseStringifiedDate(undefined)).toBeFalsy()
    expect(parseStringifiedDate(123)).toBeFalsy()
    expect(parseStringifiedDate(123n)).toBeFalsy()
  })

  test('returns date if valid date string', () => {
    const date = new Date(0)

    const string = date.toString()

    const result = parseStringifiedDate(string)

    expect(result).toStrictEqual(date)
  })

  test('returns date if valid iso date string', () => {
    const date = new Date(0)

    const string = date.toISOString()

    const result = parseStringifiedDate(string)

    expect(result).toStrictEqual(date)
  })
})

describe('parseStringifiedObject', () => {
  test('parses JSON-serializable object', () => {
    const object = {
      string: 'string',
      object: {
        number: 123,
      },
    }

    const result = parseStringifiedObject(JSON.stringify(object))

    expect(result).toStrictEqual(object)
  })

  test('parses object with date', () => {
    const date = new Date(0)

    const object = {
      string: 'string',
      object: {
        number: 123,
        date: date.toString(),
      },
    }

    const result = parseStringifiedObject(JSON.stringify(object))

    expect(result).toStrictEqual({ ...object, object: { ...object.object, date } })
  })
})

describe('parseStringifiedValue', () => {
  test('returns original value if empty string', () => {
    const string = ''

    expect(parseStringifiedValue(string)).toBe(string)
  })

  test('returns number if numeric string', () => {
    const value = 123

    const string = value.toString()

    expect(parseStringifiedValue(string)).toBe(value)
  })

  test('returns number if numeric string', () => {
    const value = 123

    const string = value.toString()

    expect(parseStringifiedValue(string)).toBe(value)
  })

  test('returns false if false string', () => {
    const value = false

    const string = value.toString()

    expect(parseStringifiedValue(string)).toBe(value)
  })

  test('returns true if true string', () => {
    const value = true

    const string = value.toString()

    expect(parseStringifiedValue(string)).toBe(value)
  })

  test('returns date if date string', () => {
    const value = new Date(0)

    const string = value.toString()

    expect(parseStringifiedValue(string)).toStrictEqual(value)
  })

  test('returns object if object string', () => {
    const date = new Date(0)

    const value = {
      string: 'string',
      object: {
        number: 123,
        date: date.toString(),
      },
    }

    const string = JSON.stringify(value)

    const expectedValue = {
      ...value,
      object: {
        ...value.object,
        date,
      },
    }

    expect(parseStringifiedValue(string)).toStrictEqual(expectedValue)
  })

  test('returns original string if no transform found', () => {
    const value = 'value'

    expect(parseStringifiedValue(value)).toBe(value)
  })

  test('returns original value if invalid value in JSON object string', () => {
    const value = '{ "bigint": 123n }'

    expect(parseStringifiedValue(value)).toBe(value)
  })
})
