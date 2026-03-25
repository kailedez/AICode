import type { NextFunction, Request, Response } from 'express'
import type { DataStore } from '../../dataStore'
import { HttpError } from '../shared/errors'
import { parseAccessToken } from './service'

export function createAuthMiddleware(store: DataStore) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const header = req.headers.authorization
      const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : null
      const userUid = parseAccessToken(token)
      if (!userUid) {
        throw new HttpError(401, 40101, '未登录或 token 无效')
      }

      const db = await store.read()
      const user = db.users.find((item) => item.uid === userUid && item.deletedAt === null && item.status === 1)
      if (!user) {
        throw new HttpError(401, 40101, '未登录或 token 无效')
      }

      res.locals.currentUserUid = user.uid
      next()
    } catch (error) {
      next(error)
    }
  }
}
