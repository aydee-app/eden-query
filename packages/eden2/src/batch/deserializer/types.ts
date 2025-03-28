import type { EdenRequestParams } from '../../core/request'

export interface DeserializedEdenRequestBatchParams extends Omit<EdenRequestParams, 'headers'> {
  headers?: Record<string, any>
}
