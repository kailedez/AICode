import type { DatabaseService } from '../../database'
import { buildFolderTree, collectFolderUids } from '../shared/helpers'
import { HttpError } from '../shared/errors'
import { createFoldersRepository } from './repository'

function toFolderNode(folder: {
  uid: string
  name: string
  parentUid: string | null
  sortOrder: number
  isExpanded: boolean
}, noteCount = 0) {
  return {
    uid: folder.uid,
    name: folder.name,
    parentUid: folder.parentUid,
    sortOrder: folder.sortOrder,
    isExpanded: folder.isExpanded,
    noteCount,
    children: [],
  }
}

export function createFoldersService(store: DatabaseService) {
  const repository = createFoldersRepository(store)

  return {
    async getTree(userUid: string) {
      const user = await repository.findActiveUserByUid(userUid)
      if (!user) {
        throw new HttpError(404, 40401, '鐢ㄦ埛涓嶅瓨鍦�')
      }

      const graph = await repository.getFolderGraph(user.id)
      return buildFolderTree(graph.folders, graph.notes, user.id)
    },

    async createFolder(userUid: string, input: { name: string; parentUid: string | null }) {
      const user = await repository.findActiveUserByUid(userUid)
      if (!user) {
        throw new HttpError(404, 40401, '鐢ㄦ埛涓嶅瓨鍦�')
      }

      const folder = await repository.createFolder(user.id, input)
      return toFolderNode(folder)
    },

    async updateFolder(userUid: string, folderUid: string, input: { name?: string; sortOrder?: number; isExpanded?: boolean }) {
      const user = await repository.findActiveUserByUid(userUid)
      if (!user) {
        throw new HttpError(404, 40401, '鐢ㄦ埛涓嶅瓨鍦�')
      }

      const result = await repository.updateFolder(user.id, folderUid, input)
      if (!result) {
        throw new HttpError(404, 40401, '鐩綍涓嶅瓨鍦�')
      }

      return toFolderNode(result.folder, result.noteCount)
    },

    async deleteFolder(userUid: string, folderUid: string) {
      const user = await repository.findActiveUserByUid(userUid)
      if (!user) {
        throw new HttpError(404, 40401, '鐢ㄦ埛涓嶅瓨鍦�')
      }

      const graph = await repository.getFolderGraph(user.id)
      const folderUids = collectFolderUids(buildFolderTree(graph.folders, graph.notes, user.id), folderUid)
      if (folderUids.length === 0) {
        throw new HttpError(404, 40401, '鐩綍涓嶅瓨鍦�')
      }

      await repository.softDeleteFolders(user.id, folderUids)
      return { success: true as const }
    },
  }
}
