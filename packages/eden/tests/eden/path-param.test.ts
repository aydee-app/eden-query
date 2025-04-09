import { describe, expect,test } from 'vitest'

import { type ParamSeparator,replacePathParams } from '../../src/eden/path-param'

describe('replacePathparams', () => {
  const params = { a: 'param1', b: 'param2', c: 'param3' }

  const expected = '/posts/param1/users/param2/items/param3'

  const separators: Array<[ParamSeparator, string]> = [
    ['$param', '/posts/$a/users/$b/items/$c'],
    [':param', '/posts/:a/users/:b/items/:c'],
    ['{param}', '/posts/{a}/users/{b}/items/{c}'],
    ['$$_param_$$', '/posts/$$_a_$$/users/$$_b_$$/items/$$_c_$$'],
    ['{{param}}', '/posts/{{a}}/users/{{b}}/items/{{c}}'],
  ]

  test.each(separators)('works with param separator format - %s', (separator, path) => {
    const result = replacePathParams(path, params, separator)
    expect(result).toBe(expected)
  })
})
