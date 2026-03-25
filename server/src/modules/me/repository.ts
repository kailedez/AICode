import type { DatabaseService } from '../../database'

export function createMeRepository(store: DatabaseService) {
  const prisma = store.prisma

  return {
    findActiveUserByUid(userUid: string) {
      return prisma.user.findFirst({
        where: {
          uid: userUid,
          deletedAt: null,
          status: 1,
        },
      })
    },

    findUserSettings(userId: number) {
      return prisma.userSetting.findUnique({
        where: { userId },
      })
    },

    updateUserSettings(userId: number, input: { theme?: 'light' | 'dark' | 'system'; defaultFolderUid?: string | null }) {
      return prisma.userSetting.update({
        where: { userId },
        data: {
          ...(input.theme !== undefined ? { theme: input.theme } : {}),
          ...(input.defaultFolderUid !== undefined ? { defaultFolderUid: input.defaultFolderUid } : {}),
          updatedAt: new Date(),
        },
      })
    },
  }
}
