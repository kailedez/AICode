import type { DatabaseService } from '../../database'
import { createUid, nowIso } from '../../utils'

function mapFolder(folder: {
  id: number
  uid: string
  userId: number
  parentUid: string | null
  ancestorPath: string | null
  name: string
  sortOrder: number
  isExpanded: boolean
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
}) {
  return {
    ...folder,
    createdAt: folder.createdAt.toISOString(),
    updatedAt: folder.updatedAt.toISOString(),
    deletedAt: folder.deletedAt ? folder.deletedAt.toISOString() : null,
  }
}

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
    lastEditedAt: note.lastEditedAt.toISOString(),
    createdAt: note.createdAt.toISOString(),
    updatedAt: note.updatedAt.toISOString(),
    deletedAt: note.deletedAt ? note.deletedAt.toISOString() : null,
  }
}

export function createFoldersRepository(store: DatabaseService) {
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

    async getFolderGraph(userId: number) {
      const [folders, notes] = await Promise.all([
        prisma.folder.findMany({
          where: {
            userId,
            deletedAt: null,
          },
          orderBy: { sortOrder: 'asc' },
        }),
        prisma.note.findMany({
          where: {
            userId,
            deletedAt: null,
            status: { not: 3 },
          },
        }),
      ])

      return { folders: folders.map(mapFolder), notes: notes.map(mapNote) }
    },

    async createFolder(userId: number, input: { name: string; parentUid: string | null }) {
      const [siblings, parent] = await Promise.all([
        prisma.folder.findMany({
          where: {
            userId,
            deletedAt: null,
            parentUid: input.parentUid,
          },
          select: { sortOrder: true },
        }),
        input.parentUid
          ? prisma.folder.findFirst({
              where: {
                userId,
                uid: input.parentUid,
                deletedAt: null,
              },
            })
          : Promise.resolve(null),
      ])

      const timestamp = nowIso()
      const folder = await prisma.folder.create({
        data: {
          uid: createUid('fld'),
          userId,
          parentUid: input.parentUid,
          ancestorPath: parent ? [parent.ancestorPath, parent.uid].filter(Boolean).join('/') : null,
          name: input.name,
          sortOrder: siblings.length === 0 ? 10 : Math.max(...siblings.map((item) => item.sortOrder)) + 10,
          isExpanded: true,
          createdAt: new Date(timestamp),
          updatedAt: new Date(timestamp),
        },
      })
      return mapFolder(folder)
    },

    async updateFolder(userId: number, folderUid: string, input: { name?: string; sortOrder?: number; isExpanded?: boolean }) {
      const folder = await prisma.folder.findFirst({
        where: {
          userId,
          uid: folderUid,
          deletedAt: null,
        },
      })
      if (!folder) return null

      const updatedFolder = await prisma.folder.update({
        where: { id: folder.id },
        data: {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
          ...(input.isExpanded !== undefined ? { isExpanded: input.isExpanded } : {}),
          updatedAt: new Date(),
        },
      })

      const noteCount = await prisma.note.count({
        where: {
          userId,
          deletedAt: null,
          status: { not: 3 },
          folderUid: updatedFolder.uid,
        },
      })

      return { folder: mapFolder(updatedFolder), noteCount }
    },

    async softDeleteFolders(userId: number, folderUids: string[]) {
      const timestamp = new Date(nowIso())
      await prisma.$transaction([
        prisma.folder.updateMany({
          where: {
            userId,
            uid: { in: folderUids },
            deletedAt: null,
          },
          data: {
            deletedAt: timestamp,
            updatedAt: timestamp,
          },
        }),
        prisma.note.updateMany({
          where: {
            userId,
            folderUid: { in: folderUids },
            deletedAt: null,
          },
          data: {
            folderUid: null,
            updatedAt: timestamp,
            lastEditedAt: timestamp,
          },
        }),
      ])
    },
  }
}
