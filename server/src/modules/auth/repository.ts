import type { DatabaseService } from '../../database'
import { nowIso } from '../../utils'

export function createAuthRepository(store: DatabaseService) {
  const prisma = store.prisma

  return {
    findActiveUserByEmail(email: string) {
      return prisma.user.findFirst({
        where: {
          email,
          deletedAt: null,
          status: 1,
        },
      })
    },

    findActiveUserByUid(uid: string) {
      return prisma.user.findFirst({
        where: {
          uid,
          deletedAt: null,
          status: 1,
        },
      })
    },

    findActiveUserById(userId: number) {
      return prisma.user.findFirst({
        where: {
          id: userId,
          deletedAt: null,
          status: 1,
        },
      })
    },

    async createUser(input: {
      uid: string
      email: string
      passwordHash: string
      nickname: string
      createdAt: string
    }) {
      return prisma.user.create({
        data: {
          uid: input.uid,
          email: input.email,
          mobile: null,
          passwordHash: input.passwordHash,
          nickname: input.nickname,
          avatarUrl: null,
          status: 1,
          lastLoginAt: new Date(input.createdAt),
          createdAt: new Date(input.createdAt),
          updatedAt: new Date(input.createdAt),
          settings: {
            create: {
              theme: 'system',
              defaultFolderUid: null,
              editorPreferences: null,
              createdAt: new Date(input.createdAt),
              updatedAt: new Date(input.createdAt),
            },
          },
        },
      })
    },

    async touchUserLogin(userId: number, loginAt: string) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          lastLoginAt: new Date(loginAt),
          updatedAt: new Date(loginAt),
        },
      })
    },

    createSession(input: {
      sessionUid: string
      userId: number
      refreshTokenHash: string
      clientType: string
      deviceInfo: string | null
      ip: string | null
      expiredAt: string
    }) {
      const timestamp = nowIso()
      return prisma.userSession.create({
        data: {
          sessionUid: input.sessionUid,
          userId: input.userId,
          refreshTokenHash: input.refreshTokenHash,
          clientType: input.clientType,
          deviceInfo: input.deviceInfo,
          ip: input.ip,
          expiredAt: new Date(input.expiredAt),
          revokedAt: null,
          createdAt: new Date(timestamp),
          updatedAt: new Date(timestamp),
        },
      })
    },

    findActiveSessionByUid(sessionUid: string) {
      return prisma.userSession.findFirst({
        where: {
          sessionUid,
          revokedAt: null,
          expiredAt: { gt: new Date() },
        },
      })
    },

    findActiveSessionByRefreshTokenHash(refreshTokenHash: string) {
      return prisma.userSession.findFirst({
        where: {
          refreshTokenHash,
          revokedAt: null,
          expiredAt: { gt: new Date() },
        },
      })
    },

    rotateSessionRefreshToken(sessionUid: string, input: { refreshTokenHash: string; expiredAt: string }) {
      return prisma.userSession.update({
        where: { sessionUid },
        data: {
          refreshTokenHash: input.refreshTokenHash,
          expiredAt: new Date(input.expiredAt),
          updatedAt: new Date(),
        },
      })
    },

    async revokeSession(sessionUid: string, revokedAt: string) {
      await prisma.userSession.updateMany({
        where: { sessionUid },
        data: {
          revokedAt: new Date(revokedAt),
          updatedAt: new Date(revokedAt),
        },
      })
    },
  }
}
