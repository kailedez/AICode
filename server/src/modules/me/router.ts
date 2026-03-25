import { Router } from 'express'
import { z } from 'zod'
import type { DataStore } from '../../dataStore'
import { sendOk } from '../shared/response'
import { requireUserByUid, requireUserSettings } from '../shared/helpers'

export function createMeRouter(store: DataStore) {
  const router = Router()

  router.get('/me', async (_req, res, next) => {
    try {
      const db = await store.read()
      const user = requireUserByUid(db.users, res.locals.currentUserUid as string)
      sendOk(res, {
        uid: user.uid,
        nickname: user.nickname,
        avatarUrl: user.avatarUrl,
      })
    } catch (error) {
      next(error)
    }
  })

  router.get('/me/settings', async (_req, res, next) => {
    try {
      const db = await store.read()
      const user = requireUserByUid(db.users, res.locals.currentUserUid as string)
      const settings = requireUserSettings(db.userSettings, user.id)
      sendOk(res, {
        theme: settings.theme,
        defaultFolderUid: settings.defaultFolderUid,
      })
    } catch (error) {
      next(error)
    }
  })

  router.put('/me/settings', async (req, res, next) => {
    try {
      const schema = z.object({
        theme: z.enum(['light', 'dark', 'system']).optional(),
        defaultFolderUid: z.string().nullable().optional(),
      })
      const payload = schema.parse(req.body)
      const db = await store.read()
      const user = requireUserByUid(db.users, res.locals.currentUserUid as string)
      const settings = requireUserSettings(db.userSettings, user.id)

      if (payload.theme !== undefined) settings.theme = payload.theme
      if (payload.defaultFolderUid !== undefined) settings.defaultFolderUid = payload.defaultFolderUid
      settings.updatedAt = new Date().toISOString()

      await store.write(db)
      sendOk(res, {
        theme: settings.theme,
        defaultFolderUid: settings.defaultFolderUid,
      })
    } catch (error) {
      next(error)
    }
  })

  return router
}
