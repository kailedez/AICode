import { Router } from 'express'
import type { DatabaseService } from '../../database'
import { sendOk } from '../shared/response'
import { createFolderSchema, updateFolderSchema } from './schema'
import { createFoldersService } from './service'

export function createFoldersRouter(store: DatabaseService) {
  const router = Router()
  const service = createFoldersService(store)

  router.get('/folders/tree', async (_req, res, next) => {
    try {
      sendOk(res, await service.getTree(res.locals.currentUserUid as string))
    } catch (error) {
      next(error)
    }
  })

  router.post('/folders', async (req, res, next) => {
    try {
      const payload = createFolderSchema.parse(req.body)
      sendOk(res, await service.createFolder(res.locals.currentUserUid as string, payload, res.locals.requestId as string))
    } catch (error) {
      next(error)
    }
  })

  router.put('/folders/:folderUid', async (req, res, next) => {
    try {
      const payload = updateFolderSchema.parse(req.body)
      sendOk(res, await service.updateFolder(res.locals.currentUserUid as string, req.params.folderUid, payload, res.locals.requestId as string))
    } catch (error) {
      next(error)
    }
  })

  router.delete('/folders/:folderUid', async (req, res, next) => {
    try {
      sendOk(res, await service.deleteFolder(res.locals.currentUserUid as string, req.params.folderUid, res.locals.requestId as string))
    } catch (error) {
      next(error)
    }
  })

  return router
}
