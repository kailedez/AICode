import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { DEMO_FOLDERS, DEMO_NOTES, DEMO_USER_UID } from './seed'
import type { DatabaseSchema } from './types'
import { createUid, nowIso, stripHtml, summarize } from './utils'

function createSeed(): DatabaseSchema {
  const createdAt = nowIso()
  const folderUidMap = new Map(DEMO_FOLDERS.map((item) => [item.key, createUid('fld')]))

  return {
    users: [
      {
        id: 1,
        uid: DEMO_USER_UID,
        email: 'demo@example.com',
        mobile: null,
        passwordHash: 'noteflow123',
        nickname: 'Yuki',
        avatarUrl: null,
        status: 1,
        lastLoginAt: createdAt,
        createdAt,
        updatedAt: createdAt,
        deletedAt: null,
      },
    ],
    userSettings: [
      {
        id: 1,
        userId: 1,
        theme: 'system',
        defaultFolderUid: folderUidMap.get('capture') ?? null,
        editorPreferences: null,
        createdAt,
        updatedAt: createdAt,
      },
    ],
    folders: DEMO_FOLDERS.map((folder, index) => ({
      id: index + 1,
      uid: folderUidMap.get(folder.key) ?? createUid('fld'),
      userId: 1,
      parentUid: folder.parentKey ? folderUidMap.get(folder.parentKey) ?? null : null,
      ancestorPath: folder.parentKey ? folderUidMap.get(folder.parentKey) ?? null : null,
      name: folder.name,
      sortOrder: folder.sortOrder,
      isExpanded: true,
      createdAt,
      updatedAt: createdAt,
      deletedAt: null,
    })),
    notes: DEMO_NOTES.map((note, index) => {
      const contentText = stripHtml(note.contentHtml)
      return {
        id: index + 1,
        uid: createUid('note'),
        userId: 1,
        folderUid: folderUidMap.get(note.folderKey) ?? null,
        title: note.title,
        summary: summarize(contentText),
        contentJson: null,
        contentHtml: note.contentHtml,
        contentText,
        wordCount: contentText.length,
        status: 1 as const,
        revisionNo: 0,
        lastEditedAt: createdAt,
        createdAt,
        updatedAt: createdAt,
        deletedAt: null,
      }
    }),
    noteRevisions: [],
    userSessions: [],
    operationLogs: [],
  }
}

function normalizeDatabase(data: DatabaseSchema): DatabaseSchema {
  const next = structuredClone(data)
  const demoUser = next.users.find((item) => item.email === 'demo@example.com')
  if (demoUser && !demoUser.passwordHash) {
    demoUser.passwordHash = 'noteflow123'
  }

  next.folders = next.folders.map((folder) => ({
    ...folder,
    ancestorPath: folder.ancestorPath ?? folder.parentUid,
  }))

  next.notes = next.notes.map((note) => ({
    ...note,
    revisionNo: note.revisionNo ?? 0,
  }))

  next.userSessions = Array.isArray(next.userSessions) ? next.userSessions : []

  return next
}

export class DataStore {
  private readonly rootDir: string

  constructor(rootDir: string) {
    this.rootDir = rootDir
  }

  private get filePath() {
    return path.join(this.rootDir, 'database.json')
  }

  async ensure() {
    await mkdir(this.rootDir, { recursive: true })
    try {
      await readFile(this.filePath, 'utf8')
    } catch {
      await this.write(createSeed())
    }
  }

  async read() {
    await this.ensure()
    const raw = await readFile(this.filePath, 'utf8')
    const parsed = normalizeDatabase(JSON.parse(raw) as DatabaseSchema)
    await this.write(parsed)
    return parsed
  }

  async write(data: DatabaseSchema) {
    await mkdir(this.rootDir, { recursive: true })
    await writeFile(this.filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8')
  }
}
