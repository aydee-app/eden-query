/**
 * Custom implementation of equivalent utility react-testing-library.
 *
 * Should work if the callback function returns an observable, which should be the case
 * since most of these tests revolve around svelte-query.
 */
// function renderHook() {
// }

import type {
  Queries,
  queries,
  RenderOptions,
  SvelteComponentOptions,
} from '@testing-library/svelte'
import { render as __render } from '@testing-library/svelte'
import type { SvelteComponent } from 'svelte'

import Wrapper from './wrapper.svelte'

/**
 * Allows you to render a hook within a test React component without having to
 * create that component yourself.
 */
export function renderHook<
  Result,
  Props,
  C extends SvelteComponent,
  Q extends Queries = typeof queries,
>(
  render: (initialProps: Props) => Result,
  options: SvelteComponentOptions<C> = {},
  renderOptions: RenderOptions<Q> = {},
): RenderHookResult<Result, Props> {
  const renderResult = __render(
    Wrapper,
    {
      ...options,
      props: {
        ...options.props,
        renderCallback: render,
      },
    },

    renderOptions,
  )

  const result = renderResult.component['result']

  const renderHookResult: RenderHookResult<any, any> = { ...renderResult, result }

  return renderHookResult
}

export interface RenderHookResult<Result, Props> {
  /**
   * Triggers a re-render. The props will be passed to your renderHook callback.
   */
  rerender: (props?: Props) => void

  /**
   * This is a stable reference to the latest value returned by your renderHook
   * callback
   */
  result: Result

  /**
   * Unmounts the test component. This is useful for when you need to test
   * any cleanup your useEffects have.
   */
  unmount: () => void
}
