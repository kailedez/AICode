import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { DatabaseSchema } from './types'
import { createUid, nowIso, stripHtml, summarize } from './utils'

function createSeed(): DatabaseSchema {
  const createdAt = nowIso()
  const userUid = 'usr_demo'
  const productFolderUid = createUid('fld')
  const researchFolderUid = createUid('fld')
  const sprintFolderUid = createUid('fld')
  const captureFolderUid = createUid('fld')

  const noteOneHtml =
    '<h1>NoteFlow 迭代方向</h1><p>围绕目录组织、自动保存和在线同步建立一致体验。</p><ul><li><p>明确 API 数据结构</p></li><li><p>建立保存状态提示</p></li><li><p>重做信息层级</p></li></ul>'
  const noteTwoHtml =
    '<h2>竞品观察</h2><p>优秀笔记产品通常把搜索、收藏、最近更新放在第一屏可见范围内。</p><blockquote><p>信息架构比视觉细节更先决定专业感。</p></blockquote>'
  const noteThreeHtml =
    '<p>今天整理了新的编辑器交互：</p><ul data-type="taskList"><li data-type="taskItem" data-checked="true"><label><input type="checkbox" checked="checked"><span></span></label><div><p>标题独立保存</p></div></li><li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>补充历史版本入口</p></div></li></ul>'

  const noteOneText = stripHtml(noteOneHtml)
  const noteTwoText = stripHtml(noteTwoHtml)
  const noteThreeText = stripHtml(noteThreeHtml)

  return {
    users: [
      {
        id: 1,
        uid: userUid,
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
        defaultFolderUid: captureFolderUid,
        editorPreferences: null,
        createdAt,
        updatedAt: createdAt,
      },
    ],
    folders: [
      {
        id: 1,
        uid: productFolderUid,
        userId: 1,
        parentUid: null,
        name: '产品设计',
        sortOrder: 10,
        isExpanded: true,
        createdAt,
        updatedAt: createdAt,
        deletedAt: null,
      },
      {
        id: 2,
        uid: researchFolderUid,
        userId: 1,
        parentUid: productFolderUid,
        name: '竞品研究',
        sortOrder: 20,
        isExpanded: true,
        createdAt,
        updatedAt: createdAt,
        deletedAt: null,
      },
      {
        id: 3,
        uid: sprintFolderUid,
        userId: 1,
        parentUid: productFolderUid,
        name: 'Sprint 规划',
        sortOrder: 30,
        isExpanded: true,
        createdAt,
        updatedAt: createdAt,
        deletedAt: null,
      },
      {
        id: 4,
        uid: captureFolderUid,
        userId: 1,
        parentUid: null,
        name: '灵感速记',
        sortOrder: 40,
        isExpanded: true,
        createdAt,
        updatedAt: createdAt,
        deletedAt: null,
      },
    ],
    notes: [
      {
        id: 1,
        uid: createUid('note'),
        userId: 1,
        folderUid: sprintFolderUid,
        title: 'NoteFlow 迭代方向',
        summary: summarize(noteOneText),
        contentJson: null,
        contentHtml: noteOneHtml,
        contentText: noteOneText,
        wordCount: noteOneText.length,
        status: 1,
        lastEditedAt: createdAt,
        createdAt,
        updatedAt: createdAt,
        deletedAt: null,
      },
      {
        id: 2,
        uid: createUid('note'),
        userId: 1,
        folderUid: researchFolderUid,
        title: '竞品观察',
        summary: summarize(noteTwoText),
        contentJson: null,
        contentHtml: noteTwoHtml,
        contentText: noteTwoText,
        wordCount: noteTwoText.length,
        status: 1,
        lastEditedAt: createdAt,
        createdAt,
        updatedAt: createdAt,
        deletedAt: null,
      },
      {
        id: 3,
        uid: createUid('note'),
        userId: 1,
        folderUid: captureFolderUid,
        title: '今日速记',
        summary: summarize(noteThreeText),
        contentJson: null,
        contentHtml: noteThreeHtml,
        contentText: noteThreeText,
        wordCount: noteThreeText.length,
        status: 1,
        lastEditedAt: createdAt,
        createdAt,
        updatedAt: createdAt,
        deletedAt: null,
      },
    ],
    noteRevisions: [],
    operationLogs: [],
  }
}

function normalizeDatabase(data: DatabaseSchema): DatabaseSchema {
  const next = structuredClone(data)
  const demoUser = next.users.find((item) => item.email === 'demo@example.com')
  if (demoUser && !demoUser.passwordHash) {
    demoUser.passwordHash = 'noteflow123'
  }
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
