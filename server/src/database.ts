import { PrismaNeon } from '@prisma/adapter-neon'
import { PrismaClient } from '@prisma/client'
import { createAppConfig } from './config'
import { CORRUPTED_FOLDER_NAMES, CORRUPTED_NOTE_TITLES, DEMO_FOLDERS, DEMO_NOTES, DEMO_USER_UID } from './seed'
import { createUid, nowIso, stripHtml, summarize } from './utils'

export function serializeJson(value: Record<string, unknown> | null) {
  return value ? JSON.stringify(value) : null
}

export function deserializeJson(value: string | null) {
  if (!value) return null
  try {
    return JSON.parse(value) as Record<string, unknown>
  } catch {
    return null
  }
}

async function seedDatabase(prisma: PrismaClient) {
  if ((await prisma.user.count()) > 0) return

  const createdAt = nowIso()
  const folderUidMap = new Map(DEMO_FOLDERS.map((item) => [item.key, createUid('fld')]))

  await prisma.user.create({
    data: {
      uid: DEMO_USER_UID,
      email: 'demo@example.com',
      mobile: null,
      passwordHash: 'noteflow123',
      nickname: 'Yuki',
      avatarUrl: null,
      status: 1,
      lastLoginAt: new Date(createdAt),
      createdAt: new Date(createdAt),
      updatedAt: new Date(createdAt),
      settings: {
        create: {
          theme: 'system',
          defaultFolderUid: folderUidMap.get('capture') ?? null,
          editorPreferences: null,
          createdAt: new Date(createdAt),
          updatedAt: new Date(createdAt),
        },
      },
      folders: {
        create: DEMO_FOLDERS.map((folder) => ({
          uid: folderUidMap.get(folder.key) ?? createUid('fld'),
          parentUid: folder.parentKey ? folderUidMap.get(folder.parentKey) ?? null : null,
          ancestorPath: folder.parentKey ? folderUidMap.get(folder.parentKey) ?? null : null,
          name: folder.name,
          sortOrder: folder.sortOrder,
          isExpanded: true,
          createdAt: new Date(createdAt),
          updatedAt: new Date(createdAt),
        })),
      },
      notes: {
        create: DEMO_NOTES.map((note) => {
          const contentText = stripHtml(note.contentHtml)
          return {
            uid: createUid('note'),
            folderUid: folderUidMap.get(note.folderKey) ?? null,
            title: note.title,
            summary: summarize(contentText),
            contentJson: null,
            contentHtml: note.contentHtml,
            contentText,
            wordCount: contentText.length,
            status: 1,
            revisionNo: 0,
            lastEditedAt: new Date(createdAt),
            createdAt: new Date(createdAt),
            updatedAt: new Date(createdAt),
          }
        }),
      },
    },
  })
}

async function repairSeedEncoding(prisma: PrismaClient) {
  const demoUser = await prisma.user.findFirst({
    where: {
      uid: DEMO_USER_UID,
      deletedAt: null,
    },
  })

  if (!demoUser) return

  for (const [corruptedName, correctName] of CORRUPTED_FOLDER_NAMES) {
    await prisma.folder.updateMany({
      where: {
        userId: demoUser.id,
        name: corruptedName,
      },
      data: {
        name: correctName,
      },
    })
  }

  const noteMap = new Map(DEMO_NOTES.map((item) => [item.title, item]))
  for (const [corruptedTitle, correctTitle] of CORRUPTED_NOTE_TITLES) {
    const definition = noteMap.get(correctTitle)
    if (!definition) continue

    const contentText = stripHtml(definition.contentHtml)
    await prisma.note.updateMany({
      where: {
        userId: demoUser.id,
        title: corruptedTitle,
      },
      data: {
        title: definition.title,
        summary: summarize(contentText),
        contentHtml: definition.contentHtml,
        contentText,
        wordCount: contentText.length,
      },
    })
  }
}

function toInitializationError(error: unknown) {
  if (!(error instanceof Error)) {
    return new Error('Failed to initialize Neon PostgreSQL database.')
  }

  return new Error(
    [
      'Failed to initialize Neon PostgreSQL database.',
      'Make sure DATABASE_URL uses the pooled Neon connection string and that the schema has been applied with DIRECT_URL.',
      "Run 'npm run db:push' after setting your Neon env vars.",
      `Original error: ${error.message}`,
    ].join(' '),
  )
}

export class DatabaseService {
  readonly prisma: PrismaClient
  readonly config

  constructor(rootDir: string) {
    this.config = createAppConfig(rootDir)

    if (!this.config.database.url) {
      throw new Error('DATABASE_URL is required before starting the Neon PostgreSQL backend.')
    }

    this.prisma = new PrismaClient({
      adapter: new PrismaNeon({
        connectionString: this.config.database.url,
      }),
    })
  }

  async ensure() {
    await this.prisma.$connect()

    try {
      await seedDatabase(this.prisma)
      await repairSeedEncoding(this.prisma)
    } catch (error) {
      throw toInitializationError(error)
    }
  }

  async disconnect() {
    await this.prisma.$disconnect()
  }
}
