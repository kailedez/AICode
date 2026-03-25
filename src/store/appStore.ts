import { create } from 'zustand'
import { clearAccessToken, getAccessToken, setAccessToken } from '../lib/auth'
import { apiClient } from '../lib/api'
import type {
  AuthSession,
  FolderNode,
  LoginPayload,
  NoteDetail,
  NoteListItem,
  RegisterPayload,
  SaveStatus,
  Theme,
  UserProfile,
  UserSettings,
} from '../types'

function flattenFolders(nodes: FolderNode[]): FolderNode[] {
  return nodes.flatMap((node) => [node, ...flattenFolders(node.children)])
}

function mergeNoteItem(notes: NoteListItem[], detail: NoteDetail): NoteListItem[] {
  const nextItem: NoteListItem = {
    uid: detail.uid,
    title: detail.title,
    summary: detail.summary,
    folderUid: detail.folderUid,
    folderName: detail.folderName,
    wordCount: detail.wordCount,
    createdAt: detail.createdAt,
    updatedAt: detail.updatedAt,
  }

  const exists = notes.some((item) => item.uid === detail.uid)
  const next = exists
    ? notes.map((item) => (item.uid === detail.uid ? nextItem : item))
    : [nextItem, ...notes]

  return [...next].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  )
}

function isDraftEqualToNote(
  note: NoteDetail,
  payload: {
    title: string
    contentJson: Record<string, unknown> | null
    contentHtml: string | null
    contentText: string | null
    wordCount: number
  }
) {
  return (
    note.title === payload.title &&
    note.contentHtml === payload.contentHtml &&
    note.contentText === payload.contentText &&
    note.wordCount === payload.wordCount
  )
}

function debugStore(event: string, payload?: Record<string, unknown>) {
  if (!import.meta.env.DEV) return
  const time = new Date().toLocaleTimeString('zh-CN', { hour12: false })
  console.log(`[noteflow-store ${time}] ${event}`, payload ?? {})
}

interface InitializePayload {
  me: UserProfile
  settings: UserSettings
  folders: FolderNode[]
  notes: NoteListItem[]
}

interface WorkspaceSnapshot {
  user: UserProfile
  settings: UserSettings
  folders: FolderNode[]
  notes: NoteListItem[]
  activeNoteUid: string | null
}

interface AppState {
  initialized: boolean
  bootstrapping: boolean
  isAuthenticated: boolean
  authLoading: boolean
  authError: string | null
  errorMessage: string | null
  user: UserProfile | null
  settings: UserSettings
  folders: FolderNode[]
  notes: NoteListItem[]
  activeNoteUid: string | null
  activeNote: NoteDetail | null
  selectedFolderUid: string | null
  sidebarOpen: boolean
  searchQuery: string
  isNotesLoading: boolean
  isNoteLoading: boolean
  saveStatus: SaveStatus
  lastSavedAt: string | null

  initialize: () => Promise<void>
  login: (payload: LoginPayload) => Promise<void>
  register: (payload: RegisterPayload) => Promise<void>
  logout: () => void
  clearError: () => void
  toggleSidebar: () => void
  setTheme: (theme: Theme) => Promise<void>
  setSearchQuery: (query: string) => Promise<void>
  selectFolder: (folderUid: string | null) => Promise<void>
  selectNote: (noteUid: string | null) => Promise<void>
  createNote: (folderUid?: string | null) => Promise<void>
  deleteNote: (noteUid: string) => Promise<void>
  saveActiveNote: (payload: {
    title: string
    contentJson: Record<string, unknown> | null
    contentHtml: string | null
    contentText: string | null
    wordCount: number
  }) => Promise<void>
  createFolder: (name: string, parentUid: string | null) => Promise<void>
  renameFolder: (folderUid: string, name: string) => Promise<void>
  deleteFolder: (folderUid: string) => Promise<void>
  toggleFolderExpanded: (folderUid: string) => Promise<void>
  refreshFolders: () => Promise<void>
  refreshNotes: () => Promise<void>
}

async function loadInitialData(): Promise<InitializePayload> {
  const [meRes, settingsRes, foldersRes, notesRes] = await Promise.all([
    apiClient.getMe(),
    apiClient.getSettings(),
    apiClient.getFoldersTree(),
    apiClient.listNotes({}),
  ])

  return {
    me: meRes.data,
    settings: settingsRes.data,
    folders: foldersRes.data,
    notes: notesRes.data,
  }
}

function getLoggedOutState() {
  return {
    isAuthenticated: false,
    user: null,
    folders: [],
    notes: [],
    activeNoteUid: null,
    activeNote: null,
    selectedFolderUid: null,
    searchQuery: '',
    lastSavedAt: null,
    saveStatus: 'idle' as SaveStatus,
  }
}

function buildWorkspaceSnapshot(payload: InitializePayload): WorkspaceSnapshot {
  const firstNote = payload.notes[0] ?? null
  return {
    user: payload.me,
    settings: payload.settings,
    folders: payload.folders,
    notes: payload.notes,
    activeNoteUid: firstNote?.uid ?? null,
  }
}

export const useAppStore = create<AppState>((set, get) => {
  let authTaskId = 0
  const beginAuthTask = () => {
    authTaskId += 1
    return authTaskId
  }
  const isActiveAuthTask = (taskId: number) => authTaskId === taskId

  const bootstrapWorkspace = async () => {
    debugStore('bootstrapWorkspace:start')
    const payload = await loadInitialData()
    const snapshot = buildWorkspaceSnapshot(payload)

    set({
      initialized: true,
      bootstrapping: false,
      isAuthenticated: true,
      user: snapshot.user,
      settings: snapshot.settings,
      folders: snapshot.folders,
      notes: snapshot.notes,
      activeNoteUid: snapshot.activeNoteUid,
      activeNote: null,
      authError: null,
    })

    if (snapshot.activeNoteUid) {
      debugStore('bootstrapWorkspace:select-first-note', { activeNoteUid: snapshot.activeNoteUid })
      await get().selectNote(snapshot.activeNoteUid)
    }
  }

  const handleAuthSuccess = async (session: AuthSession) => {
    const taskId = beginAuthTask()
    debugStore('auth:success', { userUid: session.user.uid, taskId })
    setAccessToken(session.accessToken)
    set({
      initialized: true,
      authLoading: true,
      bootstrapping: true,
      authError: null,
      errorMessage: null,
      isAuthenticated: true,
      user: session.user,
    })

    try {
      await bootstrapWorkspace()
      if (!isActiveAuthTask(taskId)) return
      set({ authLoading: false })
    } catch (error) {
      console.error(error)
      if (!isActiveAuthTask(taskId)) return
      set({
        bootstrapping: false,
        authLoading: false,
        isAuthenticated: true,
        authError: null,
        errorMessage:
          error instanceof Error
            ? `登录成功，但工作台初始化失败：${error.message}`
            : '登录成功，但工作台初始化失败，请刷新或重试。',
      })
    }
  }

  return {
    initialized: false,
    bootstrapping: false,
    isAuthenticated: false,
    authLoading: false,
    authError: null,
    errorMessage: null,
    user: null,
    settings: {
      theme: 'system',
      defaultFolderUid: null,
    },
    folders: [],
    notes: [],
    activeNoteUid: null,
    activeNote: null,
    selectedFolderUid: null,
    sidebarOpen: true,
    searchQuery: '',
    isNotesLoading: false,
    isNoteLoading: false,
    saveStatus: 'idle',
    lastSavedAt: null,

    async initialize() {
      if (get().bootstrapping) return
      const taskId = beginAuthTask()
      debugStore('initialize:start', { taskId, hasToken: Boolean(getAccessToken()) })
      set({ bootstrapping: true, errorMessage: null, authError: null })

      const token = getAccessToken()
      if (!token) {
        if (!isActiveAuthTask(taskId)) return
        set({
          initialized: true,
          bootstrapping: false,
          ...getLoggedOutState(),
        })
        return
      }

      try {
        await bootstrapWorkspace()
      } catch (error) {
        console.error(error)
        if (!isActiveAuthTask(taskId)) return
        const tokenStillExists = Boolean(getAccessToken())
        if (!tokenStillExists) {
          set({
            initialized: true,
            bootstrapping: false,
            authError: error instanceof Error ? error.message : '登录状态已失效，请重新登录。',
            ...getLoggedOutState(),
          })
          return
        }

        set({
          initialized: true,
          bootstrapping: false,
          isAuthenticated: true,
          authError: null,
          errorMessage:
            error instanceof Error
              ? `工作台初始化失败：${error.message}`
              : '工作台初始化失败，请刷新页面重试。',
        })
      }
    },

    async login(payload) {
      beginAuthTask()
      debugStore('login:start', { email: payload.email })
      set({ authLoading: true, authError: null, errorMessage: null })

      try {
        const response = await apiClient.login(payload)
        await handleAuthSuccess(response.data)
      } catch (error) {
        console.error(error)
        clearAccessToken()
        set({
          authLoading: false,
          isAuthenticated: false,
          authError: error instanceof Error ? error.message : '登录失败，请重试。',
        })
      }
    },

    async register(payload) {
      beginAuthTask()
      debugStore('register:start', { email: payload.email })
      set({ authLoading: true, authError: null, errorMessage: null })

      try {
        const response = await apiClient.register(payload)
        await handleAuthSuccess(response.data)
      } catch (error) {
        console.error(error)
        clearAccessToken()
        set({
          authLoading: false,
          isAuthenticated: false,
          authError: error instanceof Error ? error.message : '注册失败，请重试。',
        })
      }
    },

    logout() {
      beginAuthTask()
      debugStore('logout')
      clearAccessToken()
      set({
        ...getLoggedOutState(),
        initialized: true,
        bootstrapping: false,
        authLoading: false,
        authError: null,
        errorMessage: null,
        settings: {
          theme: 'system',
          defaultFolderUid: null,
        },
      })
    },

    clearError() {
      set({ errorMessage: null, authError: null })
    },

    toggleSidebar() {
      set((state) => ({ sidebarOpen: !state.sidebarOpen }))
    },

    async setTheme(theme) {
      const previous = get().settings
      set({ settings: { ...previous, theme } })

      try {
        const response = await apiClient.setTheme(theme)
        set({ settings: response.data })
      } catch (error) {
        console.error(error)
        set({ settings: previous, errorMessage: '主题设置保存失败。' })
      }
    },

    async setSearchQuery(query) {
      if (get().searchQuery === query) return
      debugStore('search:set', { query })
      set({ searchQuery: query })
      if (get().isAuthenticated) {
        await get().refreshNotes()
      }
    },

    async selectFolder(folderUid) {
      if (get().selectedFolderUid === folderUid) return
      debugStore('folder:select', { folderUid })
      set({ selectedFolderUid: folderUid })
      await get().refreshNotes()
    },

    async refreshFolders() {
      try {
        const response = await apiClient.getFoldersTree()
        set({ folders: response.data })
      } catch (error) {
        console.error(error)
        set({ errorMessage: error instanceof Error ? error.message : '目录加载失败。' })
      }
    },

    async refreshNotes() {
      const { selectedFolderUid, searchQuery, activeNoteUid } = get()
      debugStore('notes:refresh:start', { selectedFolderUid, searchQuery, activeNoteUid })
      set({ isNotesLoading: true, errorMessage: null })

      try {
        const response = await apiClient.listNotes({
          folderUid: selectedFolderUid,
          includeDescendants: true,
          keyword: searchQuery.trim() || undefined,
        })

        const notes = response.data
        const nextActiveUid = notes.some((note) => note.uid === activeNoteUid)
          ? activeNoteUid
          : notes[0]?.uid ?? null

        set({
          notes,
          activeNoteUid: nextActiveUid,
          isNotesLoading: false,
        })

        debugStore('notes:refresh:done', {
          count: notes.length,
          activeNoteUid,
          nextActiveUid,
        })

        if (nextActiveUid) {
          await get().selectNote(nextActiveUid)
        } else {
          set({ activeNote: null, isNoteLoading: false })
        }
      } catch (error) {
        console.error(error)
        set({
          isNotesLoading: false,
          errorMessage: error instanceof Error ? error.message : '笔记列表加载失败。',
        })
      }
    },

    async selectNote(noteUid) {
      if (!noteUid) {
        debugStore('note:clear-selection')
        set({ activeNoteUid: null, activeNote: null })
        return
      }

      if (get().activeNoteUid === noteUid && get().activeNote?.uid === noteUid && !get().isNoteLoading) {
        debugStore('note:select:skip-same', { noteUid })
        return
      }

      debugStore('note:select:start', { noteUid })
      set({ activeNoteUid: noteUid, isNoteLoading: true, errorMessage: null })

      try {
        const response = await apiClient.getNote(noteUid)
        debugStore('note:select:done', { noteUid, updatedAt: response.data.updatedAt })
        set({
          activeNote: response.data,
          isNoteLoading: false,
          lastSavedAt: response.data.updatedAt,
          saveStatus: 'idle',
        })
      } catch (error) {
        console.error(error)
        set({
          isNoteLoading: false,
          errorMessage: error instanceof Error ? error.message : '笔记详情加载失败。',
        })
      }
    },

    async createNote(folderUid = get().selectedFolderUid) {
      try {
        const response = await apiClient.createNote({
          title: '未命名笔记',
          folderUid: folderUid ?? null,
        })

        const detail = response.data
        set((state) => ({
          activeNoteUid: detail.uid,
          activeNote: detail,
          notes: mergeNoteItem(state.notes, detail),
        }))

        await get().refreshFolders()
        await get().refreshNotes()
        await get().selectNote(detail.uid)
      } catch (error) {
        console.error(error)
        set({ errorMessage: error instanceof Error ? error.message : '创建笔记失败。' })
      }
    },

    async deleteNote(noteUid) {
      try {
        await apiClient.deleteNote(noteUid)
        await get().refreshFolders()
        await get().refreshNotes()
      } catch (error) {
        console.error(error)
        set({ errorMessage: error instanceof Error ? error.message : '删除笔记失败。' })
      }
    },

    async saveActiveNote(payload) {
      const activeNote = get().activeNote
      if (!activeNote) return
      if (isDraftEqualToNote(activeNote, payload)) {
        debugStore('note:save:skip-same', { noteUid: activeNote.uid })
        return
      }

      debugStore('note:save:start', {
        noteUid: activeNote.uid,
        title: payload.title,
        wordCount: payload.wordCount,
      })

      const optimistic: NoteDetail = {
        ...activeNote,
        title: payload.title,
        contentJson: payload.contentJson,
        contentHtml: payload.contentHtml,
        contentText: payload.contentText,
        summary: payload.contentText?.slice(0, 120) ?? null,
        wordCount: payload.wordCount,
        updatedAt: new Date().toISOString(),
      }

      set((state) => ({
        activeNote: optimistic,
        notes: mergeNoteItem(state.notes, optimistic),
        saveStatus: 'saving',
        errorMessage: null,
      }))

      try {
        const response = await apiClient.saveNoteContent(activeNote.uid, {
          ...payload,
          clientUpdatedAt: optimistic.updatedAt,
        })

        debugStore('note:save:done', {
          noteUid: response.data.uid,
          updatedAt: response.data.updatedAt,
        })

        set((state) => ({
          activeNote: response.data,
          notes: mergeNoteItem(state.notes, response.data),
          saveStatus: 'saved',
          lastSavedAt: response.data.updatedAt,
        }))
      } catch (error) {
        console.error(error)
        set({
          saveStatus: 'error',
          errorMessage: error instanceof Error ? error.message : '自动保存失败，请重试。',
        })
      }
    },

    async createFolder(name, parentUid) {
      try {
        await apiClient.createFolder({ name, parentUid })
        await get().refreshFolders()
        await get().refreshNotes()
      } catch (error) {
        console.error(error)
        set({ errorMessage: error instanceof Error ? error.message : '创建目录失败。' })
      }
    },

    async renameFolder(folderUid, name) {
      try {
        await apiClient.updateFolder(folderUid, { name })
        await get().refreshFolders()
        await get().refreshNotes()
      } catch (error) {
        console.error(error)
        set({ errorMessage: error instanceof Error ? error.message : '重命名目录失败。' })
      }
    },

    async deleteFolder(folderUid) {
      const { selectedFolderUid, activeNote } = get()
      try {
        await apiClient.deleteFolder(folderUid)
        if (selectedFolderUid === folderUid) {
          set({ selectedFolderUid: null })
        }
        if (activeNote?.folderUid === folderUid) {
          set({ activeNote: { ...activeNote, folderUid: null, folderName: null } })
        }
        await get().refreshFolders()
        await get().refreshNotes()
      } catch (error) {
        console.error(error)
        set({ errorMessage: error instanceof Error ? error.message : '删除目录失败。' })
      }
    },

    async toggleFolderExpanded(folderUid) {
      const folder = flattenFolders(get().folders).find((item) => item.uid === folderUid)
      if (!folder) return

      try {
        await apiClient.updateFolder(folderUid, { isExpanded: !folder.isExpanded })
        await get().refreshFolders()
      } catch (error) {
        console.error(error)
        set({ errorMessage: error instanceof Error ? error.message : '目录状态更新失败。' })
      }
    },
  }
})
