import { Router } from 'express'
import { z } from 'zod'
import type { DataStore } from '../../dataStore'
import type { UserRecord, UserSettingRecord } from '../../types'
import { createUid, nextNumericId, nowIso } from '../../utils'
import { sendOk } from '../shared/response'
import { HttpError } from '../shared/errors'
import { buildAccessToken, buildRefreshToken } from './service'

export function createAuthRouter(store: DataStore) {
  const router = Router()

  router.post('/auth/register', async (req, res, next) => {
    try {
      const payload = z.object({
        email: z.string().email(),
        password: z.string().min(6),
        nickname: z.string().trim().min(1).max(64),
      }).parse(req.body)

      const db = await store.read()
      const exists = db.users.some((item) => item.email === payload.email && item.deletedAt === null)
      if (exists) {
        throw new HttpError(409, 40901, '该邮箱已注册')
      }

      const now = nowIso()
      const user: UserRecord = {
        id: nextNumericId(db.users),
        uid: createUid('usr'),
        email: payload.email,
        mobile: null,
        passwordHash: payload.password,
        nickname: payload.nickname,
        avatarUrl: null,
        status: 1,
        lastLoginAt: now,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      }
      const setting: UserSettingRecord = {
        id: nextNumericId(db.userSettings),
        userId: user.id,
        theme: 'system',
        defaultFolderUid: null,
        editorPreferences: null,
        createdAt: now,
        updatedAt: now,
      }

      db.users.push(user)
      db.userSettings.push(setting)
      await store.write(db)

      sendOk(res, {
        accessToken: buildAccessToken(user),
        refreshToken: buildRefreshToken(user),
        expiresIn: 7200,
        user: {
          uid: user.uid,
          nickname: user.nickname,
          avatarUrl: user.avatarUrl,
        },
      })
    } catch (error) {
      next(error)
    }
  })

  router.post('/auth/login', async (req, res, next) => {
    try {
      const payload = z.object({
        email: z.string().email(),
        password: z.string().min(6),
      }).parse(req.body)

      const db = await store.read()
      const user = db.users.find((item) => item.email === payload.email && item.deletedAt === null && item.status === 1)
      if (!user || user.passwordHash !== payload.password) {
        throw new HttpError(401, 40101, '邮箱或密码错误')
      }

      user.lastLoginAt = new Date().toISOString()
      user.updatedAt = user.lastLoginAt
      await store.write(db)

      sendOk(res, {
        accessToken: buildAccessToken(user),
        refreshToken: buildRefreshToken(user),
        expiresIn: 7200,
        user: {
          uid: user.uid,
          nickname: user.nickname,
          avatarUrl: user.avatarUrl,
        },
      })
    } catch (error) {
      next(error)
    }
  })

  return router
}
