import SuperJSON from 'superjson'
import { describe, expectTypeOf, test } from 'vitest'

import type {
  ConfigWithTransformer,
  ConfigWithTransformers,
  ResolveTransformer,
  ResolveTransformers,
  TransformerConfig,
  TransformerProhibitedConfig,
  TransformerRequiredConfig,
  TransformerUnrestrictedConfig,
} from '../../src/core/transform'

describe('ResolveTransformer', () => {
  describe('returns generic options if transformer not found', () => {
    test('transformer does not exist', () => {
      type Result = ResolveTransformer<{}>
      expectTypeOf<Result>().toEqualTypeOf<Partial<ConfigWithTransformer>>()
      expectTypeOf<Result>().toEqualTypeOf<{}>()
    })

    test('transformer is invalid', () => {
      type Result = ResolveTransformer<{ transformer: {} }>
      expectTypeOf<Result>().toEqualTypeOf<Partial<ConfigWithTransformer>>()
      expectTypeOf<Result>().toEqualTypeOf<{}>()
    })

    test('transformers is invalid and transformer not specified', () => {
      type Result = ResolveTransformer<{ transformers: typeof SuperJSON }>
      expectTypeOf<Result>().toEqualTypeOf<Partial<ConfigWithTransformer>>()
      expectTypeOf<Result>().toEqualTypeOf<{}>()
    })
  })

  describe('prohibits transformer if invalid transformers', () => {
    test('transformers is invalid', () => {
      type Result = ResolveTransformer<{ transformers: {} }>
      expectTypeOf<Result>().toEqualTypeOf<{ transformer: never }>()
    })

    test('transformer and transformers are invalid', () => {
      type Result = ResolveTransformer<{ transformer: {}; transformers: {} }>
      expectTypeOf<Result>().toEqualTypeOf<{ transformer: never }>()
    })
  })

  describe('returns resolved transformer', () => {
    test('valid transformer', () => {
      type Result = ResolveTransformer<{ transformer: typeof SuperJSON }>
      expectTypeOf<Result>().toEqualTypeOf<{ transformer: typeof SuperJSON }>()
    })

    test('no transformer but valid transformers', () => {
      type Result = ResolveTransformer<{ transformers: [typeof SuperJSON] }>
      expectTypeOf<Result>().toEqualTypeOf<{ transformer: typeof SuperJSON }>()
    })

    describe('resolves transformer from transformers', () => {
      test('returns generic transformer config if invalid transformers', () => {
        type Result = ResolveTransformer<{ transformers: typeof SuperJSON }>
        expectTypeOf<Result>().toEqualTypeOf<Partial<ConfigWithTransformer>>()
        expectTypeOf<Result>().toEqualTypeOf<{}>()
      })

      test('returns generic transformer config if invalid record of transformers', () => {
        type Result = ResolveTransformer<{ transformers: { SuperJSON: 'hello' } }>
        expectTypeOf<Result>().toEqualTypeOf<Partial<ConfigWithTransformer>>()
        expectTypeOf<Result>().toEqualTypeOf<{}>()
      })

      test('returns generic transformer config if invalid array of transformers', () => {
        type Result = ResolveTransformer<{ transformers: ['hello'] }>
        expectTypeOf<Result>().toEqualTypeOf<Partial<ConfigWithTransformer>>()
        expectTypeOf<Result>().toEqualTypeOf<{}>()
      })

      test('returns union of record values if object of valid transformers', () => {
        type Result = ResolveTransformer<{ transformers: { SuperJSON: typeof SuperJSON } }>
        expectTypeOf<Result>().toEqualTypeOf<{ transformer: typeof SuperJSON }>()
      })

      test('returns union of array values if array of valid transformers', () => {
        type Result = ResolveTransformer<{ transformers: [typeof SuperJSON] }>
        expectTypeOf<Result>().toEqualTypeOf<{ transformer: typeof SuperJSON }>()
      })

      test('returns union of record values if object of multiple valid transformers', () => {
        type Transformers = {
          a: typeof SuperJSON
          b: {
            serialize: () => {}
            deserialize: () => {}
          }
          c: {
            serialize: () => {}
            deserialize: () => {}
          }
          d: {
            serialize: () => {}
            deserialize: () => {}
          }
        }

        type Result = ResolveTransformer<{ transformers: Transformers }>

        expectTypeOf<Result>().toEqualTypeOf<{ transformer: Transformers[keyof Transformers] }>()
      })

      test('returns union of array values if array of multiple valid transformers', () => {
        type Transformers = [
          typeof SuperJSON,
          {
            serialize: () => {}
            deserialize: () => {}
          },
          {
            serialize: () => {}
            deserialize: () => {}
          },
          {
            serialize: () => {}
            deserialize: () => {}
          },
        ]

        type Result = ResolveTransformer<{ transformers: Transformers }>

        expectTypeOf<Result>().toEqualTypeOf<{ transformer: Transformers[number] }>()
      })
    })
  })
})

describe('ResolveTransformers', () => {
  describe('returns transformers from config if valid', () => {
    test('valid transformers array', () => {
      type Config = { transformers: [] }

      type Result = ResolveTransformers<Config>

      expectTypeOf<Result>().toEqualTypeOf<Partial<Pick<Config, 'transformers'>>>()
    })

    test('valid transformers object', () => {
      type Config = { transformers: {} }

      type Result = ResolveTransformers<Config>

      expectTypeOf<Result>().toEqualTypeOf<Partial<Pick<Config, 'transformers'>>>()
    })

    test('valid transformers object with multiple values', () => {
      type Config = {
        transformers: {
          a: typeof SuperJSON
          b: {
            serialize: () => {}
            deserialize: () => {}
          }
          c: {
            serialize: () => {}
            deserialize: () => {}
          }
          d: {
            serialize: () => {}
            deserialize: () => {}
          }
        }
      }

      type Result = ResolveTransformers<Config>

      expectTypeOf<Result>().toEqualTypeOf<Partial<Pick<Config, 'transformers'>>>()
    })

    test('valid transformers array with multiple values', () => {
      type Config = {
        transformers: [
          typeof SuperJSON,
          {
            serialize: () => {}
            deserialize: () => {}
          },
          {
            serialize: () => {}
            deserialize: () => {}
          },
          {
            serialize: () => {}
            deserialize: () => {}
          },
        ]
      }

      type Result = ResolveTransformers<Config>

      expectTypeOf<Result>().toEqualTypeOf<Partial<Pick<Config, 'transformers'>>>()
    })
  })

  describe('returns generic transformers config if valid transformers in config', () => {
    test('invalid transformers array', () => {
      type Config = { transformers: ['hello'] }

      type Result = ResolveTransformers<Config>

      expectTypeOf<Result>().toEqualTypeOf<Partial<ConfigWithTransformers>>()
      expectTypeOf<Result>().toEqualTypeOf<{}>()
    })

    test('invalid transformers object', () => {
      type Config = { transformers: { hello: 'yes' } }

      type Result = ResolveTransformers<Config>

      expectTypeOf<Result>().toEqualTypeOf<Partial<ConfigWithTransformers>>()
      expectTypeOf<Result>().toEqualTypeOf<{}>()
    })

    test('invalid transformers object with single invalid value', () => {
      type Config = {
        transformers: {
          a: typeof SuperJSON
          b: {
            serialize: () => {}
            deserialize: () => {}
          }
          c: {
            serialize: () => {}
            deserialize: () => {}
          }
          d: {
            serialize: () => {}
            deserialize: () => {}
          }
          e: 'no'
        }
      }

      type Result = ResolveTransformers<Config>

      expectTypeOf<Result>().toEqualTypeOf<Partial<ConfigWithTransformers>>()
      expectTypeOf<Result>().toEqualTypeOf<{}>()
    })

    test('invalid transformers array with single invalid value', () => {
      type Config = {
        transformers: [
          typeof SuperJSON,
          {
            serialize: () => {}
            deserialize: () => {}
          },
          {
            serialize: () => {}
            deserialize: () => {}
          },
          {
            serialize: () => {}
            deserialize: () => {}
          },
          'oops',
        ]
      }

      type Result = ResolveTransformers<Config>

      expectTypeOf<Result>().toEqualTypeOf<Partial<ConfigWithTransformers>>()
      expectTypeOf<Result>().toEqualTypeOf<{}>()
    })
  })
})

describe('TransformerConfig', () => {
  describe('type-safety disabled', () => {
    test('disables type-safety for implicit undefined config', () => {
      type Result = TransformerConfig
      expectTypeOf<Result>().toEqualTypeOf<TransformerUnrestrictedConfig>()
    })

    test('disables type-safety for explicit undefined config', () => {
      type Result = TransformerConfig<{}, undefined>
      expectTypeOf<Result>().toEqualTypeOf<TransformerUnrestrictedConfig>()
    })

    test('disables type-safety for unknown config', () => {
      type Result = TransformerConfig<{}, unknown>
      expectTypeOf<Result>().toEqualTypeOf<TransformerUnrestrictedConfig>()
    })
  })

  describe('type-safety enabled', () => {
    test('prohibits transformer if none found', () => {
      type Result = TransformerConfig<{}, { key: 'eden' }>
      expectTypeOf<Result>().toEqualTypeOf<TransformerProhibitedConfig>()
      expectTypeOf<Result>().toMatchObjectType<{}>()
    })

    test('allows specified transformer if found', () => {
      type App = {
        store: {
          eden: {
            transform: {
              transformer: typeof SuperJSON
            }
          }
        }
      }

      type Config = App['store']['eden']['transform']
      type Result = TransformerConfig<App, true>
      type Expected = TransformerRequiredConfig<Config>

      expectTypeOf<Result>().toEqualTypeOf<Expected>()
      expectTypeOf<Result>().toMatchObjectType<Config>()
      expectTypeOf<Result>().toMatchObjectType<{ transformers?: [Config['transformer']] }>()
    })

    test('requires one of specified transformers in array', () => {
      type App = {
        store: {
          eden: {
            transform: {
              transformers: [
                typeof SuperJSON,
                {
                  serialize: () => {}
                  deserialize: () => {}
                },
                {
                  serialize: () => {}
                  deserialize: () => {}
                },
                {
                  serialize: () => {}
                  deserialize: () => {}
                },
              ]
            }
          }
        }
      }

      type Config = App['store']['eden']['transform']
      type Result = TransformerConfig<App, true>
      type Expected = TransformerRequiredConfig<Config>

      expectTypeOf<Result>().toEqualTypeOf<Expected>()
      expectTypeOf<Result>().toMatchObjectType<{ transformer: Config['transformers'][number] }>()
      expectTypeOf<Result>().toMatchObjectType<{ transformers?: Config['transformers'] }>()
    })
  })
})

describe('TransformerUnrestrictedConfig', () => {
  test('allows nothing to be provided', () => {
    expectTypeOf<TransformerUnrestrictedConfig>().toEqualTypeOf<{}>()
    expectTypeOf<{}>().toEqualTypeOf<TransformerUnrestrictedConfig>()
  })
})
