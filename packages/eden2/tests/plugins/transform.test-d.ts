/* eslint-disable @typescript-eslint/no-unused-vars */

import { attest } from '@ark/attest'
import { uneval } from 'devalue'
import Elysia from 'elysia'
import SuperJSON from 'superjson'
import { describe, expectTypeOf, test } from 'vitest'

import { EdenClient } from '../../src/client'
import { httpBatchLink } from '../../src/links/http-batch-link'
import { httpLink } from '../../src/links/http-link'
import { batchPlugin } from '../../src/plugins/batch'
import { transformPlugin } from '../../src/plugins/transform'
import type { DataTransformerOptions } from '../../src/trpc/server/transformer'

describe('transformPlugin', () => {
  describe('types', () => {
    const devalue = {
      serialize: (object) => uneval(object),
      deserialize: (object) => eval(`(${object})`),
    } satisfies DataTransformerOptions

    describe('httpBatchLink', () => {
      test('batching is prohibited if not found on the server application', () => {
        const app = new Elysia()

        attest(() => {
          new EdenClient<typeof app>({
            links: [
              // @ts-expect-error Type-safety enabled and no batching plugin found.
              httpBatchLink({ key: true }),
            ],
          })
        }).type.errors("Type 'BatchingNotDetectedError' is not assignable to type 'EdenLink")
      })

      test('batching can be omitted if found on the server application', () => {
        const app = new Elysia().use(batchPlugin({ key: true }))

        new EdenClient<typeof app>({
          links: [
            httpLink({
              key: true,
            }),
          ],
        })
      })

      test('batching is allowed if found on the server application', () => {
        const app = new Elysia().use(batchPlugin({ key: true }))

        new EdenClient<typeof app>({
          links: [
            httpBatchLink({
              key: true,
            }),
          ],
        })
      })

      test('transformer is prohibited if not found on the server application', () => {
        const app = new Elysia().use(batchPlugin({ key: true }))

        const errors = [
          // "Type 'typeof SuperJSON' is not assignable to type 'TypeError<\"You must define a transformer on your your `initTRPC`-object first\">'.",
          "Type 'typeof SuperJSON' is not assignable to type '\"You must define a transformer on your your `initTRPC`-object first\"'.",
        ]

        attest(() => {
          new EdenClient<typeof app>({
            links: [
              httpBatchLink({
                key: true as const,
                // @ts-expect-error Prohibit transformer if it has not been added to server application.
                transformer: SuperJSON,
              }),
            ],
          })
        }).type.errors(errors.join(''))
      })

      test('transformer is required if found on the server application', () => {
        const app = new Elysia()
          .use(transformPlugin({ key: true, transformer: SuperJSON }))
          .use(batchPlugin({ key: true }))

        attest(() => {
          new EdenClient<typeof app>({
            links: [
              // @ts-expect-error transformer is missing.
              httpBatchLink({ key: true }),
            ],
          })
        }).type.errors("Property 'transformer' is missing")
      })

      test('wrong transformer is not allowed if different from transformer on the server application', () => {
        const app = new Elysia().use(transformPlugin({ key: true, transformer: SuperJSON }))

        attest(() => {
          new EdenClient<typeof app>({
            links: [
              httpBatchLink({
                key: true,
                // @ts-expect-error Transformer should be SuperJSON.
                transformer: true,
              }),
            ],
          })
        }).type.errors("Type 'boolean' is not assignable to type 'typeof SuperJSON'.")
      })

      describe('weird - only either transformer or batch plugin error can occur at the same time', () => {
        test('transformer', () => {
          const app = new Elysia().use(transformPlugin({ key: true, transformer: SuperJSON }))

          attest(() => {
            new EdenClient<typeof app>({
              links: [
                // This app does not have the batch plugin, so httpBatchLink should not even
                // have a valid return, but it looksl like the error is swallowed.
                httpBatchLink({
                  key: true,
                  // @ts-expect-error Transformer should be SuperJSON.
                  transformer: true,
                }),
              ],
            })
          }).type.errors("Type 'boolean' is not assignable to type 'typeof SuperJSON'.")
        })

        test('batch', () => {
          const app = new Elysia().use(transformPlugin({ key: true, transformer: SuperJSON }))

          attest(() => {
            new EdenClient<typeof app>({
              links: [
                // @ts-expect-error Batch plugin not present.
                httpBatchLink({
                  key: true,
                  // If the transformer is asserted as any, then the input no longer has an error
                  // and the batch error will appear.
                  transformer: true as any,
                }),
              ],
            })
          }).type.errors("Type 'BatchingNotDetectedError' is not assignable to type 'EdenLink")
        })
      })

      describe('transformers array', () => {
        test('SuperJSON transformer is allowed if in transformers on the server application', () => {
          const app = new Elysia()
            .use(
              transformPlugin({
                key: true,
                transformers: [SuperJSON, devalue],
              }),
            )
            .use(batchPlugin({ key: true }))

          new EdenClient<typeof app>({
            links: [
              httpBatchLink({
                key: true,
                transformer: SuperJSON,
              }),
            ],
          })
        })

        test('devalue transformer is allowed if in transformers on the server application', () => {
          const app = new Elysia()
            .use(
              transformPlugin({
                key: true,
                transformers: [SuperJSON, devalue],
              }),
            )
            .use(batchPlugin({ key: true }))

          new EdenClient<typeof app>({
            links: [
              httpBatchLink({
                key: true,
                transformer: devalue,
              }),
            ],
          })
        })

        test('unknown transformer is prohibited if not in transformers on the server application', () => {
          const app = new Elysia()
            .use(
              transformPlugin({
                key: true,
                transformers: [SuperJSON, devalue],
              }),
            )
            .use(batchPlugin({ key: true }))

          const error =
            "Type 'boolean' is not assignable to type 'typeof SuperJSON | { serialize: (object: any) => string; deserialize: (object: any) => any; }'."

          attest(() => {
            new EdenClient<typeof app>({
              links: [
                httpBatchLink({
                  key: true,
                  // @ts-expect-error Transformer should be SuperJSON or devalue.
                  transformer: true,
                }),
              ],
            })
          }).type.errors(error)
        })
      })

      describe('transformers object', () => {
        test('SuperJSON transformer is allowed if in transformers on the server application', () => {
          const app = new Elysia()
            .use(
              transformPlugin({
                key: true,
                transformers: { SuperJSON, devalue },
              }),
            )
            .use(batchPlugin({ key: true }))

          new EdenClient<typeof app>({
            links: [
              httpBatchLink({
                key: true,
                transformer: SuperJSON,
              }),
            ],
          })
        })

        test('devalue transformer is allowed if in transformers on the server application', () => {
          const app = new Elysia()
            .use(
              transformPlugin({
                key: true,
                transformers: { SuperJSON, devalue },
              }),
            )
            .use(batchPlugin({ key: true }))

          new EdenClient<typeof app>({
            links: [
              httpBatchLink({
                key: true,
                transformer: devalue,
              }),
            ],
          })
        })

        test('unknown transformer is prohibited if not in transformers on the server application', () => {
          const app = new Elysia()
            .use(
              transformPlugin({
                key: true,
                transformers: { SuperJSON, devalue },
              }),
            )
            .use(batchPlugin({ key: true }))

          const error =
            "Type 'boolean' is not assignable to type 'typeof SuperJSON | { serialize: (object: any) => string; deserialize: (object: any) => any; }'."

          attest(() => {
            new EdenClient<typeof app>({
              links: [
                httpBatchLink({
                  key: true,
                  // @ts-expect-error Transformer should be SuperJSON or devalue.
                  transformer: true,
                }),
              ],
            })
          }).type.errors(error)
        })
      })
    })

    describe('httpLink', () => {
      test('transformer is prohibited if not found on the server application', () => {
        const app = new Elysia()

        const errors = [
          // "Type 'typeof SuperJSON' is not assignable to type 'TypeError<\"You must define a transformer on your your `initTRPC`-object first\">'.",
          "Type 'typeof SuperJSON' is not assignable to type '\"You must define a transformer on your your `initTRPC`-object first\"'.",
        ]

        attest(() => {
          new EdenClient<typeof app>({
            links: [
              httpLink({
                key: true,
                // @ts-expect-error Prohibit transformer if it has not been added to server application.
                transformer: SuperJSON,
              }),
            ],
          })
        }).type.errors(errors.join(''))
      })

      test('transformer is required if found on the server application', () => {
        const app = new Elysia().use(transformPlugin({ key: true, transformer: SuperJSON }))

        attest(() => {
          new EdenClient<typeof app>({
            links: [
              // @ts-expect-error Transformer is required if one was added to server application.
              httpLink({
                key: true,
              }),
            ],
          })
        }).type.errors("Property 'transformer' is missing")
      })

      test('wrong transformer is not allowed if different from transformer on the server application', () => {
        const app = new Elysia().use(transformPlugin({ key: true, transformer: SuperJSON }))

        attest(() => {
          new EdenClient<typeof app>({
            links: [
              httpLink({
                key: true,
                // @ts-expect-error Transformer should be SuperJSON.
                transformer: true,
              }),
            ],
          })
        }).type.errors("Type 'boolean' is not assignable to type 'typeof SuperJSON'.")
      })

      describe('transformers array', () => {
        test('SuperJSON transformer is allowed if in transformers on the server application', () => {
          const app = new Elysia().use(
            transformPlugin({
              key: true,
              transformers: [SuperJSON, devalue],
            }),
          )

          new EdenClient<typeof app>({
            links: [
              httpLink({
                key: true,
                transformer: SuperJSON,
              }),
            ],
          })
        })

        test('devalue transformer is allowed if in transformers on the server application', () => {
          const app = new Elysia().use(
            transformPlugin({
              key: true,
              transformers: [SuperJSON, devalue],
            }),
          )

          new EdenClient<typeof app>({
            links: [
              httpLink({
                key: true,
                transformer: devalue,
              }),
            ],
          })
        })

        test('unknown transformer is prohibited if not in transformers on the server application', () => {
          const app = new Elysia().use(
            transformPlugin({
              key: true,
              transformers: [SuperJSON, devalue],
            }),
          )

          const error =
            "Type 'boolean' is not assignable to type 'typeof SuperJSON | { serialize: (object: any) => string; deserialize: (object: any) => any; }'."

          attest(() => {
            new EdenClient<typeof app>({
              links: [
                httpLink({
                  key: true,
                  // @ts-expect-error Transformer should be SuperJSON or devalue.
                  transformer: true,
                }),
              ],
            })
          }).type.errors(error)
        })
      })

      describe('transformers object', () => {
        test('SuperJSON transformer is allowed if in transformers on the server application', () => {
          const app = new Elysia().use(
            transformPlugin({
              key: true,
              transformers: { SuperJSON, devalue },
            }),
          )

          new EdenClient<typeof app>({
            links: [
              httpLink({
                key: true,
                transformer: SuperJSON,
              }),
            ],
          })
        })

        test('devalue transformer is allowed if in transformers on the server application', () => {
          const app = new Elysia().use(
            transformPlugin({
              key: true,
              transformers: { SuperJSON, devalue },
            }),
          )

          new EdenClient<typeof app>({
            links: [
              httpLink({
                key: true,
                transformer: devalue,
              }),
            ],
          })
        })

        test('unknown transformer is prohibited if not in transformers on the server application', () => {
          const app = new Elysia().use(
            transformPlugin({
              key: true,
              transformers: { SuperJSON, devalue },
            }),
          )

          const error =
            "Type 'boolean' is not assignable to type 'typeof SuperJSON | { serialize: (object: any) => string; deserialize: (object: any) => any; }'."

          attest(() => {
            new EdenClient<typeof app>({
              links: [
                httpLink({
                  key: true,
                  // @ts-expect-error Transformer should be SuperJSON or devalue.
                  transformer: true,
                }),
              ],
            })
          }).type.errors(error)
        })
      })
    })
  })

  describe('httpLink', () => {
    test('does not require transformer if type-safety is off', () => {
      const app = new Elysia().use(transformPlugin({ transformer: SuperJSON }))

      const eden = new EdenClient<typeof app>({
        links: [httpLink()],
      })

      expectTypeOf<typeof eden>().toEqualTypeOf<EdenClient<typeof app>>()
    })

    test('does not require transformer if type-safety is off on the client', () => {
      const app = new Elysia().use(transformPlugin({ key: true, transformer: SuperJSON }))

      const eden = new EdenClient<typeof app>({
        links: [httpLink()],
      })

      expectTypeOf<typeof eden>().toEqualTypeOf<EdenClient<typeof app>>()
    })
  })
})
