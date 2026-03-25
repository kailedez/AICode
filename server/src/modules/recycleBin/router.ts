import { Router } from 'express'
import type { DatabaseService } from '../../database'
import { sendOk } from '../shared/response'
import { createNotesService } from '../notes/service'

export function createRecycleBinRouter(store: DatabaseService) {
  const router = Router()
  const service = createNotesService(store)

  router.get('/recycle-bin/notes', async (_req, res, next) => {
    try {
      sendOk(res, await service.listDeletedNotes(res.locals.currentUserUid as string))
    } catch (error) {
      next(error)
    }
  })

  router.post('/recycle-bin/notes/:noteUid/recover', async (req, res, next) => {
    try {
      sendOk(res, await service.recoverNote(res.locals.currentUserUid as string, req.params.noteUid, res.locals.requestId as string))
    } catch (error) {
      next(error)
    }
  })

  router.delete('/recycle-bin/notes/:noteUid', async (req, res, next) => {
    try {
      sendOk(res, await service.permanentlyDeleteNote(res.locals.currentUserUid as string, req.params.noteUid, res.locals.requestId as string))
    } catch (error) {
      next(error)
    }
  })

  return router
}
