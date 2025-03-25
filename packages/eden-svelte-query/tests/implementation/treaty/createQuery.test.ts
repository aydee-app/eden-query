import { render, screen } from '@testing-library/svelte'
import { describe, test } from 'vitest'

import Button from '../../components/button.svelte'

describe('createQuery', () => {
  test('it works', () => {
    render(Button)

    screen.debug()
  })
})
