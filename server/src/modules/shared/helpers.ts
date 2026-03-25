import type { FolderRecord, FolderTreeNode, NoteRecord, UserRecord, UserSettingRecord } from '../../types'

type FolderLike = Pick<FolderRecord, 'uid' | 'userId' | 'parentUid' | 'name' | 'sortOrder' | 'isExpanded'> & {
  deletedAt: string | Date | null
}

type NoteLike = Pick<NoteRecord, 'uid' | 'userId' | 'folderUid'> & {
  deletedAt: string | Date | null
  status: number
}

export function requireCurrentUser(users: UserRecord[]) {
  const user = users.find((item) => item.deletedAt === null && item.status === 1)
  if (!user) {
    throw new Error('No active user found')
  }
  return user
}

export function requireUserByUid(users: UserRecord[], userUid: string) {
  const user = users.find((item) => item.uid === userUid && item.deletedAt === null && item.status === 1)
  if (!user) {
    throw new Error('No active user found')
  }
  return user
}

export function requireUserSettings(settings: UserSettingRecord[], userId: number) {
  const setting = settings.find((item) => item.userId === userId)
  if (!setting) {
    throw new Error('No user settings found')
  }
  return setting
}

export function activeFolders<T extends FolderLike>(folders: T[], userId: number) {
  return folders.filter((item) => item.userId === userId && item.deletedAt === null)
}

export function activeNotes<T extends NoteLike>(notes: T[], userId: number) {
  return notes.filter((item) => item.userId === userId && item.deletedAt === null && item.status !== 3)
}

export function buildFolderTree<TFolder extends FolderLike, TNote extends NoteLike>(
  folders: TFolder[],
  notes: TNote[],
  userId: number,
): FolderTreeNode[] {
  const userFolders = activeFolders(folders, userId)
  const userNotes = activeNotes(notes, userId)
  const directCounts = userNotes.reduce<Record<string, number>>((acc, note) => {
    if (note.folderUid) {
      acc[note.folderUid] = (acc[note.folderUid] ?? 0) + 1
    }
    return acc
  }, {})

  const nodeMap = new Map<string, FolderTreeNode>()
  for (const folder of userFolders) {
    nodeMap.set(folder.uid, {
      uid: folder.uid,
      name: folder.name,
      parentUid: folder.parentUid,
      sortOrder: folder.sortOrder,
      isExpanded: folder.isExpanded,
      noteCount: directCounts[folder.uid] ?? 0,
      children: [],
    })
  }

  const roots: FolderTreeNode[] = []
  for (const folder of [...userFolders].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))) {
    const node = nodeMap.get(folder.uid)
    if (!node) continue
    if (folder.parentUid && nodeMap.has(folder.parentUid)) {
      nodeMap.get(folder.parentUid)?.children.push(node)
    } else {
      roots.push(node)
    }
  }

  const sumChildren = (node: FolderTreeNode): number => {
    const nestedCount = node.children.reduce((sum, child) => sum + sumChildren(child), 0)
    node.noteCount += nestedCount
    node.children.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
    return node.noteCount
  }

  roots.forEach(sumChildren)
  return roots
}

export function collectFolderUids(tree: FolderTreeNode[], targetUid: string): string[] {
  const result: string[] = []

  const collect = (node: FolderTreeNode) => {
    result.push(node.uid)
    node.children.forEach(collect)
  }

  const walk = (nodes: FolderTreeNode[]): boolean => {
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

  walk(tree)
  return result
}
