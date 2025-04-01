import Elysia from 'elysia'
import SuperJSON from 'superjson'
import { describe, expectTypeOf, test } from 'vitest'

import type {
  EdenClientAllowedTransformer,
  EdenClientProhibitedTransformer,
  EdenClientRequiredTransformer,
  EdenClientTransformerOptions,
  ResolveTransformerFromConfig,
} from '../../src/core/transform'
import { batchPlugin } from '../../src/plugins/batch'
import { transformPlugin } from '../../src/plugins/transform'
import type { DataTransformerOptions } from '../../src/trpc/server/transformer'

describe('ResolveTransformerFromConfig', () => {
  // If the server application configures an object mapping of transformers,
  // a valid transformer is any of the values.
  test('object mapping of transformers allows any value', () => {
    type Transformers = {
      a: SuperJSON
      b: 'hello'
      c: true
    }

    type Config = {
      transformers: Transformers
    }

    type Result = ResolveTransformerFromConfig<Config>

    expectTypeOf<Result>().toEqualTypeOf<Transformers[keyof Transformers]>()
  })

  // If an array of transformers is configured, a valid transformer is any of the elements.
  test('array of transformers allows any element', () => {
    type Transformers = [SuperJSON, 'hello', true]

    type Config = {
      transformers: Transformers
    }

    type Result = ResolveTransformerFromConfig<Config>

    expectTypeOf<Result>().toEqualTypeOf<Transformers[number]>()
  })

  // If a single transformer is specified, then the only valid transformer is the one specified.
  test('single transformer only allows the specified transformer', () => {
    type Transformer = SuperJSON

    type Config = {
      transformer: Transformer
    }

    type Result = ResolveTransformerFromConfig<Config>

    expectTypeOf<Result>().toEqualTypeOf<Transformer>()
  })

  // Invalid configuration allows any arbitrary transformer.
  test('single transformer only allows the specified transformer', () => {
    type Config = {}

    type Result = ResolveTransformerFromConfig<Config>

    expectTypeOf<Result>().toEqualTypeOf<DataTransformerOptions>()
  })
})

describe('EdenClientTransformerOptions', () => {
  test('will not perform type-checking by default', () => {
    type Result = EdenClientTransformerOptions
    expectTypeOf<Result>().toEqualTypeOf<EdenClientAllowedTransformer>()
  })

  describe('does not perform type checking with falsy keys', () => {
    test('false', () => {
      type Result = EdenClientTransformerOptions<{}, false>
      expectTypeOf<Result>().toEqualTypeOf<EdenClientAllowedTransformer>()
    })

    test('undefined', () => {
      type Result = EdenClientTransformerOptions<{}, undefined>
      expectTypeOf<Result>().toEqualTypeOf<EdenClientAllowedTransformer>()
    })

    test('null', () => {
      type Result = EdenClientTransformerOptions<{}, null>
      expectTypeOf<Result>().toEqualTypeOf<EdenClientAllowedTransformer>()
    })

    test('void', () => {
      type Result = EdenClientTransformerOptions<{}, void>
      expectTypeOf<Result>().toEqualTypeOf<EdenClientAllowedTransformer>()
    })
  })

  test('disables type checking if invalid key is provided', () => {
    type Result = EdenClientTransformerOptions<{}, 'invalid-key'>
    expectTypeOf<Result>().toEqualTypeOf<EdenClientAllowedTransformer>()
  })

  test('prohibits transformer if valid key is provided and transformer config not found', () => {
    type Key = 'key'

    type Config = {
      [K in Key]: {}
    }

    type Result = EdenClientTransformerOptions<Config, Key>

    expectTypeOf<Result>().toEqualTypeOf<EdenClientProhibitedTransformer>()
  })

  test('requires transformer if valid key is provided and transformer found', () => {
    type Key = 'key'

    type TransformerConfig = {
      transformer: true
    }

    type Config = {
      [K in Key]: TransformerConfig
    }

    type Result = EdenClientTransformerOptions<Config, Key>

    expectTypeOf<Result>().toEqualTypeOf<EdenClientRequiredTransformer<TransformerConfig>>()
  })

  test('requires transformer if valid key is provided and transformers found', () => {
    type Key = 'key'

    type TransformerConfig = {
      transformers: true
    }

    type Config = {
      [K in Key]: TransformerConfig
    }

    type Result = EdenClientTransformerOptions<Config, Key>

    expectTypeOf<Result>().toEqualTypeOf<EdenClientRequiredTransformer<TransformerConfig>>()
  })

  test('requires correct transformer if valid key is provided and transformer found', () => {
    type Key = 'key'

    const _symbol = Symbol('transformer')

    type Transformer = typeof _symbol

    type TransformerConfig = {
      transformer: Transformer
    }

    type Config = {
      [K in Key]: TransformerConfig
    }

    type Result = EdenClientTransformerOptions<Config, Key>

    expectTypeOf<Result['transformer']>().toEqualTypeOf<Transformer>()
  })

  test('requires correct transformer if valid key is provided and array of transformers found', () => {
    type Key = 'key'

    type Transformers = [1, 2, 'true', false]

    type TransformerConfig = {
      transformers: Transformers
    }

    type Config = {
      [K in Key]: TransformerConfig
    }

    type Result = EdenClientTransformerOptions<Config, Key>

    expectTypeOf<Result['transformer']>().toEqualTypeOf<Transformers[number]>()
  })

  test('requires correct transformer if valid key is provided and object mapping of transformers found', () => {
    type Key = 'key'

    type Transformers = {
      a: 1
      b: 2
      c: 'true'
      d: false
    }

    type TransformerConfig = {
      transformers: Transformers
    }

    type Config = {
      [K in Key]: TransformerConfig
    }

    type Result = EdenClientTransformerOptions<Config, Key>

    expectTypeOf<Result['transformer']>().toEqualTypeOf<Transformers[keyof Transformers]>()
  })
})

describe('works with live application', () => {
  test('no key is added with the default plugin', () => {
    const _app = new Elysia().use(transformPlugin())

    type App = typeof _app

    type Store = App['store']

    type Result = EdenClientTransformerOptions<Store, true>

    expectTypeOf<Result>().toEqualTypeOf<EdenClientProhibitedTransformer>()
  })

  test('key is added with the safe plugin', () => {
    const _app = new Elysia()
      .use(
        batchPlugin({
          endpoint: '/batch',
        }),
      )
      .use(
        transformPlugin({
          key: true,
          transformer: SuperJSON,
        }),
      )

    type App = typeof _app

    type Store = App['store']

    type Result = EdenClientTransformerOptions<Store, true>

    expectTypeOf<Result['transformer']>().toEqualTypeOf<typeof SuperJSON>()
  })

  test('works with custom key and safe plugin', () => {
    const key = Symbol('safe')

    const _app = new Elysia()
      .use(
        batchPlugin({
          key,
          endpoint: '/batch',
        }),
      )
      .use(
        transformPlugin({
          key,
          transformer: SuperJSON,
        }),
      )

    type App = typeof _app

    type Store = App['store']

    type Result = EdenClientTransformerOptions<Store, typeof key>

    expectTypeOf<Result['transformer']>().toEqualTypeOf<typeof SuperJSON>()
  })
})
