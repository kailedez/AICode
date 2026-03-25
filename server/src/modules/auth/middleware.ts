import type { NextFunction, Request, Response } from 'express'
import type { DatabaseService } from '../../database'
import { createAuthService } from './service'

export function createAuthMiddleware(store: DatabaseService) {
  const service = createAuthService(store)

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const header = req.headers.authorization
      const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : null
      const user = await service.authenticateAccessToken(token)
      res.locals.currentUserUid = user.uid
      res.locals.currentUserId = user.id
      next()
    } catch (error) {
      next(error)
    }
  }
}
