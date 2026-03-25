import type { DatabaseService } from '../../database'
import { deserializeJson, serializeJson } from '../../database'
import { createUid, nowIso, summarize } from '../../utils'

function mapNote(note: {
  id: number
  uid: string
  userId: number
  folderUid: string | null
  title: string
  summary: string | null
  contentJson: string | null
  contentHtml: string | null
  contentText: string | null
  wordCount: number
  status: number
  revisionNo: number
  lastEditedAt: Date
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
}) {
  return {
    ...note,
    contentJson: deserializeJson(note.contentJson),
    lastEditedAt: note.lastEditedAt.toISOString(),
    createdAt: note.createdAt.toISOString(),
    updatedAt: note.updatedAt.toISOString(),
    deletedAt: note.deletedAt ? note.deletedAt.toISOString() : null,
  }
}

export function createNotesRepository(store: DatabaseService) {
  const prisma = store.prisma

  return {
    findActiveUserByUid(userUid: string) {
      return prisma.user.findFirst({
        where: {
          uid: userUid,
          deletedAt: null,
          status: 1,
        },
      })
    },

    async listActiveFolders(userId: number) {
      const folders = await prisma.folder.findMany({
        where: {
          userId,
          deletedAt: null,
        },
      })
      return folders.map((item) => ({
        ...item,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
        deletedAt: item.deletedAt ? item.deletedAt.toISOString() : null,
      }))
    },

    async listNotes(userId: number) {
      const notes = await prisma.note.findMany({
        where: {
          userId,
          deletedAt: null,
          status: { not: 3 },
        },
      })
      return notes.map(mapNote)
    },

    async getNote(userId: number, noteUid: string) {
      const note = await prisma.note.findFirst({
        where: {
          userId,
          uid: noteUid,
          deletedAt: null,
          status: { not: 3 },
        },
      })
      return note ? mapNote(note) : null
    },

    async createNote(userId: number, input: { title: string; folderUid: string | null }) {
      const timestamp = nowIso()
      const note = await prisma.note.create({
        data: {
          uid: createUid('note'),
          userId,
          folderUid: input.folderUid,
          title: input.title,
          summary: null,
          contentJson: null,
          contentHtml: '',
          contentText: '',
          wordCount: 0,
          status: 1,
          revisionNo: 0,
          lastEditedAt: new Date(timestamp),
          createdAt: new Date(timestamp),
          updatedAt: new Date(timestamp),
        },
      })
      return mapNote(note)
    },

    async updateNote(userId: number, noteUid: string, input: { title?: string; folderUid?: string | null }) {
      const note = await prisma.note.findFirst({
        where: {
          userId,
          uid: noteUid,
          deletedAt: null,
          status: { not: 3 },
        },
      })
      if (!note) return null

      const updatedNote = await prisma.note.update({
        where: { id: note.id },
        data: {
          ...(input.title !== undefined ? { title: input.title } : {}),
          ...(input.folderUid !== undefined ? { folderUid: input.folderUid } : {}),
          updatedAt: new Date(),
        },
      })
      return mapNote(updatedNote)
    },

    async saveNoteContent(
      userId: number,
      noteUid: string,
      input: {
        title: string
        contentJson: Record<string, unknown> | null
        contentHtml: string | null
        contentText: string | null
        wordCount: number
      },
    ) {
      const note = await prisma.note.findFirst({
        where: {
          userId,
          uid: noteUid,
          deletedAt: null,
          status: { not: 3 },
        },
      })
      if (!note) return null

      const currentContentJson = deserializeJson(note.contentJson)
      const isChanged =
        note.title !== input.title ||
        JSON.stringify(currentContentJson) !== JSON.stringify(input.contentJson) ||
        (note.contentHtml ?? '') !== (input.contentHtml ?? '') ||
        (note.contentText ?? '') !== (input.contentText ?? '') ||
        note.wordCount !== input.wordCount

      if (isChanged) {
        const timestamp = new Date(nowIso())
        await prisma.$transaction([
          prisma.noteRevision.create({
            data: {
              noteUid: note.uid,
              userId,
              versionNo: note.revisionNo + 1,
              title: note.title,
              contentJson: note.contentJson,
              contentHtml: note.contentHtml,
              contentText: note.contentText,
              createdAt: timestamp,
              createdBy: userId,
            },
          }),
          prisma.note.update({
            where: { id: note.id },
            data: {
              revisionNo: note.revisionNo + 1,
              title: input.title,
              contentJson: serializeJson(input.contentJson),
              contentHtml: input.contentHtml,
              contentText: input.contentText,
              summary: summarize(input.contentText),
              wordCount: input.wordCount,
              updatedAt: timestamp,
              lastEditedAt: timestamp,
            },
          }),
        ])
      }

      const latest = await prisma.note.findUnique({ where: { id: note.id } })
      return latest
        ? {
            note: mapNote(latest),
            changed: isChanged,
          }
        : null
    },

    async softDeleteNote(userId: number, noteUid: string) {
      const note = await prisma.note.findFirst({
        where: {
          userId,
          uid: noteUid,
          deletedAt: null,
        },
      })
      if (!note) return null
      const timestamp = new Date(nowIso())
      const deletedNote = await prisma.note.update({
        where: { id: note.id },
        data: {
          status: 3,
          deletedAt: timestamp,
          updatedAt: timestamp,
        },
      })
      return mapNote(deletedNote)
    },

    async listRevisions(userId: number, noteUid: string) {
      const note = await prisma.note.findFirst({
        where: {
          userId,
          uid: noteUid,
        },
      })
      if (!note) return null

      return prisma.noteRevision.findMany({
        where: {
          userId,
          noteUid,
        },
        orderBy: { versionNo: 'desc' },
      })
    },

    async restoreRevision(userId: number, noteUid: string, versionNo: number) {
      const note = await prisma.note.findFirst({
        where: {
          userId,
          uid: noteUid,
          deletedAt: null,
          status: { not: 3 },
        },
      })
      if (!note) return null

      const revision = await prisma.noteRevision.findFirst({
        where: {
          userId,
          noteUid,
          versionNo,
        },
      })
      if (!revision) {
        return { note: mapNote(note), revision: null }
      }

      const timestamp = new Date(nowIso())
      await prisma.$transaction([
        prisma.noteRevision.create({
          data: {
            noteUid: note.uid,
            userId,
            versionNo: note.revisionNo + 1,
            title: note.title,
            contentJson: note.contentJson,
            contentHtml: note.contentHtml,
            contentText: note.contentText,
            createdAt: timestamp,
            createdBy: userId,
          },
        }),
        prisma.note.update({
          where: { id: note.id },
          data: {
            revisionNo: note.revisionNo + 1,
            title: revision.title,
            contentJson: revision.contentJson,
            contentHtml: revision.contentHtml,
            contentText: revision.contentText,
            summary: summarize(revision.contentText),
            wordCount: (revision.contentText ?? '').length,
            updatedAt: timestamp,
            lastEditedAt: timestamp,
          },
        }),
      ])

      const latest = await prisma.note.findUnique({ where: { id: note.id } })
      return latest ? { note: mapNote(latest), revision } : null
    },

    async listDeletedNotes(userId: number) {
      const notes = await prisma.note.findMany({
        where: {
          userId,
          deletedAt: { not: null },
          status: 3,
        },
        orderBy: { updatedAt: 'desc' },
      })
      return notes.map(mapNote)
    },

    async recoverNote(userId: number, noteUid: string) {
      const note = await prisma.note.findFirst({
        where: {
          userId,
          uid: noteUid,
          deletedAt: { not: null },
          status: 3,
        },
      })
      if (!note) return null
      const timestamp = new Date(nowIso())
      const recoveredNote = await prisma.note.update({
        where: { id: note.id },
        data: {
          status: 1,
          deletedAt: null,
          updatedAt: timestamp,
          lastEditedAt: timestamp,
        },
      })
      return mapNote(recoveredNote)
    },

    async permanentlyDeleteNote(userId: number, noteUid: string) {
      const note = await prisma.note.findFirst({
        where: {
          userId,
          uid: noteUid,
          deletedAt: { not: null },
          status: 3,
        },
      })
      if (!note) return false

      await prisma.$transaction([
        prisma.noteRevision.deleteMany({
          where: {
            userId,
            noteUid,
          },
        }),
        prisma.note.delete({
          where: { id: note.id },
        }),
      ])
      return true
    },
  }
}
