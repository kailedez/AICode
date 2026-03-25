import { Router } from 'express'
import type { DatabaseService } from '../../database'
import { sendOk } from '../shared/response'
import { createNoteSchema, listNotesQuerySchema, restoreRevisionSchema, saveNoteContentSchema, updateNoteSchema } from './schema'
import { createNotesService } from './service'

export function createNotesRouter(store: DatabaseService) {
  const router = Router()
  const service = createNotesService(store)

  router.get('/notes', async (req, res, next) => {
    try {
      const query = listNotesQuerySchema.parse(req.query)
      sendOk(res, await service.listNotes(res.locals.currentUserUid as string, query))
    } catch (error) {
      next(error)
    }
  })

  router.get('/notes/:noteUid', async (req, res, next) => {
    try {
      sendOk(res, await service.getNote(res.locals.currentUserUid as string, req.params.noteUid))
    } catch (error) {
      next(error)
    }
  })

  router.get('/notes/:noteUid/revisions', async (req, res, next) => {
    try {
      sendOk(res, await service.listRevisions(res.locals.currentUserUid as string, req.params.noteUid))
    } catch (error) {
      next(error)
    }
  })

  router.post('/notes', async (req, res, next) => {
    try {
      const payload = createNoteSchema.parse(req.body)
      sendOk(res, await service.createNote(res.locals.currentUserUid as string, payload, res.locals.requestId as string))
    } catch (error) {
      next(error)
    }
  })

  router.put('/notes/:noteUid', async (req, res, next) => {
    try {
      const payload = updateNoteSchema.parse(req.body)
      sendOk(res, await service.updateNote(res.locals.currentUserUid as string, req.params.noteUid, payload, res.locals.requestId as string))
    } catch (error) {
      next(error)
    }
  })

  router.put('/notes/:noteUid/content', async (req, res, next) => {
    try {
      const payload = saveNoteContentSchema.parse(req.body)
      sendOk(res, await service.saveNoteContent(res.locals.currentUserUid as string, req.params.noteUid, payload, res.locals.requestId as string))
    } catch (error) {
      next(error)
    }
  })

  router.post('/notes/:noteUid/restore', async (req, res, next) => {
    try {
      const payload = restoreRevisionSchema.parse(req.body)
      sendOk(res, await service.restoreRevision(res.locals.currentUserUid as string, req.params.noteUid, payload.versionNo, res.locals.requestId as string))
    } catch (error) {
      next(error)
    }
  })

  router.delete('/notes/:noteUid', async (req, res, next) => {
    try {
      sendOk(res, await service.deleteNote(res.locals.currentUserUid as string, req.params.noteUid, res.locals.requestId as string))
    } catch (error) {
      next(error)
    }
  })

  return router
}
