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
    '<h1>NoteFlow 杩唬鏂瑰悜</h1><p>鍥寸粫鐩綍缁勭粐銆佽嚜鍔ㄤ繚瀛樺拰鍦ㄧ嚎鍚屾寤虹珛涓€鑷翠綋楠屻€?/p><ul><li><p>鏄庣‘ API 鏁版嵁缁撴瀯</p></li><li><p>寤虹珛淇濆瓨鐘舵€佹彁绀?/p></li><li><p>閲嶅仛淇℃伅灞傜骇</p></li></ul>'
  const noteTwoHtml =
    '<h2>绔炲搧瑙傚療</h2><p>浼樼绗旇浜у搧閫氬父鎶婃悳绱€佹敹钘忋€佹渶杩戞洿鏂版斁鍦ㄧ涓€灞忓彲瑙佽寖鍥村唴銆?/p><blockquote><p>淇℃伅鏋舵瀯姣旇瑙夌粏鑺傛洿鍏堝喅瀹氫笓涓氭劅銆?/p></blockquote>'
  const noteThreeHtml =
    '<p>浠婂ぉ鏁寸悊浜嗘柊鐨勭紪杈戝櫒浜や簰锛?/p><ul data-type="taskList"><li data-type="taskItem" data-checked="true"><label><input type="checkbox" checked="checked"><span></span></label><div><p>鏍囬鐙珛淇濆瓨</p></div></li><li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>琛ュ厖鍘嗗彶鐗堟湰鍏ュ彛</p></div></li></ul>'

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
        ancestorPath: null,
        name: '浜у搧璁捐',
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
        ancestorPath: productFolderUid,
        name: '绔炲搧鐮旂┒',
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
        ancestorPath: productFolderUid,
        name: 'Sprint 瑙勫垝',
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
        ancestorPath: null,
        name: '鐏垫劅閫熻',
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
        title: 'NoteFlow 杩唬鏂瑰悜',
        summary: summarize(noteOneText),
        contentJson: null,
        contentHtml: noteOneHtml,
        contentText: noteOneText,
        wordCount: noteOneText.length,
        status: 1,
        revisionNo: 0,
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
        title: '绔炲搧瑙傚療',
        summary: summarize(noteTwoText),
        contentJson: null,
        contentHtml: noteTwoHtml,
        contentText: noteTwoText,
        wordCount: noteTwoText.length,
        status: 1,
        revisionNo: 0,
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
        title: '浠婃棩閫熻',
        summary: summarize(noteThreeText),
        contentJson: null,
        contentHtml: noteThreeHtml,
        contentText: noteThreeText,
        wordCount: noteThreeText.length,
        status: 1,
        revisionNo: 0,
        lastEditedAt: createdAt,
        createdAt,
        updatedAt: createdAt,
        deletedAt: null,
      },
    ],
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
