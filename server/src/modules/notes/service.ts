import type { DatabaseService } from '../../database'
import { buildFolderTree, collectFolderUids } from '../shared/helpers'
import { HttpError } from '../shared/errors'
import { createNotesRepository } from './repository'

function mapNoteListItem(
  note: {
    uid: string
    title: string
    summary: string | null
    folderUid: string | null
    wordCount: number
    createdAt: string
    updatedAt: string
  },
  folderName: string | null,
) {
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

function mapNoteDetail(
  note: {
    uid: string
    title: string
    summary: string | null
    folderUid: string | null
    wordCount: number
    createdAt: string
    updatedAt: string
    contentJson: Record<string, unknown> | null
    contentHtml: string | null
    contentText: string | null
    revisionNo: number
  },
  folderName: string | null,
) {
  return {
    ...mapNoteListItem(note, folderName),
    contentJson: note.contentJson,
    contentHtml: note.contentHtml,
    contentText: note.contentText,
    revisionNo: note.revisionNo,
  }
}

export function createNotesService(store: DatabaseService) {
  const repository = createNotesRepository(store)

  async function requireUser(userUid: string) {
    const user = await repository.findActiveUserByUid(userUid)
    if (!user) {
      throw new HttpError(404, 40401, '鐢ㄦ埛涓嶅瓨鍦�')
    }
    return user
  }

  async function getFolderNameMap(userId: number) {
    const folders = await repository.listActiveFolders(userId)
    return new Map(folders.map((item) => [item.uid, item.name]))
  }

  return {
    async listNotes(userUid: string, query: { folderUid?: string; includeDescendants?: 'true' | 'false'; keyword?: string }) {
      const user = await requireUser(userUid)
      const folderMap = await getFolderNameMap(user.id)
      let notes = await repository.listNotes(user.id)

      if (query.folderUid) {
        const folders = await repository.listActiveFolders(user.id)
        const tree = buildFolderTree(folders, notes, user.id)
        const folderUids = query.includeDescendants === 'false'
          ? [query.folderUid]
          : collectFolderUids(tree, query.folderUid)
        notes = notes.filter((item) => item.folderUid && folderUids.includes(item.folderUid))
      }

      if (query.keyword) {
        const keyword = query.keyword.toLowerCase()
        notes = notes.filter((item) =>
          [item.title, item.summary ?? '', item.contentText ?? ''].join(' ').toLowerCase().includes(keyword),
        )
      }

      notes = [...notes].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      return notes.map((item) => mapNoteListItem(item, item.folderUid ? folderMap.get(item.folderUid) ?? null : null))
    },

    async getNote(userUid: string, noteUid: string) {
      const user = await requireUser(userUid)
      const note = await repository.getNote(user.id, noteUid)
      if (!note) {
        throw new HttpError(404, 40401, '绗旇涓嶅瓨鍦�')
      }
      const folderMap = await getFolderNameMap(user.id)
      return mapNoteDetail(note, note.folderUid ? folderMap.get(note.folderUid) ?? null : null)
    },

    async createNote(userUid: string, input: { title: string; folderUid: string | null }) {
      const user = await requireUser(userUid)
      const note = await repository.createNote(user.id, input)
      const folderMap = await getFolderNameMap(user.id)
      return mapNoteDetail(note, note.folderUid ? folderMap.get(note.folderUid) ?? null : null)
    },

    async updateNote(userUid: string, noteUid: string, input: { title?: string; folderUid?: string | null }) {
      const user = await requireUser(userUid)
      const note = await repository.updateNote(user.id, noteUid, input)
      if (!note) {
        throw new HttpError(404, 40401, '绗旇涓嶅瓨鍦�')
      }
      const folderMap = await getFolderNameMap(user.id)
      return mapNoteDetail(note, note.folderUid ? folderMap.get(note.folderUid) ?? null : null)
    },

    async saveNoteContent(
      userUid: string,
      noteUid: string,
      input: {
        title: string
        contentJson: Record<string, unknown> | null
        contentHtml: string | null
        contentText: string | null
        wordCount: number
      },
    ) {
      const user = await requireUser(userUid)
      const result = await repository.saveNoteContent(user.id, noteUid, input)
      if (!result) {
        throw new HttpError(404, 40401, '绗旇涓嶅瓨鍦�')
      }
      const folderMap = await getFolderNameMap(user.id)
      return mapNoteDetail(result.note, result.note.folderUid ? folderMap.get(result.note.folderUid) ?? null : null)
    },

    async deleteNote(userUid: string, noteUid: string) {
      const user = await requireUser(userUid)
      const note = await repository.softDeleteNote(user.id, noteUid)
      if (!note) {
        throw new HttpError(404, 40401, '绗旇涓嶅瓨鍦�')
      }
      return { success: true as const }
    },

    async listRevisions(userUid: string, noteUid: string) {
      const user = await requireUser(userUid)
      const revisions = await repository.listRevisions(user.id, noteUid)
      if (!revisions) {
        throw new HttpError(404, 40401, '绗旇涓嶅瓨鍦�')
      }
      return revisions.map((item) => ({
        versionNo: item.versionNo,
        title: item.title,
        contentHtml: item.contentHtml,
        contentText: item.contentText,
        createdAt: item.createdAt.toISOString(),
        createdBy: item.createdBy,
      }))
    },

    async restoreRevision(userUid: string, noteUid: string, versionNo: number) {
      const user = await requireUser(userUid)
      const result = await repository.restoreRevision(user.id, noteUid, versionNo)
      if (!result) {
        throw new HttpError(404, 40401, '绗旇涓嶅瓨鍦�')
      }
      if (!result.revision) {
        throw new HttpError(404, 40401, '鐗堟湰涓嶅瓨鍦�')
      }
      const folderMap = await getFolderNameMap(user.id)
      return mapNoteDetail(result.note, result.note.folderUid ? folderMap.get(result.note.folderUid) ?? null : null)
    },

    async listDeletedNotes(userUid: string) {
      const user = await requireUser(userUid)
      const folderMap = await getFolderNameMap(user.id)
      const notes = await repository.listDeletedNotes(user.id)
      return notes.map((item) => mapNoteDetail(item, item.folderUid ? folderMap.get(item.folderUid) ?? null : null))
    },

    async recoverNote(userUid: string, noteUid: string) {
      const user = await requireUser(userUid)
      const note = await repository.recoverNote(user.id, noteUid)
      if (!note) {
        throw new HttpError(404, 40401, '绗旇涓嶅瓨鍦�')
      }
      const folderMap = await getFolderNameMap(user.id)
      return mapNoteDetail(note, note.folderUid ? folderMap.get(note.folderUid) ?? null : null)
    },

    async permanentlyDeleteNote(userUid: string, noteUid: string) {
      const user = await requireUser(userUid)
      const deleted = await repository.permanentlyDeleteNote(user.id, noteUid)
      if (!deleted) {
        throw new HttpError(404, 40401, '绗旇涓嶅瓨鍦�')
      }
      return { success: true as const }
    },
  }
}
