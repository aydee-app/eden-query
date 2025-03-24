import { render } from '@testing-library/react'
import { describe, it } from 'bun:test'

import Button from './components/hello'

describe('Button Component', () => {
  it('renders a button with the correct default type and class name', () => {
    render(<Button />)
  })
})
