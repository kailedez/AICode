export type Theme = 'light' | 'dark' | 'system'

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export interface UserProfile {
  uid: string
  nickname: string
  avatarUrl: string | null
}

export interface UserSettings {
  theme: Theme
  defaultFolderUid: string | null
}

export interface AuthSession {
  accessToken: string
  refreshToken: string
  expiresIn: number
  user: UserProfile
}

export interface LoginPayload {
  email: string
  password: string
}

export interface RegisterPayload {
  email: string
  password: string
  nickname: string
}

export interface FolderNode {
  uid: string
  name: string
  parentUid: string | null
  sortOrder: number
  isExpanded: boolean
  noteCount: number
  children: FolderNode[]
}

export interface NoteListItem {
  uid: string
  title: string
  summary: string | null
  folderUid: string | null
  folderName: string | null
  wordCount: number
  createdAt: string
  updatedAt: string
}

export interface NoteDetail extends NoteListItem {
  contentJson: Record<string, unknown> | null
  contentHtml: string | null
  contentText: string | null
}

export interface ApiResponse<T> {
  code: number
  message: string
  data: T
  requestId: string
}

export interface NoteQuery {
  folderUid?: string | null
  includeDescendants?: boolean
  keyword?: string
}
