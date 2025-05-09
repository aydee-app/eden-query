import type { Action } from 'svelte/action'
import type { Writable } from 'svelte/store'

export type UseIntersectingProps = {}

export const intersecting: Action<HTMLElement, Writable<boolean>> = (node, intersecting) => {
  const observer = new IntersectionObserver((entries) => {
    const currentIsIntersecting = entries[0]?.isIntersecting ?? false

    intersecting.set(currentIsIntersecting)
  })

  observer.observe(node)

  return {
    destroy: () => {
      observer.unobserve(node)
    },
  }
}

export const intersectingOnce: Action<HTMLElement, Writable<boolean>> = (node, intersecting) => {
  const observer = new IntersectionObserver((entries) => {
    const currentIsIntersecting = entries[0]?.isIntersecting ?? false

    if (currentIsIntersecting) {
      observer.unobserve(node)
    }

    intersecting.set(currentIsIntersecting)
  })

  observer.observe(node)

  return {
    destroy: () => {
      observer.unobserve(node)
    },
  }
}

export type IntersectingProps = IntersectionObserverInit & {
  value: Writable<boolean>
}

export const intersectingOnceCustom: Action<HTMLElement, IntersectingProps> = (node, props) => {
  const observer = new IntersectionObserver((entries) => {
    const currentIsIntersecting = entries[0]?.isIntersecting ?? false

    if (currentIsIntersecting) {
      observer.unobserve(node)
    }

    props.value.set(currentIsIntersecting)
  }, props)

  observer.observe(node)

  return {
    destroy: () => {
      observer.unobserve(node)
    },
  }
}
