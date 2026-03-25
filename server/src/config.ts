import path from 'node:path'

export interface DatabaseConfig {
  provider: 'sqlite'
  url: string
  filePath: string
}

export interface AppConfig {
  port: number
  database: DatabaseConfig
}

function resolveSqliteFilePath(rootDir: string, databaseUrl: string | undefined) {
  if (!databaseUrl) {
    return path.join(rootDir, 'noteflow.db')
  }

  return databaseUrl.startsWith('file:')
    ? databaseUrl.slice('file:'.length)
    : databaseUrl
}

export function createAppConfig(rootDir: string): AppConfig {
  const filePath = resolveSqliteFilePath(rootDir, process.env.DATABASE_URL)

  return {
    port: Number(process.env.PORT ?? 3001),
    database: {
      provider: 'sqlite',
      url: `file:${filePath.replace(/\\/g, '/')}`,
      filePath,
    },
  }
}
