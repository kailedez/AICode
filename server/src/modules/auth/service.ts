import crypto from 'node:crypto'
import type { DatabaseService } from '../../database'
import { createUid, nowIso, plusHoursIso } from '../../utils'
import { HttpError } from '../shared/errors'
import { createLogsService } from '../logs/service'
import { createAuthRepository } from './repository'

const ACCESS_TOKEN_SECRET = process.env.NOTEFLOW_ACCESS_TOKEN_SECRET ?? 'noteflow-dev-access-secret'
const ACCESS_TOKEN_TTL_SECONDS = 60 * 60 * 2
const REFRESH_TOKEN_TTL_HOURS = 24 * 14

interface AccessTokenPayload {
  userUid: string
  sessionUid: string
  exp: number
}

function toBase64Url(value: string) {
  return Buffer.from(value, 'utf8').toString('base64url')
}

function fromBase64Url(value: string) {
  return Buffer.from(value, 'base64url').toString('utf8')
}

function hashValue(value: string) {
  return crypto.createHash('sha256').update(value).digest('hex')
}

async function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString('hex')
  const derivedKey = await new Promise<Buffer>((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (error, key) => {
      if (error) {
        reject(error)
        return
      }
      resolve(key)
    })
  })

  return `${salt}:${derivedKey.toString('hex')}`
}

async function verifyPassword(password: string, passwordHash: string | null) {
  if (!passwordHash) return false

  if (!passwordHash.includes(':')) {
    return passwordHash === password
  }

  const [salt, storedHash] = passwordHash.split(':')
  if (!salt || !storedHash) return false

  const derivedKey = await new Promise<Buffer>((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (error, key) => {
      if (error) {
        reject(error)
        return
      }
      resolve(key)
    })
  })

  const storedBuffer = Buffer.from(storedHash, 'hex')
  return storedBuffer.length === derivedKey.length && crypto.timingSafeEqual(storedBuffer, derivedKey)
}

function createAccessToken(payload: AccessTokenPayload) {
  const encodedPayload = toBase64Url(JSON.stringify(payload))
  const signature = crypto
    .createHmac('sha256', ACCESS_TOKEN_SECRET)
    .update(encodedPayload)
    .digest('base64url')
  return `${encodedPayload}.${signature}`
}

function parseAccessToken(token: string | null | undefined) {
  if (!token) return null
  const [encodedPayload, signature] = token.split('.')
  if (!encodedPayload || !signature) return null

  const expectedSignature = crypto
    .createHmac('sha256', ACCESS_TOKEN_SECRET)
    .update(encodedPayload)
    .digest('base64url')

  const signatureBuffer = Buffer.from(signature, 'utf8')
  const expectedBuffer = Buffer.from(expectedSignature, 'utf8')
  if (signatureBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return null
  }

  try {
    return JSON.parse(fromBase64Url(encodedPayload)) as AccessTokenPayload
  } catch {
    return null
  }
}

function createRefreshToken() {
  return crypto.randomBytes(32).toString('base64url')
}

function toAuthUser(user: { uid: string; nickname: string; avatarUrl: string | null }) {
  return {
    uid: user.uid,
    nickname: user.nickname,
    avatarUrl: user.avatarUrl,
  }
}

function toSessionResponse(
  user: { uid: string; nickname: string; avatarUrl: string | null },
  session: { sessionUid: string },
  refreshToken: string,
) {
  return {
    accessToken: createAccessToken({
      userUid: user.uid,
      sessionUid: session.sessionUid,
      exp: Math.floor(Date.now() / 1000) + ACCESS_TOKEN_TTL_SECONDS,
    }),
    refreshToken,
    expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    user: toAuthUser(user),
  }
}

export function createAuthService(store: DatabaseService) {
  const repository = createAuthRepository(store)
  const logsService = createLogsService(store)

  return {
    async register(
      input: { email: string; password: string; nickname: string },
      metadata: { ip: string | null; userAgent: string | null },
      requestId?: string | null,
    ) {
      const existingUser = await repository.findActiveUserByEmail(input.email)
      if (existingUser) {
        throw new HttpError(409, 40901, '邮箱已被注册')
      }

      const now = nowIso()
      const user = await repository.createUser({
        uid: createUid('usr'),
        email: input.email,
        passwordHash: await hashPassword(input.password),
        nickname: input.nickname,
        createdAt: now,
      })

      const refreshToken = createRefreshToken()
      const session = await repository.createSession({
        sessionUid: createUid('sess'),
        userId: user.id,
        refreshTokenHash: hashValue(refreshToken),
        clientType: 'web',
        deviceInfo: metadata.userAgent,
        ip: metadata.ip,
        expiredAt: plusHoursIso(REFRESH_TOKEN_TTL_HOURS),
      })

      await logsService.record({
        userId: user.id,
        targetType: 'user',
        targetUid: user.uid,
        action: 'register',
        requestId,
        detail: {
          email: user.email,
        },
      })

      return toSessionResponse(user, session, refreshToken)
    },

    async login(
      input: { email: string; password: string },
      metadata: { ip: string | null; userAgent: string | null },
      requestId?: string | null,
    ) {
      const user = await repository.findActiveUserByEmail(input.email)
      if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
        throw new HttpError(401, 40101, '邮箱或密码错误')
      }

      const now = nowIso()
      await repository.touchUserLogin(user.id, now)

      const refreshToken = createRefreshToken()
      const session = await repository.createSession({
        sessionUid: createUid('sess'),
        userId: user.id,
        refreshTokenHash: hashValue(refreshToken),
        clientType: 'web',
        deviceInfo: metadata.userAgent,
        ip: metadata.ip,
        expiredAt: plusHoursIso(REFRESH_TOKEN_TTL_HOURS),
      })

      await logsService.record({
        userId: user.id,
        targetType: 'session',
        targetUid: session.sessionUid,
        action: 'login',
        requestId,
        detail: {
          userUid: user.uid,
        },
      })

      return toSessionResponse(user, session, refreshToken)
    },

    async refresh(refreshToken: string, requestId?: string | null) {
      const session = await repository.findActiveSessionByRefreshTokenHash(hashValue(refreshToken))
      if (!session) {
        throw new HttpError(401, 40101, 'refresh token 无效或已过期')
      }

      const user = await repository.findActiveUserById(session.userId)
      if (!user) {
        throw new HttpError(401, 40101, 'refresh token 无效或已过期')
      }

      const nextRefreshToken = createRefreshToken()
      const updatedSession = await repository.rotateSessionRefreshToken(session.sessionUid, {
        refreshTokenHash: hashValue(nextRefreshToken),
        expiredAt: plusHoursIso(REFRESH_TOKEN_TTL_HOURS),
      })

      await logsService.record({
        userId: user.id,
        targetType: 'session',
        targetUid: updatedSession.sessionUid,
        action: 'refresh',
        requestId,
        detail: {
          userUid: user.uid,
        },
      })

      return toSessionResponse(user, updatedSession, nextRefreshToken)
    },

    async logout(refreshToken: string, requestId?: string | null) {
      const session = await repository.findActiveSessionByRefreshTokenHash(hashValue(refreshToken))
      if (!session) {
        return { success: true as const }
      }

      await repository.revokeSession(session.sessionUid, nowIso())
      await logsService.record({
        userId: session.userId,
        targetType: 'session',
        targetUid: session.sessionUid,
        action: 'logout',
        requestId,
      })
      return { success: true as const }
    },

    async authenticateAccessToken(token: string | null | undefined) {
      const parsed = parseAccessToken(token)
      if (!parsed || parsed.exp <= Math.floor(Date.now() / 1000)) {
        throw new HttpError(401, 40101, '未登录或 token 无效')
      }

      const session = await repository.findActiveSessionByUid(parsed.sessionUid)
      if (!session || session.userId <= 0) {
        throw new HttpError(401, 40101, '未登录或 token 无效')
      }

      const user = await repository.findActiveUserByUid(parsed.userUid)
      if (!user || user.id !== session.userId) {
        throw new HttpError(401, 40101, '未登录或 token 无效')
      }

      return user
    },
  }
}
