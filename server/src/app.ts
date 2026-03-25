import cors from 'cors'
import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { DataStore } from './dataStore'
import { createAuthMiddleware } from './modules/auth/middleware'
import { createAuthRouter } from './modules/auth/router'
import { createFoldersRouter } from './modules/folders/router'
import { createMeRouter } from './modules/me/router'
import { createNotesRouter } from './modules/notes/router'
import { HttpError } from './modules/shared/errors'
import { createRequestId } from './utils'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const defaultDataDir = path.resolve(currentDir, '../data')

export function createApp(dataDir = defaultDataDir) {
  const app = express()
  const store = new DataStore(dataDir)

  app.use(cors())
  app.use(express.json({ limit: '2mb' }))
  app.use((_req, res, next) => {
    res.locals.requestId = createRequestId()
    next()
  })

  app.get('/api/v1/health', (_req, res) => {
    res.json({
      code: 0,
      message: 'ok',
      data: { status: 'ok' },
      requestId: res.locals.requestId,
    })
  })

  app.use('/api/v1', createAuthRouter(store))
  app.use('/api/v1', createAuthMiddleware(store))
  app.use('/api/v1', createMeRouter(store))
  app.use('/api/v1', createFoldersRouter(store))
  app.use('/api/v1', createNotesRouter(store))

  app.use((error: unknown, _req: express.Request, res: express.Response) => {
    if (error instanceof HttpError) {
      res.status(error.statusCode).json({
        code: error.code,
        message: error.message,
        data: null,
        requestId: res.locals.requestId as string,
      })
      return
    }

    if (error instanceof Error && 'issues' in error) {
      res.status(400).json({
        code: 40001,
        message: '参数错误',
        data: error,
        requestId: res.locals.requestId as string,
      })
      return
    }

    console.error(error)
    res.status(500).json({
      code: 50001,
      message: '服务内部错误',
      data: null,
      requestId: res.locals.requestId as string,
    })
  })

  return { app, store }
}
