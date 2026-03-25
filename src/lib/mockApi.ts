import type {
  ApiResponse,
  FolderNode,
  NoteDetail,
  NoteListItem,
  NoteQuery,
  Theme,
  UserProfile,
  UserSettings,
} from '../types'
import type { NoteFlowApi, SaveNoteContentPayload, UpdateFolderPayload, UpdateNotePayload } from './api'

interface MockFolderRecord {
  uid: string
  userUid: string
  name: string
  parentUid: string | null
  sortOrder: number
  isExpanded: boolean
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

interface MockNoteRecord {
  uid: string
  userUid: string
  title: string
  summary: string | null
  folderUid: string | null
  folderName: string | null
  contentJson: Record<string, unknown> | null
  contentHtml: string | null
  contentText: string | null
  wordCount: number
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

interface MockDb {
  me: UserProfile
  settings: UserSettings
  folders: MockFolderRecord[]
  notes: MockNoteRecord[]
}

const STORAGE_KEY = 'noteflow.mock.db.v2'
const LATENCY = 120

function generateUid(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`
}

function nowIso() {
  return new Date().toISOString()
}

function stripHtml(html: string) {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function buildSummary(text: string) {
  if (!text) return null
  return text.slice(0, 120)
}

function countWords(text: string) {
  const cjk = (text.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g) || []).length
  const english = (text.match(/[a-zA-Z0-9_-]+/g) || []).length
  return cjk + english
}

function createSeed(): MockDb {
  const me: UserProfile = {
    uid: 'usr_demo',
    nickname: 'Yuki',
    avatarUrl: null,
  }

  const productFolderUid = generateUid('fld')
  const researchFolderUid = generateUid('fld')
  const sprintFolderUid = generateUid('fld')
  const captureFolderUid = generateUid('fld')

  const folders: MockFolderRecord[] = [
    {
      uid: productFolderUid,
      userUid: me.uid,
      name: '产品设计',
      parentUid: null,
      sortOrder: 10,
      isExpanded: true,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      deletedAt: null,
    },
    {
      uid: researchFolderUid,
      userUid: me.uid,
      name: '竞品研究',
      parentUid: productFolderUid,
      sortOrder: 20,
      isExpanded: true,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      deletedAt: null,
    },
    {
      uid: sprintFolderUid,
      userUid: me.uid,
      name: 'Sprint 规划',
      parentUid: productFolderUid,
      sortOrder: 30,
      isExpanded: true,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      deletedAt: null,
    },
    {
      uid: captureFolderUid,
      userUid: me.uid,
      name: '灵感速记',
      parentUid: null,
      sortOrder: 40,
      isExpanded: true,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      deletedAt: null,
    },
  ]

  const noteOneHtml =
    '<h1>NoteFlow 迭代方向</h1><p>围绕目录组织、自动保存和在线同步建立一致体验。</p><ul><li><p>明确 API 数据结构</p></li><li><p>建立保存状态提示</p></li><li><p>重做信息层级</p></li></ul>'
  const noteOneText = stripHtml(noteOneHtml)
  const noteTwoHtml =
    '<h2>竞品观察</h2><p>优秀笔记产品通常把搜索、收藏、最近更新放在第一屏可见范围内。</p><blockquote><p>信息架构比视觉细节更先决定专业感。</p></blockquote>'
  const noteTwoText = stripHtml(noteTwoHtml)
  const noteThreeHtml =
    '<p>今天整理了新的编辑器交互：</p><ul data-type="taskList"><li data-type="taskItem" data-checked="true"><label><input type="checkbox" checked="checked"><span></span></label><div><p>标题独立保存</p></div></li><li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>补充历史版本入口</p></div></li></ul>'
  const noteThreeText = stripHtml(noteThreeHtml)

  const notes: MockNoteRecord[] = [
    {
      uid: generateUid('note'),
      userUid: me.uid,
      title: 'NoteFlow 迭代方向',
      summary: buildSummary(noteOneText),
      folderUid: sprintFolderUid,
      folderName: 'Sprint 规划',
      contentJson: null,
      contentHtml: noteOneHtml,
      contentText: noteOneText,
      wordCount: countWords(noteOneText),
      createdAt: nowIso(),
      updatedAt: nowIso(),
      deletedAt: null,
    },
    {
      uid: generateUid('note'),
      userUid: me.uid,
      title: '竞品观察',
      summary: buildSummary(noteTwoText),
      folderUid: researchFolderUid,
      folderName: '竞品研究',
      contentJson: null,
      contentHtml: noteTwoHtml,
      contentText: noteTwoText,
      wordCount: countWords(noteTwoText),
      createdAt: nowIso(),
      updatedAt: nowIso(),
      deletedAt: null,
    },
    {
      uid: generateUid('note'),
      userUid: me.uid,
      title: '今日速记',
      summary: buildSummary(noteThreeText),
      folderUid: captureFolderUid,
      folderName: '灵感速记',
      contentJson: null,
      contentHtml: noteThreeHtml,
      contentText: noteThreeText,
      wordCount: countWords(noteThreeText),
      createdAt: nowIso(),
      updatedAt: nowIso(),
      deletedAt: null,
    },
  ]

  return {
    me,
    settings: {
      theme: 'system',
      defaultFolderUid: captureFolderUid,
    },
    folders,
    notes,
  }
}

function readDb(): MockDb {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    const seed = createSeed()
    writeDb(seed)
    return seed
  }

  return JSON.parse(raw) as MockDb
}

function writeDb(db: MockDb) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
}

function withLatency<T>(handler: () => T): Promise<T> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(handler()), LATENCY)
  })
}

function response<T>(data: T): ApiResponse<T> {
  return {
    code: 0,
    message: 'ok',
    data,
    requestId: crypto.randomUUID().replace(/-/g, ''),
  }
}

function activeFolders(db: MockDb) {
  return db.folders.filter((folder) => folder.deletedAt === null)
}

function activeNotes(db: MockDb) {
  return db.notes.filter((note) => note.deletedAt === null)
}

function mapNoteListItem(note: MockNoteRecord): NoteListItem {
  return {
    uid: note.uid,
    title: note.title,
    summary: note.summary,
    folderUid: note.folderUid,
    folderName: note.folderName,
    wordCount: note.wordCount,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
  }
}

function mapNoteDetail(note: MockNoteRecord): NoteDetail {
  return {
    ...mapNoteListItem(note),
    contentJson: note.contentJson,
    contentHtml: note.contentHtml,
    contentText: note.contentText,
  }
}

function buildFolderTree(db: MockDb): FolderNode[] {
  const folders = activeFolders(db)
  const noteCounts = activeNotes(db).reduce<Record<string, number>>((acc, note) => {
    if (note.folderUid) {
      acc[note.folderUid] = (acc[note.folderUid] ?? 0) + 1
    }
    return acc
  }, {})

  const nodeMap = new Map<string, FolderNode>()
  for (const folder of folders) {
    nodeMap.set(folder.uid, {
      uid: folder.uid,
      name: folder.name,
      parentUid: folder.parentUid,
      sortOrder: folder.sortOrder,
      isExpanded: folder.isExpanded,
      noteCount: noteCounts[folder.uid] ?? 0,
      children: [],
    })
  }

  const roots: FolderNode[] = []
  for (const folder of folders.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))) {
    const node = nodeMap.get(folder.uid)
    if (!node) continue

    if (folder.parentUid && nodeMap.has(folder.parentUid)) {
      nodeMap.get(folder.parentUid)?.children.push(node)
    } else {
      roots.push(node)
    }
  }

  const accumulate = (node: FolderNode): number => {
    const childCount = node.children.reduce((sum, child) => sum + accumulate(child), 0)
    node.noteCount += childCount
    node.children.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
    return node.noteCount
  }

  roots.forEach(accumulate)
  return roots
}

function getDescendantFolderUids(tree: FolderNode[], targetUid: string): string[] {
  const result: string[] = []

  const walk = (nodes: FolderNode[]) => {
    for (const node of nodes) {
      if (node.uid === targetUid) {
        collect(node)
        return true
      }
      if (walk(node.children)) {
        return true
      }
    }
    return false
  }

  const collect = (node: FolderNode) => {
    result.push(node.uid)
    node.children.forEach(collect)
  }

  walk(tree)
  return result
}

function sortNotes(notes: MockNoteRecord[]) {
  return [...notes].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
}

export const mockApi: NoteFlowApi = {
  async login(payload) {
    return withLatency(() => {
      const db = readDb()
      if (payload.email !== 'demo@example.com' || payload.password !== 'noteflow123') {
        throw new Error('邮箱或密码错误')
      }
      return response({
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        expiresIn: 7200,
        user: db.me,
      })
    })
  },

  async register(payload) {
    return withLatency(() => {
      return response({
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        expiresIn: 7200,
        user: {
          uid: `usr_${crypto.randomUUID()}`,
          nickname: payload.nickname,
          avatarUrl: null,
        },
      })
    })
  },

  async getMe() {
    return withLatency(() => response(readDb().me))
  },

  async getSettings() {
    return withLatency(() => response(readDb().settings))
  },

  async updateSettings(payload) {
    return withLatency(() => {
      const db = readDb()
      db.settings = { ...db.settings, ...payload }
      writeDb(db)
      return response(db.settings)
    })
  },

  async setTheme(theme: Theme) {
    return this.updateSettings({ theme })
  },

  async getFoldersTree() {
    return withLatency(() => {
      const db = readDb()
      return response(buildFolderTree(db))
    })
  },

  async createFolder(payload) {
    return withLatency(() => {
      const db = readDb()
      const siblings = activeFolders(db).filter((item) => item.parentUid === payload.parentUid)
      const folder: MockFolderRecord = {
        uid: generateUid('fld'),
        userUid: db.me.uid,
        name: payload.name,
        parentUid: payload.parentUid,
        sortOrder: siblings.length ? Math.max(...siblings.map((item) => item.sortOrder)) + 10 : 10,
        isExpanded: true,
        createdAt: nowIso(),
        updatedAt: nowIso(),
        deletedAt: null,
      }
      db.folders.push(folder)
      writeDb(db)

      return response({
        uid: folder.uid,
        name: folder.name,
        parentUid: folder.parentUid,
        sortOrder: folder.sortOrder,
        isExpanded: folder.isExpanded,
        noteCount: 0,
        children: [],
      })
    })
  },

  async updateFolder(folderUid: string, payload: UpdateFolderPayload) {
    return withLatency(() => {
      const db = readDb()
      const folder = db.folders.find((item) => item.uid === folderUid && item.deletedAt === null)
      if (!folder) {
        throw new Error('Folder not found')
      }

      Object.assign(folder, payload, { updatedAt: nowIso() })
      writeDb(db)

      return response({
        uid: folder.uid,
        name: folder.name,
        parentUid: folder.parentUid,
        sortOrder: folder.sortOrder,
        isExpanded: folder.isExpanded,
        noteCount: activeNotes(db).filter((note) => note.folderUid === folder.uid).length,
        children: [],
      })
    })
  },

  async deleteFolder(folderUid: string) {
    return withLatency(() => {
      const db = readDb()
      const tree = buildFolderTree(db)
      const affected = new Set(getDescendantFolderUids(tree, folderUid))
      const deletedAt = nowIso()

      for (const folder of db.folders) {
        if (affected.has(folder.uid)) {
          folder.deletedAt = deletedAt
          folder.updatedAt = deletedAt
        }
      }

      for (const note of db.notes) {
        if (note.folderUid && affected.has(note.folderUid)) {
          note.folderUid = null
          note.folderName = null
          note.updatedAt = deletedAt
        }
      }

      writeDb(db)
      return response({ success: true as const })
    })
  },

  async listNotes(query: NoteQuery) {
    return withLatency(() => {
      const db = readDb()
      const tree = buildFolderTree(db)
      let notes = activeNotes(db)

      if (query.folderUid) {
        const folderUids = query.includeDescendants === false
          ? [query.folderUid]
          : getDescendantFolderUids(tree, query.folderUid)
        notes = notes.filter((note) => note.folderUid && folderUids.includes(note.folderUid))
      }

      if (query.keyword) {
        const keyword = query.keyword.trim().toLowerCase()
        notes = notes.filter((note) =>
          [note.title, note.summary ?? '', note.contentText ?? '']
            .join(' ')
            .toLowerCase()
            .includes(keyword)
        )
      }

      return response(sortNotes(notes).map(mapNoteListItem))
    })
  },

  async getNote(noteUid: string) {
    return withLatency(() => {
      const db = readDb()
      const note = activeNotes(db).find((item) => item.uid === noteUid)
      if (!note) {
        throw new Error('Note not found')
      }
      return response(mapNoteDetail(note))
    })
  },

  async createNote(payload) {
    return withLatency(() => {
      const db = readDb()
      const folderName =
        activeFolders(db).find((folder) => folder.uid === payload.folderUid)?.name ?? null
      const createdAt = nowIso()
      const note: MockNoteRecord = {
        uid: generateUid('note'),
        userUid: db.me.uid,
        title: payload.title,
        summary: null,
        folderUid: payload.folderUid,
        folderName,
        contentJson: null,
        contentHtml: '',
        contentText: '',
        wordCount: 0,
        createdAt,
        updatedAt: createdAt,
        deletedAt: null,
      }
      db.notes.push(note)
      writeDb(db)
      return response(mapNoteDetail(note))
    })
  },

  async updateNote(noteUid: string, payload: UpdateNotePayload) {
    return withLatency(() => {
      const db = readDb()
      const note = activeNotes(db).find((item) => item.uid === noteUid)
      if (!note) {
        throw new Error('Note not found')
      }

      if (payload.title !== undefined) {
        note.title = payload.title
      }

      if (payload.folderUid !== undefined) {
        note.folderUid = payload.folderUid
        note.folderName =
          activeFolders(db).find((folder) => folder.uid === payload.folderUid)?.name ?? null
      }

      note.updatedAt = nowIso()
      writeDb(db)
      return response(mapNoteDetail(note))
    })
  },

  async saveNoteContent(noteUid: string, payload: SaveNoteContentPayload) {
    return withLatency(() => {
      const db = readDb()
      const note = activeNotes(db).find((item) => item.uid === noteUid)
      if (!note) {
        throw new Error('Note not found')
      }

      note.title = payload.title
      note.contentJson = payload.contentJson
      note.contentHtml = payload.contentHtml
      note.contentText = payload.contentText
      note.summary = buildSummary(payload.contentText ?? '')
      note.wordCount = payload.wordCount
      note.updatedAt = nowIso()

      writeDb(db)
      return response(mapNoteDetail(note))
    })
  },

  async deleteNote(noteUid: string) {
    return withLatency(() => {
      const db = readDb()
      const note = db.notes.find((item) => item.uid === noteUid)
      if (note) {
        note.deletedAt = nowIso()
        note.updatedAt = nowIso()
      }
      writeDb(db)
      return response({ success: true as const })
    })
  },
}
