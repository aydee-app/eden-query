import { render } from '@testing-library/react'
import { describe, test } from 'vitest'

import { Hello } from './components/hello'

describe('eden-react-query', () => {
  test('it works', async () => {
    render(<Hello />)
  })
})
