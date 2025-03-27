export const procedures = ['query', 'mutation', 'subscription'] as const

/**
 * @public
 */
export type Procedure = (typeof procedures)[number]
