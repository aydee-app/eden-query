import assert from 'node:assert'

import { uneval } from 'devalue'
import SuperJSON from 'superjson'
import { describe, expect, test } from 'vitest'

import { matchTransformer, resolveTransformer, resolveTransformers } from '../../src/core/transform'
import type { DataTransformerOptions } from '../../src/trpc/server/transformer'

describe('resolveTransformer', () => {
  test('returns nothing if undefined', () => {
    const result = resolveTransformer()
    expect(result).toBe(undefined)
  })

  test('returns original transformer properties if input/output already specified', () => {
    const transformer: DataTransformerOptions = {
      id: Symbol('transformer'),
      input: SuperJSON,
      output: {
        serialize: (object) => uneval(object),
        deserialize: (object) => eval(`(${object})`),
      },
    }

    const result = resolveTransformer(transformer)

    expect(result).toBeDefined()

    assert(result != null)

    expect(result.id).toBe(transformer.id)
    expect(result.input).toBe(transformer.input)
    expect(result.output).toBe(transformer.output)
    expect(result.original).toBe(transformer)
  })

  test('returns transformer as input/output properties if same serializer and deserializer', () => {
    const result = resolveTransformer(SuperJSON)

    expect(result).toBeDefined()

    assert(result != null)

    expect(result.input).toBe(SuperJSON)
    expect(result.output).toBe(SuperJSON)
    expect(result.original).toBe(SuperJSON)
  })
})

describe('resolveTransformers', () => {
  describe('works with nullish input', () => {
    test('returns empty array if undefined input', () => {
      const result = resolveTransformers()
      expect(result).toStrictEqual([])
    })

    test('returns empty array if null input', () => {
      // @ts-expect-error Trying nullish value.
      const result = resolveTransformers(null)
      expect(result).toStrictEqual([])
    })
  })

  describe('works with individual input and output transformers', () => {
    const transformer: DataTransformerOptions = {
      input: SuperJSON,
      output: {
        serialize: (object) => uneval(object),
        deserialize: (object) => eval(`(${object})`),
      },
    }

    test('single uniform transformer', () => {
      const result = resolveTransformers(SuperJSON)

      const first = result[0]

      expect(first).toBeDefined()
      expect(result).toHaveLength(1)

      assert(first != null)

      expect(first.id).toBe('0')
      expect(first.input).toBe(SuperJSON)
      expect(first.output).toBe(SuperJSON)
      expect(first.original).toBe(SuperJSON)
    })

    test('single input/output transformer', () => {
      const result = resolveTransformers(transformer)

      const first = result[0]

      expect(first).toBeDefined()
      expect(result).toHaveLength(1)

      assert(first != null)

      expect(first.id).toBe('0')
      expect(first.input).toBe(transformer.input)
      expect(first.output).toBe(transformer.output)
    })

    test('array of input/output transformers', () => {
      const input = [transformer, transformer]

      const result = resolveTransformers(input)

      expect(result).toHaveLength(input.length)

      result.forEach((resolved, index) => {
        expect(resolved.id).toBe(index.toString())
        expect(resolved.input).toBe(input[index]?.input)
        expect(resolved.output).toBe(input[index]?.output)
        expect(resolved.original).toBe(input[index])
      })
    })

    test('array of mixed transformers', () => {
      const input = [transformer, SuperJSON]

      const result = resolveTransformers(input)

      expect(result).toHaveLength(input.length)

      result.forEach((resolved, index) => {
        expect(resolved.id).toBe(index.toString())
        expect(resolved.original).toBe(input[index])
      })
    })

    test('object mapping of transformers', () => {
      const input = {
        a: transformer,
        b: transformer,
      }

      const entries = Object.entries(input)

      const result = resolveTransformers(input)

      expect(result).toHaveLength(entries.length)

      result.forEach((resolved, index) => {
        const entry = entries[index]

        expect(entry).toBeDefined()

        assert(entry != null)

        expect(resolved.id).toBe(entry[0])
        expect(resolved.input).toBe(entry[1].input)
        expect(resolved.output).toBe(entry[1].output)
        expect(resolved.original).toBe(entry[1])
      })
    })
  })
})

describe('matchTransformer', () => {
  test('works with array of mixed transformers', () => {
    const transformer: DataTransformerOptions = {
      input: SuperJSON,
      output: {
        serialize: (object) => uneval(object),
        deserialize: (object) => eval(`(${object})`),
      },
    }

    const input = [transformer, SuperJSON]

    const result = matchTransformer(input, SuperJSON)

    expect(result?.original).toBe(SuperJSON)
    expect(result?.id).toBe(input.findIndex((t) => t === SuperJSON).toString())
  })

  test('works with object mapping of mixed transformers', () => {
    const transformer: DataTransformerOptions = {
      input: SuperJSON,
      output: {
        serialize: (object) => uneval(object),
        deserialize: (object) => eval(`(${object})`),
      },
    }

    const input = {
      transformer,
      SuperJSON,
    }

    const result = matchTransformer(input, SuperJSON)

    expect(result?.original).toBe(SuperJSON)
    expect(result?.id).toBe('SuperJSON')
  })

  test('works with object mapping of mixed transformers', () => {
    const transformer: DataTransformerOptions = {
      input: SuperJSON,
      output: {
        serialize: (object) => uneval(object),
        deserialize: (object) => eval(`(${object})`),
      },
    }

    const input = {
      transformer,
      SuperJSON,
    }

    const result = matchTransformer(input, transformer)

    expect(result?.original).toBe(transformer)
    expect(result?.id).toBe('transformer')
  })
})
