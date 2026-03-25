import type { DatabaseService } from '../../database'
import { createLogsRepository } from './repository'

export function createLogsService(store: DatabaseService) {
  const repository = createLogsRepository(store)

  return {
    async record(input: {
      userId: number
      targetType: string
      targetUid: string
      action: string
      requestId?: string | null
      detail?: Record<string, unknown> | null
    }) {
      await repository.createOperationLog({
        userId: input.userId,
        targetType: input.targetType,
        targetUid: input.targetUid,
        action: input.action,
        requestId: input.requestId ?? null,
        detail: input.detail ? JSON.stringify(input.detail) : null,
      })
    },

    listByUser(userId: number) {
      return repository.listOperationLogs(userId)
    },
  }
}
