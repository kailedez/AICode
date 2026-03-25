import { Router } from 'express'
import type { DatabaseService } from '../../database'
import { sendOk } from '../shared/response'
import { updateSettingsSchema } from './schema'
import { createMeService } from './service'

export function createMeRouter(store: DatabaseService) {
  const router = Router()
  const service = createMeService(store)

  router.get('/me', async (_req, res, next) => {
    try {
      sendOk(res, await service.getProfile(res.locals.currentUserUid as string))
    } catch (error) {
      next(error)
    }
  })

  router.get('/me/settings', async (_req, res, next) => {
    try {
      sendOk(res, await service.getSettings(res.locals.currentUserUid as string))
    } catch (error) {
      next(error)
    }
  })

  router.put('/me/settings', async (req, res, next) => {
    try {
      const payload = updateSettingsSchema.parse(req.body)
      sendOk(res, await service.updateSettings(res.locals.currentUserUid as string, payload, res.locals.requestId as string))
    } catch (error) {
      next(error)
    }
  })

  return router
}
