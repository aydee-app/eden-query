import { render,screen } from '@testing-library/react'
import { expect,test } from 'vitest'

import { Hello } from './components/hello'

test('Can use Testing Library', () => {
  render(<Hello />)
  expect(screen.getByText('Hello')).toBeInTheDocument()
})
