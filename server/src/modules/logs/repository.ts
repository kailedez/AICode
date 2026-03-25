import type { DatabaseService } from '../../database'

export function createLogsRepository(store: DatabaseService) {
  const prisma = store.prisma

  return {
    createOperationLog(input: {
      userId: number
      targetType: string
      targetUid: string
      action: string
      requestId: string | null
      detail: string | null
    }) {
      return prisma.operationLog.create({
        data: {
          userId: input.userId,
          targetType: input.targetType,
          targetUid: input.targetUid,
          action: input.action,
          requestId: input.requestId,
          detail: input.detail,
          createdAt: new Date(),
        },
      })
    },

    listOperationLogs(userId: number) {
      return prisma.operationLog.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      })
    },
  }
}
