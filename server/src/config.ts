export interface DatabaseConfig {
  provider: 'postgresql'
  url: string
  directUrl: string
}

export interface AppConfig {
  port: number
  database: DatabaseConfig
}

export function createAppConfig(rootDir: string): AppConfig {
  void rootDir
  const url = process.env.DATABASE_URL ?? ''
  const directUrl = process.env.DIRECT_URL ?? url

  return {
    port: Number(process.env.PORT ?? 3001),
    database: {
      provider: 'postgresql',
      url,
      directUrl,
    },
  }
}
