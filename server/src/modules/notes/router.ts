import { Router } from 'express'
import { z } from 'zod'
import type { DataStore } from '../../dataStore'
import type { NoteRecord, NoteRevisionRecord } from '../../types'
import { createUid, nextNumericId, nowIso, summarize } from '../../utils'
import { activeFolders, activeNotes, buildFolderTree, collectFolderUids, requireUserByUid } from '../shared/helpers'
import { HttpError } from '../shared/errors'
import { sendOk } from '../shared/response'

function mapNoteListItem(note: NoteRecord, folderName: string | null) {
  return {
    uid: note.uid,
    title: note.title,
    summary: note.summary,
    folderUid: note.folderUid,
    folderName,
    wordCount: note.wordCount,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
  }
}

function mapNoteDetail(note: NoteRecord, folderName: string | null) {
  return {
    ...mapNoteListItem(note, folderName),
    contentJson: note.contentJson,
    contentHtml: note.contentHtml,
    contentText: note.contentText,
  }
}

export function createNotesRouter(store: DataStore) {
  const router = Router()

  router.get('/notes', async (req, res, next) => {
    try {
      const query = z.object({
        folderUid: z.string().optional(),
        includeDescendants: z.enum(['true', 'false']).optional(),
        keyword: z.string().optional(),
      }).parse(req.query)
      const db = await store.read()
      const user = requireUserByUid(db.users, res.locals.currentUserUid as string)
      const folderMap = new Map(activeFolders(db.folders, user.id).map((item) => [item.uid, item.name]))
      let notes = activeNotes(db.notes, user.id)

      if (query.folderUid) {
        const tree = buildFolderTree(db.folders, db.notes, user.id)
        const folderUids = query.includeDescendants === 'false'
          ? [query.folderUid]
          : collectFolderUids(tree, query.folderUid)
        notes = notes.filter((item) => item.folderUid && folderUids.includes(item.folderUid))
      }

      if (query.keyword) {
        const keyword = query.keyword.toLowerCase()
        notes = notes.filter((item) =>
          [item.title, item.summary ?? '', item.contentText ?? ''].join(' ').toLowerCase().includes(keyword)
        )
      }

      notes = [...notes].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      sendOk(res, notes.map((item) => mapNoteListItem(item, item.folderUid ? folderMap.get(item.folderUid) ?? null : null)))
    } catch (error) {
      next(error)
    }
  })

  router.get('/notes/:noteUid', async (req, res, next) => {
    try {
      const db = await store.read()
      const user = requireUserByUid(db.users, res.locals.currentUserUid as string)
      const note = activeNotes(db.notes, user.id).find((item) => item.uid === req.params.noteUid)
      if (!note) {
        throw new HttpError(404, 40401, '笔记不存在')
      }

      const folderName = note.folderUid
        ? activeFolders(db.folders, user.id).find((folder) => folder.uid === note.folderUid)?.name ?? null
        : null
      sendOk(res, mapNoteDetail(note, folderName))
    } catch (error) {
      next(error)
    }
  })

  router.post('/notes', async (req, res, next) => {
    try {
      const payload = z.object({
        title: z.string().trim().min(1).max(255),
        folderUid: z.string().nullable(),
      }).parse(req.body)
      const db = await store.read()
      const user = requireUserByUid(db.users, res.locals.currentUserUid as string)
      const now = nowIso()
      const note: NoteRecord = {
        id: nextNumericId(db.notes),
        uid: createUid('note'),
        userId: user.id,
        folderUid: payload.folderUid,
        title: payload.title,
        summary: null,
        contentJson: null,
        contentHtml: '',
        contentText: '',
        wordCount: 0,
        status: 1,
        lastEditedAt: now,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      }
      db.notes.push(note)
      await store.write(db)

      const folderName = payload.folderUid
        ? activeFolders(db.folders, user.id).find((folder) => folder.uid === payload.folderUid)?.name ?? null
        : null
      sendOk(res, mapNoteDetail(note, folderName))
    } catch (error) {
      next(error)
    }
  })

  router.put('/notes/:noteUid', async (req, res, next) => {
    try {
      const payload = z.object({
        title: z.string().trim().min(1).max(255).optional(),
        folderUid: z.string().nullable().optional(),
      }).parse(req.body)
      const db = await store.read()
      const user = requireUserByUid(db.users, res.locals.currentUserUid as string)
      const note = activeNotes(db.notes, user.id).find((item) => item.uid === req.params.noteUid)
      if (!note) {
        throw new HttpError(404, 40401, '笔记不存在')
      }

      if (payload.title !== undefined) note.title = payload.title
      if (payload.folderUid !== undefined) note.folderUid = payload.folderUid
      note.updatedAt = nowIso()
      await store.write(db)

      const folderName = note.folderUid
        ? activeFolders(db.folders, user.id).find((folder) => folder.uid === note.folderUid)?.name ?? null
        : null
      sendOk(res, mapNoteDetail(note, folderName))
    } catch (error) {
      next(error)
    }
  })

  router.put('/notes/:noteUid/content', async (req, res, next) => {
    try {
      const payload = z.object({
        title: z.string().trim().min(1).max(255),
        contentJson: z.record(z.string(), z.unknown()).nullable(),
        contentHtml: z.string().nullable(),
        contentText: z.string().nullable(),
        wordCount: z.number().int().nonnegative(),
        clientUpdatedAt: z.string(),
      }).parse(req.body)
      const db = await store.read()
      const user = requireUserByUid(db.users, res.locals.currentUserUid as string)
      const note = activeNotes(db.notes, user.id).find((item) => item.uid === req.params.noteUid)
      if (!note) {
        throw new HttpError(404, 40401, '笔记不存在')
      }

      const revision: NoteRevisionRecord = {
        id: nextNumericId(db.noteRevisions),
        noteUid: note.uid,
        userId: user.id,
        versionNo: db.noteRevisions.filter((item) => item.noteUid === note.uid).length + 1,
        title: note.title,
        contentJson: note.contentJson,
        contentHtml: note.contentHtml,
        contentText: note.contentText,
        createdAt: nowIso(),
        createdBy: user.id,
      }
      db.noteRevisions.push(revision)

      note.title = payload.title
      note.contentJson = payload.contentJson
      note.contentHtml = payload.contentHtml
      note.contentText = payload.contentText
      note.summary = summarize(payload.contentText)
      note.wordCount = payload.wordCount
      note.updatedAt = nowIso()
      note.lastEditedAt = note.updatedAt
      await store.write(db)

      const folderName = note.folderUid
        ? activeFolders(db.folders, user.id).find((folder) => folder.uid === note.folderUid)?.name ?? null
        : null
      sendOk(res, mapNoteDetail(note, folderName))
    } catch (error) {
      next(error)
    }
  })

  router.delete('/notes/:noteUid', async (req, res, next) => {
    try {
      const db = await store.read()
      const user = requireUserByUid(db.users, res.locals.currentUserUid as string)
      const note = db.notes.find((item) => item.uid === req.params.noteUid && item.userId === user.id && item.deletedAt === null)
      if (!note) {
        throw new HttpError(404, 40401, '笔记不存在')
      }

      note.status = 3
      note.deletedAt = nowIso()
      note.updatedAt = note.deletedAt
      await store.write(db)
      sendOk(res, { success: true as const })
    } catch (error) {
      next(error)
    }
  })

  return router
}
