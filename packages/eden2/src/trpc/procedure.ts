/* c8 ignore start */

export const procedures = ['query', 'mutation', 'subscription'] as const

/**
 * @public
 */
export type Procedure = (typeof procedures)[number]

/* c8 ignore end */
