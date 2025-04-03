import { describe, expectTypeOf, test } from 'vitest'

import type { RouteErrorResponses, RouteSuccessResponses } from '../../src/core/infer'

describe('EdenRouteSuccessResponses', () => {
  test('returns only 200 status codes', () => {
    type Route = {
      response: {
        100: 'Information'
        200: 'Hello'
        201: 'Bye'
        300: 'Redirect'
        400: 'Client error'
        500: 'Server error'
      }
    }

    type Result = RouteSuccessResponses<Route>

    expectTypeOf<Result>().toMatchObjectType<Pick<Route['response'], 200 | 201>>()
    expectTypeOf<Result>().not.toMatchObjectType<Pick<Route['response'], 100 | 300 | 400 | 500>>()
  })
})

describe('EdenRouteErrorResponse', () => {
  test('excludes 100, 200, and 300 status codes', () => {
    type Route = {
      response: {
        100: 'Information'
        200: 'Hello'
        201: 'Bye'
        300: 'Redirect'
        400: 'Client error'
        500: 'Server error'
      }
    }

    type Result = RouteErrorResponses<Route>

    expectTypeOf<Result>().toMatchObjectType<Pick<Route['response'], 400 | 500>>()
    expectTypeOf<Result>().not.toMatchObjectType<Pick<Route['response'], 100 | 200 | 201 | 300>>()
  })
})
