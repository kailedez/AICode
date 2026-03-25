import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import { PrismaClient } from '@prisma/client'
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
  const productFolderUid = createUid('fld')
  const researchFolderUid = createUid('fld')
  const sprintFolderUid = createUid('fld')
  const captureFolderUid = createUid('fld')

  const noteOneHtml =
    '<h1>NoteFlow 杩唬鏂瑰悜</h1><p>鍥寸粫鐩綍缁勭粐銆佽嚜鍔ㄤ繚瀛樺拰鍦ㄧ嚎鍚屾寤虹珛涓€鑷翠綋楠屻€?/p><ul><li><p>鏄庣‘ API 鏁版嵁缁撴瀯</p></li><li><p>寤虹珛淇濆瓨鐘舵€佹彁绀?/p></li><li><p>閲嶅仛淇℃伅灞傜骇</p></li></ul>'
  const noteTwoHtml =
    '<h2>绔炲搧瑙傚療</h2><p>浼樼绗旇浜у搧閫氬父鎶婃悳绱€佹敹钘忋€佹渶杩戞洿鏂版斁鍦ㄧ涓€灞忓彲瑙佽寖鍥村唴銆?/p><blockquote><p>淇℃伅鏋舵瀯姣旇瑙夌粏鑺傛洿鍏堝喅瀹氫笓涓氭劅銆?/p></blockquote>'
  const noteThreeHtml =
    '<p>浠婂ぉ鏁寸悊浜嗘柊鐨勭紪杈戝櫒浜や簰锛?/p><ul data-type="taskList"><li data-type="taskItem" data-checked="true"><label><input type="checkbox" checked="checked"><span></span></label><div><p>鏍囬鐙珛淇濆瓨</p></div></li><li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>琛ュ厖鍘嗗彶鐗堟湰鍏ュ彛</p></div></li></ul>'

  const noteOneText = stripHtml(noteOneHtml)
  const noteTwoText = stripHtml(noteTwoHtml)
  const noteThreeText = stripHtml(noteThreeHtml)

  await prisma.user.create({
    data: {
      uid: 'usr_demo',
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
          defaultFolderUid: captureFolderUid,
          editorPreferences: null,
          createdAt: new Date(createdAt),
          updatedAt: new Date(createdAt),
        },
      },
      folders: {
        create: [
          {
            uid: productFolderUid,
            parentUid: null,
            ancestorPath: null,
            name: '浜у搧璁捐',
            sortOrder: 10,
            isExpanded: true,
            createdAt: new Date(createdAt),
            updatedAt: new Date(createdAt),
          },
          {
            uid: researchFolderUid,
            parentUid: productFolderUid,
            ancestorPath: productFolderUid,
            name: '绔炲搧鐮旂┒',
            sortOrder: 20,
            isExpanded: true,
            createdAt: new Date(createdAt),
            updatedAt: new Date(createdAt),
          },
          {
            uid: sprintFolderUid,
            parentUid: productFolderUid,
            ancestorPath: productFolderUid,
            name: 'Sprint 瑙勫垝',
            sortOrder: 30,
            isExpanded: true,
            createdAt: new Date(createdAt),
            updatedAt: new Date(createdAt),
          },
          {
            uid: captureFolderUid,
            parentUid: null,
            ancestorPath: null,
            name: '鐏垫劅閫熻',
            sortOrder: 40,
            isExpanded: true,
            createdAt: new Date(createdAt),
            updatedAt: new Date(createdAt),
          },
        ],
      },
      notes: {
        create: [
          {
            uid: createUid('note'),
            folderUid: sprintFolderUid,
            title: 'NoteFlow 杩唬鏂瑰悜',
            summary: summarize(noteOneText),
            contentJson: null,
            contentHtml: noteOneHtml,
            contentText: noteOneText,
            wordCount: noteOneText.length,
            status: 1,
            revisionNo: 0,
            lastEditedAt: new Date(createdAt),
            createdAt: new Date(createdAt),
            updatedAt: new Date(createdAt),
          },
          {
            uid: createUid('note'),
            folderUid: researchFolderUid,
            title: '绔炲搧瑙傚療',
            summary: summarize(noteTwoText),
            contentJson: null,
            contentHtml: noteTwoHtml,
            contentText: noteTwoText,
            wordCount: noteTwoText.length,
            status: 1,
            revisionNo: 0,
            lastEditedAt: new Date(createdAt),
            createdAt: new Date(createdAt),
            updatedAt: new Date(createdAt),
          },
          {
            uid: createUid('note'),
            folderUid: captureFolderUid,
            title: '浠婃棩閫熻',
            summary: summarize(noteThreeText),
            contentJson: null,
            contentHtml: noteThreeHtml,
            contentText: noteThreeText,
            wordCount: noteThreeText.length,
            status: 1,
            revisionNo: 0,
            lastEditedAt: new Date(createdAt),
            createdAt: new Date(createdAt),
            updatedAt: new Date(createdAt),
          },
        ],
      },
    },
  })
}

export class DatabaseService {
  readonly prisma: PrismaClient
  private readonly rootDir: string

  constructor(rootDir: string) {
    this.rootDir = rootDir
    const databasePath = (process.env.DATABASE_URL?.startsWith('file:')
      ? process.env.DATABASE_URL.slice('file:'.length)
      : process.env.DATABASE_URL) ?? path.join(rootDir, 'noteflow.db')
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
  }

  async disconnect() {
    await this.prisma.$disconnect()
  }
}
