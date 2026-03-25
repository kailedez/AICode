import { Router } from 'express'
import type { DatabaseService } from '../../database'
import { sendOk } from '../shared/response'
import { loginSchema, logoutSchema, refreshSchema, registerSchema } from './schema'
import { createAuthService } from './service'

function getRequestMetadata(req: { ip?: string | null; headers: Record<string, unknown> }) {
  return {
    ip: req.ip ?? null,
    userAgent: typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : null,
  }
}

export function createAuthRouter(store: DatabaseService) {
  const router = Router()
  const service = createAuthService(store)

  router.post('/auth/register', async (req, res, next) => {
    try {
      const payload = registerSchema.parse(req.body)
      sendOk(res, await service.register(payload, getRequestMetadata(req)))
    } catch (error) {
      next(error)
    }
  })

  router.post('/auth/login', async (req, res, next) => {
    try {
      const payload = loginSchema.parse(req.body)
      sendOk(res, await service.login(payload, getRequestMetadata(req)))
    } catch (error) {
      next(error)
    }
  })

  router.post('/auth/refresh', async (req, res, next) => {
    try {
      const payload = refreshSchema.parse(req.body)
      sendOk(res, await service.refresh(payload.refreshToken))
    } catch (error) {
      next(error)
    }
  })

  router.post('/auth/logout', async (req, res, next) => {
    try {
      const payload = logoutSchema.parse(req.body)
      sendOk(res, await service.logout(payload.refreshToken))
    } catch (error) {
      next(error)
    }
  })

  return router
}
