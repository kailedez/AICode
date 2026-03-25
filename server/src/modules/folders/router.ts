import { Router } from 'express'
import { z } from 'zod'
import type { DataStore } from '../../dataStore'
import type { FolderRecord } from '../../types'
import { createUid, nextNumericId, nowIso } from '../../utils'
import { activeFolders, activeNotes, buildFolderTree, collectFolderUids, requireUserByUid } from '../shared/helpers'
import { sendOk } from '../shared/response'
import { HttpError } from '../shared/errors'

export function createFoldersRouter(store: DataStore) {
  const router = Router()

  router.get('/folders/tree', async (_req, res, next) => {
    try {
      const db = await store.read()
      const user = requireUserByUid(db.users, res.locals.currentUserUid as string)
      sendOk(res, buildFolderTree(db.folders, db.notes, user.id))
    } catch (error) {
      next(error)
    }
  })

  router.post('/folders', async (req, res, next) => {
    try {
      const payload = z.object({
        name: z.string().trim().min(1).max(128),
        parentUid: z.string().nullable(),
      }).parse(req.body)
      const db = await store.read()
      const user = requireUserByUid(db.users, res.locals.currentUserUid as string)
      const now = nowIso()
      const siblings = activeFolders(db.folders, user.id).filter((item) => item.parentUid === payload.parentUid)
      const folder: FolderRecord = {
        id: nextNumericId(db.folders),
        uid: createUid('fld'),
        userId: user.id,
        parentUid: payload.parentUid,
        name: payload.name,
        sortOrder: siblings.length === 0 ? 10 : Math.max(...siblings.map((item) => item.sortOrder)) + 10,
        isExpanded: true,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      }
      db.folders.push(folder)
      await store.write(db)
      sendOk(res, {
        uid: folder.uid,
        name: folder.name,
        parentUid: folder.parentUid,
        sortOrder: folder.sortOrder,
        isExpanded: folder.isExpanded,
        noteCount: 0,
        children: [],
      })
    } catch (error) {
      next(error)
    }
  })

  router.put('/folders/:folderUid', async (req, res, next) => {
    try {
      const payload = z.object({
        name: z.string().trim().min(1).max(128).optional(),
        sortOrder: z.number().int().optional(),
        isExpanded: z.boolean().optional(),
      }).parse(req.body)
      const db = await store.read()
      const user = requireUserByUid(db.users, res.locals.currentUserUid as string)
      const folder = db.folders.find((item) => item.uid === req.params.folderUid && item.userId === user.id && item.deletedAt === null)
      if (!folder) {
        throw new HttpError(404, 40401, '目录不存在')
      }

      if (payload.name !== undefined) folder.name = payload.name
      if (payload.sortOrder !== undefined) folder.sortOrder = payload.sortOrder
      if (payload.isExpanded !== undefined) folder.isExpanded = payload.isExpanded
      folder.updatedAt = nowIso()
      await store.write(db)

      const directCount = activeNotes(db.notes, user.id).filter((item) => item.folderUid === folder.uid).length
      sendOk(res, {
        uid: folder.uid,
        name: folder.name,
        parentUid: folder.parentUid,
        sortOrder: folder.sortOrder,
        isExpanded: folder.isExpanded,
        noteCount: directCount,
        children: [],
      })
    } catch (error) {
      next(error)
    }
  })

  router.delete('/folders/:folderUid', async (req, res, next) => {
    try {
      const db = await store.read()
      const user = requireUserByUid(db.users, res.locals.currentUserUid as string)
      const tree = buildFolderTree(db.folders, db.notes, user.id)
      const folderUids = collectFolderUids(tree, req.params.folderUid)
      if (folderUids.length === 0) {
        throw new HttpError(404, 40401, '目录不存在')
      }

      const now = nowIso()
      for (const folder of db.folders) {
        if (folder.userId === user.id && folderUids.includes(folder.uid)) {
          folder.deletedAt = now
          folder.updatedAt = now
        }
      }
      for (const note of db.notes) {
        if (note.userId === user.id && note.folderUid && folderUids.includes(note.folderUid)) {
          note.folderUid = null
          note.updatedAt = now
          note.lastEditedAt = now
        }
      }

      await store.write(db)
      sendOk(res, { success: true as const })
    } catch (error) {
      next(error)
    }
  })

  return router
}
