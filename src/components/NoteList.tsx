import { Clock3, FileText, FolderOpen, LoaderCircle, Trash2 } from 'lucide-react'
import { useAppStore } from '../store/appStore'
import type { FolderNode } from '../types'

function formatRelativeTime(dateString: string) {
  const diff = Date.now() - new Date(dateString).getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return '刚刚更新'
  if (minutes < 60) return `${minutes} 分钟前`
  if (hours < 24) return `${hours} 小时前`
  if (days < 7) return `${days} 天前`

  return new Date(dateString).toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
  })
}

function flattenFolders(nodes: FolderNode[]): FolderNode[] {
  return nodes.flatMap((folder) => [folder, ...flattenFolders(folder.children)])
}

export function NoteList() {
  const folders = useAppStore((state) => state.folders)
  const notes = useAppStore((state) => state.notes)
  const selectedFolderUid = useAppStore((state) => state.selectedFolderUid)
  const activeNoteUid = useAppStore((state) => state.activeNoteUid)
  const selectNote = useAppStore((state) => state.selectNote)
  const deleteNote = useAppStore((state) => state.deleteNote)
  const isNotesLoading = useAppStore((state) => state.isNotesLoading)
  const searchQuery = useAppStore((state) => state.searchQuery)

  const currentFolderName =
    selectedFolderUid === null
      ? '全部笔记'
      : flattenFolders(folders).find((folder) => folder.uid === selectedFolderUid)?.name ?? '当前目录'

  return (
    <section className="flex w-[340px] shrink-0 flex-col rounded-[32px] border border-white/60 bg-white/75 p-3 shadow-[0_24px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/75">
      <div className="border-b border-slate-200/70 px-3 pb-4 pt-2 dark:border-white/10">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            <FolderOpen className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
              {currentFolderName}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {searchQuery ? `关键词 “${searchQuery}” 的结果` : '按更新时间排序'}
            </p>
          </div>
          <div className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-300">
            {notes.length}
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-1 pt-3">
        {isNotesLoading ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-500 dark:text-slate-400">
            <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
            正在加载笔记列表...
          </div>
        ) : notes.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center rounded-[28px] border border-dashed border-slate-200 bg-slate-50/70 px-6 text-center dark:border-white/10 dark:bg-slate-950/40">
            <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-slate-900 text-white dark:bg-sky-400 dark:text-slate-950">
              <FileText className="h-5 w-5" />
            </div>
            <p className="mt-4 text-base font-semibold text-slate-900 dark:text-white">
              {searchQuery ? '没有找到匹配的笔记' : '还没有内容'}
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
              {searchQuery ? '换一个关键词试试，或者回到全部笔记查看。' : '从右上角新建一篇笔记，开始整理你的思路。'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {notes.map((note) => {
              const active = activeNoteUid === note.uid

              return (
                <article
                  key={note.uid}
                  className={`group cursor-pointer rounded-[24px] border p-4 transition ${
                    active
                      ? 'border-slate-900 bg-slate-900 text-white shadow-xl shadow-slate-900/10 dark:border-sky-400 dark:bg-sky-400 dark:text-slate-950'
                      : 'border-slate-200/80 bg-white/80 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg dark:border-white/10 dark:bg-slate-950/40 dark:hover:border-white/20'
                  }`}
                  onClick={() => void selectNote(note.uid)}
                >
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl ${
                      active
                        ? 'bg-white/15 dark:bg-slate-950/15'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                    }`}>
                      <FileText className="h-4 w-4" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start gap-2">
                        <div className="min-w-0 flex-1">
                          <h3 className="truncate text-sm font-semibold">{note.title || '未命名笔记'}</h3>
                          <p className={`mt-2 line-clamp-2 text-xs leading-5 ${
                            active ? 'text-white/80 dark:text-slate-950/80' : 'text-slate-500 dark:text-slate-400'
                          }`}>
                            {note.summary || '这篇笔记还没有摘要，打开后开始写点内容吧。'}
                          </p>
                        </div>

                        <button
                          onClick={(event) => {
                            event.stopPropagation()
                            void deleteNote(note.uid)
                          }}
                          className={`rounded-xl p-2 opacity-0 transition group-hover:opacity-100 ${
                            active
                              ? 'hover:bg-white/10 dark:hover:bg-slate-950/10'
                              : 'hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10 dark:hover:text-rose-300'
                          }`}
                          title="删除笔记"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <div className={`mt-3 flex flex-wrap items-center gap-2 text-[11px] ${
                        active ? 'text-white/75 dark:text-slate-950/75' : 'text-slate-500 dark:text-slate-400'
                      }`}>
                        <span className={`rounded-full px-2 py-1 ${
                          active ? 'bg-white/12 dark:bg-slate-950/12' : 'bg-slate-100 dark:bg-slate-800'
                        }`}>
                          {note.folderName ?? '未分类'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock3 className="h-3 w-3" />
                          {formatRelativeTime(note.updatedAt)}
                        </span>
                        <span>{note.wordCount} 字</span>
                      </div>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}
