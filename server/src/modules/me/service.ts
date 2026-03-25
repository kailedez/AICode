import type { DatabaseService } from '../../database'
import { HttpError } from '../shared/errors'
import { createMeRepository } from './repository'

function toProfile(user: { uid: string; nickname: string; avatarUrl: string | null }) {
  return {
    uid: user.uid,
    nickname: user.nickname,
    avatarUrl: user.avatarUrl,
  }
}

function toSettings(settings: { theme: string; defaultFolderUid: string | null }) {
  return {
    theme: settings.theme as 'light' | 'dark' | 'system',
    defaultFolderUid: settings.defaultFolderUid,
  }
}

export function createMeService(store: DatabaseService) {
  const repository = createMeRepository(store)

  return {
    async getProfile(userUid: string) {
      const user = await repository.findActiveUserByUid(userUid)
      if (!user) {
        throw new HttpError(404, 40401, '鐢ㄦ埛涓嶅瓨鍦�')
      }
      return toProfile(user)
    },

    async getSettings(userUid: string) {
      const user = await repository.findActiveUserByUid(userUid)
      if (!user) {
        throw new HttpError(404, 40401, '鐢ㄦ埛涓嶅瓨鍦�')
      }

      const settings = await repository.findUserSettings(user.id)
      if (!settings) {
        throw new HttpError(404, 40401, '鐢ㄦ埛璁剧疆涓嶅瓨鍦�')
      }

      return toSettings(settings)
    },

    async updateSettings(userUid: string, input: { theme?: 'light' | 'dark' | 'system'; defaultFolderUid?: string | null }) {
      const user = await repository.findActiveUserByUid(userUid)
      if (!user) {
        throw new HttpError(404, 40401, '鐢ㄦ埛涓嶅瓨鍦�')
      }

      return toSettings(await repository.updateUserSettings(user.id, input))
    },
  }
}
