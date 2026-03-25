import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
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

async function initializeSqliteSchema(prisma: PrismaClient) {
  const statements = [
    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      uid TEXT NOT NULL UNIQUE,
      email TEXT UNIQUE,
      mobile TEXT,
      passwordHash TEXT,
      nickname TEXT NOT NULL,
      avatarUrl TEXT,
      status INTEGER NOT NULL,
      lastLoginAt DATETIME,
      createdAt DATETIME NOT NULL,
      updatedAt DATETIME NOT NULL,
      deletedAt DATETIME
    )`,
    `CREATE TABLE IF NOT EXISTS user_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL UNIQUE,
      theme TEXT NOT NULL,
      defaultFolderUid TEXT,
      editorPreferences TEXT,
      createdAt DATETIME NOT NULL,
      updatedAt DATETIME NOT NULL,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS folders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      uid TEXT NOT NULL UNIQUE,
      userId INTEGER NOT NULL,
      parentUid TEXT,
      ancestorPath TEXT,
      name TEXT NOT NULL,
      sortOrder INTEGER NOT NULL,
      isExpanded BOOLEAN NOT NULL,
      createdAt DATETIME NOT NULL,
      updatedAt DATETIME NOT NULL,
      deletedAt DATETIME,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    )`,
    `CREATE INDEX IF NOT EXISTS folders_user_parent_deleted_idx ON folders(userId, parentUid, deletedAt)`,
    `CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      uid TEXT NOT NULL UNIQUE,
      userId INTEGER NOT NULL,
      folderUid TEXT,
      title TEXT NOT NULL,
      summary TEXT,
      contentJson TEXT,
      contentHtml TEXT,
      contentText TEXT,
      wordCount INTEGER NOT NULL,
      status INTEGER NOT NULL,
      revisionNo INTEGER NOT NULL DEFAULT 0,
      lastEditedAt DATETIME NOT NULL,
      createdAt DATETIME NOT NULL,
      updatedAt DATETIME NOT NULL,
      deletedAt DATETIME,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    )`,
    `CREATE INDEX IF NOT EXISTS notes_user_folder_updated_idx ON notes(userId, folderUid, updatedAt)`,
    `CREATE INDEX IF NOT EXISTS notes_user_status_updated_idx ON notes(userId, status, updatedAt)`,
    `CREATE TABLE IF NOT EXISTS note_revisions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      noteUid TEXT NOT NULL,
      userId INTEGER NOT NULL,
      versionNo INTEGER NOT NULL,
      title TEXT NOT NULL,
      contentJson TEXT,
      contentHtml TEXT,
      contentText TEXT,
      createdAt DATETIME NOT NULL,
      createdBy INTEGER NOT NULL,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS note_revisions_note_version_idx ON note_revisions(noteUid, versionNo)`,
    `CREATE TABLE IF NOT EXISTS user_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sessionUid TEXT NOT NULL UNIQUE,
      userId INTEGER NOT NULL,
      refreshTokenHash TEXT NOT NULL,
      clientType TEXT NOT NULL,
      deviceInfo TEXT,
      ip TEXT,
      expiredAt DATETIME NOT NULL,
      revokedAt DATETIME,
      createdAt DATETIME NOT NULL,
      updatedAt DATETIME NOT NULL,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    )`,
    `CREATE INDEX IF NOT EXISTS user_sessions_user_revoked_expired_idx ON user_sessions(userId, revokedAt, expiredAt)`,
    `CREATE TABLE IF NOT EXISTS operation_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      targetType TEXT NOT NULL,
      targetUid TEXT NOT NULL,
      action TEXT NOT NULL,
      requestId TEXT,
      detail TEXT,
      createdAt DATETIME NOT NULL,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    )`,
  ]

  for (const statement of statements) {
    await prisma.$executeRawUnsafe(statement)
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

export class DatabaseService {
  readonly prisma: PrismaClient
  private readonly rootDir: string
  readonly config

  constructor(rootDir: string) {
    this.rootDir = rootDir
    this.config = createAppConfig(rootDir)
    const databasePath = this.config.database.filePath
    this.prisma = new PrismaClient({
      adapter: new PrismaBetterSqlite3({
        url: databasePath.replace(/\//g, path.sep),
      }),
    })
  }

  async ensure() {
    await mkdir(this.rootDir, { recursive: true })
    await this.prisma.$connect()
    await initializeSqliteSchema(this.prisma)
    await seedDatabase(this.prisma)
    await repairSeedEncoding(this.prisma)
  }

  async disconnect() {
    await this.prisma.$disconnect()
  }
}
