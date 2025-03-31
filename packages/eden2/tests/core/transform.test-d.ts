import Elysia from 'elysia'
import { describe, expectTypeOf, test } from 'vitest'

import type {
  EdenClientAllowedTransformer,
  EdenClientProhibitedTransformer,
  EdenClientRequiredTransformer,
  EdenClientTransformerOptions,
} from '../../src/core/transform'
import { batchPlugin, safeBatchPlugin } from '../../src/plugins/batch'

describe('transform', () => {
  test('transformer is not required when key does not exist in store', () => {
    type Store = {}

    type Key = 'non-existent-key'

    type Result = EdenClientTransformerOptions<Store, Key>

    expectTypeOf<Result>().toEqualTypeOf<EdenClientAllowedTransformer>()
  })

  test('transformer is prohibited when key exists in store but transformer is not found', () => {
    type Store = {
      [K in Key]: 'Hello'
    }

    type Key = 'my-key'

    type Result = EdenClientTransformerOptions<Store, Key>

    expectTypeOf<Result>().toEqualTypeOf<EdenClientProhibitedTransformer>()
  })

  test('transformer is required when key exists in store and transformer is found', () => {
    type Store = {
      [K in Key]: {
        transformer: true
      }
    }

    type Key = 'my-key'

    type Result = EdenClientTransformerOptions<Store, Key>

    expectTypeOf<Result>().toEqualTypeOf<EdenClientRequiredTransformer>()
  })

  test('transformer is required when key exists in store and transformers is found', () => {
    type Store = {
      [K in Key]: {
        transformers: true
      }
    }

    type Key = 'my-key'

    type Result = EdenClientTransformerOptions<Store, Key>

    expectTypeOf<Result>().toEqualTypeOf<EdenClientRequiredTransformer>()
  })

  test('transformer is required when key exists in store and transformers is found', () => {
    type Store = {
      [K in Key]: {
        transformers: true
      }
    }

    type Key = 'my-key'

    type Result = EdenClientTransformerOptions<Store, Key>

    expectTypeOf<Result>().toEqualTypeOf<EdenClientRequiredTransformer>()
  })

  test('uses default key to check configuration', () => {
    // safe batch plugin automatically writes to the default EDEN_STATE_KEY, i.e. "eden".
    const _app = new Elysia().use(safeBatchPlugin())

    type App = typeof _app

    // Use the `true` flag to look up the config at default key, which is "eden".
    type Result = EdenClientTransformerOptions<App['store'], true>

    expectTypeOf<Result>().toEqualTypeOf<EdenClientProhibitedTransformer>()
  })

  test('uses default key to check configuration', () => {
    // regular batch plugin does not write to the default EDEN_STATE_KEY, i.e. "eden".
    const _app = new Elysia().use(batchPlugin())

    type App = typeof _app

    type Result = EdenClientTransformerOptions<App['store']>

    expectTypeOf<Result>().toEqualTypeOf<EdenClientAllowedTransformer>()
  })
})
