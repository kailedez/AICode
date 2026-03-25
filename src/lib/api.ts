import { clearAccessToken, getAccessToken } from './auth'
import type {
  ApiResponse,
  AuthSession,
  FolderNode,
  LoginPayload,
  NoteDetail,
  NoteListItem,
  NoteQuery,
  RegisterPayload,
  Theme,
  UserProfile,
  UserSettings,
} from '../types'

export interface SaveNoteContentPayload {
  title: string
  contentJson: Record<string, unknown> | null
  contentHtml: string | null
  contentText: string | null
  wordCount: number
  clientUpdatedAt: string
}

export interface UpdateFolderPayload {
  name?: string
  sortOrder?: number
  isExpanded?: boolean
}

export interface UpdateNotePayload {
  title?: string
  folderUid?: string | null
}

export interface NoteFlowApi {
  login(payload: LoginPayload): Promise<ApiResponse<AuthSession>>
  register(payload: RegisterPayload): Promise<ApiResponse<AuthSession>>
  getMe(): Promise<ApiResponse<UserProfile>>
  getSettings(): Promise<ApiResponse<UserSettings>>
  updateSettings(payload: Partial<UserSettings>): Promise<ApiResponse<UserSettings>>
  getFoldersTree(): Promise<ApiResponse<FolderNode[]>>
  createFolder(payload: { name: string; parentUid: string | null }): Promise<ApiResponse<FolderNode>>
  updateFolder(folderUid: string, payload: UpdateFolderPayload): Promise<ApiResponse<FolderNode>>
  deleteFolder(folderUid: string): Promise<ApiResponse<{ success: true }>>
  listNotes(query: NoteQuery): Promise<ApiResponse<NoteListItem[]>>
  getNote(noteUid: string): Promise<ApiResponse<NoteDetail>>
  createNote(payload: { title: string; folderUid: string | null }): Promise<ApiResponse<NoteDetail>>
  updateNote(noteUid: string, payload: UpdateNotePayload): Promise<ApiResponse<NoteDetail>>
  saveNoteContent(noteUid: string, payload: SaveNoteContentPayload): Promise<ApiResponse<NoteDetail>>
  deleteNote(noteUid: string): Promise<ApiResponse<{ success: true }>>
  setTheme(theme: Theme): Promise<ApiResponse<UserSettings>>
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api/v1'

async function request<T>(path: string, init?: RequestInit): Promise<ApiResponse<T>> {
  const token = getAccessToken()

  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init?.headers ?? {}),
      },
      ...init,
    })
  } catch {
    throw new Error('无法连接后端服务，请确认后端接口已启动。')
  }

  const payload = (await response.json()) as ApiResponse<T>
  if (response.status === 401) {
    clearAccessToken()
  }
  if (!response.ok || payload.code !== 0) {
    throw new Error(payload.message || 'Request failed')
  }
  return payload
}

export const apiClient: NoteFlowApi = {
  login(payload) {
    return request<AuthSession>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
  register(payload) {
    return request<AuthSession>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
  getMe() {
    return request<UserProfile>('/me')
  },
  getSettings() {
    return request<UserSettings>('/me/settings')
  },
  updateSettings(payload) {
    return request<UserSettings>('/me/settings', {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  },
  setTheme(theme) {
    return this.updateSettings({ theme })
  },
  getFoldersTree() {
    return request<FolderNode[]>('/folders/tree')
  },
  createFolder(payload) {
    return request<FolderNode>('/folders', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
  updateFolder(folderUid, payload) {
    return request<FolderNode>(`/folders/${folderUid}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  },
  deleteFolder(folderUid) {
    return request<{ success: true }>(`/folders/${folderUid}`, {
      method: 'DELETE',
    })
  },
  listNotes(query) {
    const params = new URLSearchParams()
    if (query.folderUid) params.set('folderUid', query.folderUid)
    if (query.includeDescendants !== undefined) {
      params.set('includeDescendants', String(query.includeDescendants))
    }
    if (query.keyword) params.set('keyword', query.keyword)

    const suffix = params.toString() ? `?${params.toString()}` : ''
    return request<NoteListItem[]>(`/notes${suffix}`)
  },
  getNote(noteUid) {
    return request<NoteDetail>(`/notes/${noteUid}`)
  },
  createNote(payload) {
    return request<NoteDetail>('/notes', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
  updateNote(noteUid, payload) {
    return request<NoteDetail>(`/notes/${noteUid}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  },
  saveNoteContent(noteUid, payload) {
    return request<NoteDetail>(`/notes/${noteUid}/content`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  },
  deleteNote(noteUid) {
    return request<{ success: true }>(`/notes/${noteUid}`, {
      method: 'DELETE',
    })
  },
}
