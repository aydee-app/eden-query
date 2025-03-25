import { render, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import { App, wrapper } from '../../app-provider'
import { eden } from '../../eden'

function DoSomething() {
  const query = eden.posts.get.useQuery()

  return (
    <div>
      <p>Data:</p>
      <div>{JSON.stringify(query.data)}</div>
    </div>
  )
}

describe('createQuery', () => {
  test('it works', async () => {
    const result = render(
      <App>
        <DoSomething />
      </App>,
    )

    await waitFor(() => expect(result.getByText(JSON.stringify(['A', 'B', 'C']))).toBeTruthy())
  })

  test('hook works', async () => {
    renderHook(() => eden.posts.get.useQuery(), { wrapper })
  })
})
