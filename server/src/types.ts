export type Theme = 'light' | 'dark' | 'system'

export interface UserRecord {
  id: number
  uid: string
  email: string | null
  mobile: string | null
  passwordHash: string | null
  nickname: string
  avatarUrl: string | null
  status: 0 | 1
  lastLoginAt: string | null
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export interface UserSettingRecord {
  id: number
  userId: number
  theme: Theme
  defaultFolderUid: string | null
  editorPreferences: Record<string, unknown> | null
  createdAt: string
  updatedAt: string
}

export interface FolderRecord {
  id: number
  uid: string
  userId: number
  parentUid: string | null
  ancestorPath: string | null
  name: string
  sortOrder: number
  isExpanded: boolean
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export interface NoteRecord {
  id: number
  uid: string
  userId: number
  folderUid: string | null
  title: string
  summary: string | null
  contentJson: Record<string, unknown> | null
  contentHtml: string | null
  contentText: string | null
  wordCount: number
  status: 1 | 2 | 3
  revisionNo: number
  lastEditedAt: string
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export interface NoteRevisionRecord {
  id: number
  noteUid: string
  userId: number
  versionNo: number
  title: string
  contentJson: Record<string, unknown> | null
  contentHtml: string | null
  contentText: string | null
  createdAt: string
  createdBy: number
}

export interface UserSessionRecord {
  id: number
  sessionUid: string
  userId: number
  refreshTokenHash: string
  clientType: string
  deviceInfo: string | null
  ip: string | null
  expiredAt: string
  revokedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface OperationLogRecord {
  id: number
  userId: number
  targetType: 'note' | 'folder' | 'user'
  targetUid: string
  action: 'create' | 'update' | 'delete' | 'restore'
  requestId: string | null
  detail: Record<string, unknown> | null
  createdAt: string
}

export interface DatabaseSchema {
  users: UserRecord[]
  userSettings: UserSettingRecord[]
  folders: FolderRecord[]
  notes: NoteRecord[]
  noteRevisions: NoteRevisionRecord[]
  userSessions: UserSessionRecord[]
  operationLogs: OperationLogRecord[]
}

export interface FolderTreeNode {
  uid: string
  name: string
  parentUid: string | null
  sortOrder: number
  isExpanded: boolean
  noteCount: number
  children: FolderTreeNode[]
}
