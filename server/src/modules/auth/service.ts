import type { UserRecord } from '../../types'

const TOKEN_PREFIX = 'noteflow-token'

export function buildAccessToken(user: UserRecord) {
  return `${TOKEN_PREFIX}-${user.uid}`
}

export function buildRefreshToken(user: UserRecord) {
  return `refresh-${user.uid}`
}

export function parseAccessToken(token: string | undefined | null) {
  if (!token || !token.startsWith(`${TOKEN_PREFIX}-`)) return null
  return token.replace(`${TOKEN_PREFIX}-`, '')
}
