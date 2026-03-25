import { useMemo, useState } from 'react'
import {
  ChevronDown,
  ChevronRight,
  Edit3,
  FilePlus2,
  Folder,
  FolderOpen,
  Plus,
  Trash2,
} from 'lucide-react'
import { useAppStore } from '../store/appStore'
import type { FolderNode } from '../types'

function countAllFolders(nodes: FolderNode[]): number {
  return nodes.reduce((sum, node) => sum + 1 + countAllFolders(node.children), 0)
}

export function Sidebar() {
  const sidebarOpen = useAppStore((state) => state.sidebarOpen)
  const folders = useAppStore((state) => state.folders)
  const notes = useAppStore((state) => state.notes)
  const selectedFolderUid = useAppStore((state) => state.selectedFolderUid)
  const selectFolder = useAppStore((state) => state.selectFolder)
  const createFolder = useAppStore((state) => state.createFolder)
  const renameFolder = useAppStore((state) => state.renameFolder)
  const deleteFolder = useAppStore((state) => state.deleteFolder)
  const toggleFolderExpanded = useAppStore((state) => state.toggleFolderExpanded)
  const createNote = useAppStore((state) => state.createNote)
  const [creatingParentUid, setCreatingParentUid] = useState<string | null | '__root__'>(null)
  const [draftName, setDraftName] = useState('')
  const [editingUid, setEditingUid] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')

  const folderCount = useMemo(() => countAllFolders(folders), [folders])

  if (!sidebarOpen) {
    return null
  }

  const commitCreate = async (parentUid: string | null) => {
    const name = draftName.trim()
    if (!name) return
    await createFolder(name, parentUid)
    setDraftName('')
    setCreatingParentUid(null)
  }

  const commitEdit = async () => {
    const name = editingName.trim()
    if (!editingUid || !name) {
      setEditingUid(null)
      setEditingName('')
      return
    }

    await renameFolder(editingUid, name)
    setEditingUid(null)
    setEditingName('')
  }

  const renderFolder = (folder: FolderNode, depth = 0) => {
    const isSelected = selectedFolderUid === folder.uid
    const isEditing = editingUid === folder.uid
    const hasChildren = folder.children.length > 0

    return (
      <div key={folder.uid}>
        <div
          className={`group flex items-center gap-2 rounded-2xl px-3 py-2 transition ${
            isSelected
              ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/10 dark:bg-sky-400 dark:text-slate-950'
              : 'text-slate-600 hover:bg-white hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-900/70 dark:hover:text-white'
          }`}
          style={{ marginLeft: `${depth * 14}px` }}
        >
          <button
            onClick={() => void toggleFolderExpanded(folder.uid)}
            className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            aria-label={folder.isExpanded ? '折叠目录' : '展开目录'}
          >
            {hasChildren ? (
              folder.isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
            ) : (
              <span className="block h-4 w-4" />
            )}
          </button>

          <button
            onClick={() => void selectFolder(folder.uid)}
            className="flex min-w-0 flex-1 items-center gap-2 text-left"
          >
            {folder.isExpanded && hasChildren ? (
              <FolderOpen className="h-4 w-4 flex-shrink-0 text-amber-500" />
            ) : (
              <Folder className="h-4 w-4 flex-shrink-0 text-amber-500" />
            )}

            {isEditing ? (
              <input
                value={editingName}
                onChange={(event) => setEditingName(event.target.value)}
                onBlur={() => void commitEdit()}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    void commitEdit()
                  }
                  if (event.key === 'Escape') {
                    setEditingUid(null)
                    setEditingName('')
                  }
                }}
                className="min-w-0 flex-1 rounded-xl border border-sky-300 bg-white px-2 py-1 text-sm text-slate-900 outline-none dark:border-sky-500/40 dark:bg-slate-950 dark:text-white"
                autoFocus
              />
            ) : (
              <>
                <span className="truncate text-sm font-medium">{folder.name}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] ${
                    isSelected
                      ? 'bg-white/15 text-white dark:bg-slate-950/20 dark:text-slate-950'
                      : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                  }`}
                >
                  {folder.noteCount}
                </span>
              </>
            )}
          </button>

          {!isEditing ? (
            <div className="hidden items-center gap-1 group-hover:flex">
              <button
                onClick={() => {
                  setCreatingParentUid(folder.uid)
                  setDraftName('')
                }}
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                title="新增子目录"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => void createNote(folder.uid)}
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                title="在此目录新建笔记"
              >
                <FilePlus2 className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => {
                  setEditingUid(folder.uid)
                  setEditingName(folder.name)
                }}
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                title="重命名"
              >
                <Edit3 className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => void deleteFolder(folder.uid)}
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10 dark:hover:text-rose-300"
                title="删除目录"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : null}
        </div>

        {creatingParentUid === folder.uid ? (
          <div className="px-3 py-2" style={{ marginLeft: `${(depth + 1) * 14 + 24}px` }}>
            <input
              value={draftName}
              onChange={(event) => setDraftName(event.target.value)}
              onBlur={() => {
                setCreatingParentUid(null)
                setDraftName('')
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  void commitCreate(folder.uid)
                }
                if (event.key === 'Escape') {
                  setCreatingParentUid(null)
                  setDraftName('')
                }
              }}
              placeholder="输入子目录名称"
              className="w-full rounded-2xl border border-sky-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none ring-0 dark:border-sky-500/30 dark:bg-slate-900 dark:text-white"
              autoFocus
            />
          </div>
        ) : null}

        {folder.isExpanded ? folder.children.map((child) => renderFolder(child, depth + 1)) : null}
      </div>
    )
  }

  return (
    <aside className="hidden w-[300px] shrink-0 border-r border-slate-200/70 bg-white/55 px-4 py-4 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/45 lg:flex lg:flex-col">
      <div className="rounded-[28px] border border-white/60 bg-white/75 p-4 shadow-[0_24px_60px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-slate-900/75">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">
          Workspace
        </p>
        <h2 className="mt-2 text-xl font-semibold text-slate-900 dark:text-white">
          个人知识库
        </h2>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-slate-100/80 px-3 py-3 dark:bg-slate-800/80">
            <p className="text-xs text-slate-500 dark:text-slate-400">笔记</p>
            <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">{notes.length}</p>
          </div>
          <div className="rounded-2xl bg-slate-100/80 px-3 py-3 dark:bg-slate-800/80">
            <p className="text-xs text-slate-500 dark:text-slate-400">目录</p>
            <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">{folderCount}</p>
          </div>
        </div>
      </div>

      <div className="mt-4 flex min-h-0 flex-1 flex-col rounded-[28px] border border-white/60 bg-white/75 p-3 shadow-[0_24px_60px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-slate-900/75">
        <div className="mb-3 flex items-center justify-between px-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">
              Folders
            </p>
            <p className="mt-1 text-sm font-medium text-slate-700 dark:text-slate-200">
              目录与笔记组织
            </p>
          </div>
          <button
            onClick={() => {
              setCreatingParentUid('__root__')
              setDraftName('')
            }}
            className="rounded-2xl border border-slate-200 bg-white p-2 text-slate-600 shadow-sm transition hover:border-sky-200 hover:text-sky-700 dark:border-white/10 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-sky-500/30 dark:hover:text-sky-200"
            title="新增根目录"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <button
          onClick={() => void selectFolder(null)}
          className={`mb-2 flex items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition ${
            selectedFolderUid === null
              ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/10 dark:bg-sky-400 dark:text-slate-950'
              : 'text-slate-600 hover:bg-white hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-900/70 dark:hover:text-white'
          }`}
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300">
            <Folder className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">全部笔记</p>
            <p className="text-xs opacity-70">包含所有目录下内容</p>
          </div>
          <span className="rounded-full bg-white/15 px-2 py-0.5 text-[11px] dark:bg-slate-950/15">
            {notes.length}
          </span>
        </button>

        {creatingParentUid === '__root__' ? (
          <div className="mb-2 px-2">
            <input
              value={draftName}
              onChange={(event) => setDraftName(event.target.value)}
              onBlur={() => {
                setCreatingParentUid(null)
                setDraftName('')
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  void commitCreate(null)
                }
                if (event.key === 'Escape') {
                  setCreatingParentUid(null)
                  setDraftName('')
                }
              }}
              placeholder="输入根目录名称"
              className="w-full rounded-2xl border border-sky-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none dark:border-sky-500/30 dark:bg-slate-950 dark:text-white"
              autoFocus
            />
          </div>
        ) : null}

        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          {folders.map((folder) => renderFolder(folder))}
        </div>
      </div>
    </aside>
  )
}
