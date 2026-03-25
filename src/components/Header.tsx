import { startTransition, useDeferredValue, useEffect, useState } from 'react'
import { LogOut, Menu, Monitor, Moon, Plus, Search, Sun } from 'lucide-react'
import { useAppStore } from '../store/appStore'
import type { SaveStatus } from '../types'

function SaveBadge({
  saveStatus,
  lastSavedAt,
}: {
  saveStatus: SaveStatus
  lastSavedAt: string | null
}) {
  const labelMap: Record<SaveStatus, string> = {
    idle: lastSavedAt
      ? `已同步 ${new Date(lastSavedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`
      : '已就绪',
    saving: '正在保存...',
    saved: lastSavedAt
      ? `已保存 ${new Date(lastSavedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`
      : '已保存',
    error: '保存失败',
  }

  const toneMap: Record<SaveStatus, string> = {
    idle: 'border-slate-200/80 bg-white/70 text-slate-500 dark:border-white/10 dark:bg-slate-900/70 dark:text-slate-300',
    saving: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-200',
    saved: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200',
    error: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200',
  }

  return (
    <div className={`hidden rounded-full border px-3 py-1 text-xs font-medium lg:block ${toneMap[saveStatus]}`}>
      {labelMap[saveStatus]}
    </div>
  )
}

export function Header() {
  const user = useAppStore((state) => state.user)
  const searchQuery = useAppStore((state) => state.searchQuery)
  const toggleSidebar = useAppStore((state) => state.toggleSidebar)
  const settings = useAppStore((state) => state.settings)
  const setTheme = useAppStore((state) => state.setTheme)
  const createNote = useAppStore((state) => state.createNote)
  const setSearchQuery = useAppStore((state) => state.setSearchQuery)
  const saveStatus = useAppStore((state) => state.saveStatus)
  const lastSavedAt = useAppStore((state) => state.lastSavedAt)
  const logout = useAppStore((state) => state.logout)
  const [localQuery, setLocalQuery] = useState(searchQuery)
  const deferredQuery = useDeferredValue(localQuery)

  useEffect(() => {
    setLocalQuery(searchQuery)
  }, [searchQuery])

  useEffect(() => {
    if (deferredQuery === searchQuery) return
    startTransition(() => {
      void setSearchQuery(deferredQuery)
    })
  }, [deferredQuery, searchQuery, setSearchQuery])

  return (
    <header className="border-b border-slate-200/70 bg-white/65 px-4 py-3 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/55">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={toggleSidebar}
            className="rounded-2xl border border-slate-200/80 bg-white/85 p-2.5 text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:border-sky-200 hover:text-sky-700 dark:border-white/10 dark:bg-slate-900/70 dark:text-slate-300 dark:hover:border-sky-500/30 dark:hover:text-sky-200"
            aria-label="切换侧边栏"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 via-cyan-500 to-emerald-500 text-sm font-bold text-white shadow-lg shadow-sky-500/20">
              N
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-white">NoteFlow</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">在线笔记工作台</p>
            </div>
          </div>
        </div>

        <div className="flex min-w-0 flex-1 items-center gap-3 xl:max-w-3xl">
          <label className="group flex min-w-0 flex-1 items-center gap-3 rounded-2xl border border-slate-200/80 bg-white/85 px-4 py-3 shadow-sm transition focus-within:border-sky-300 focus-within:ring-4 focus-within:ring-sky-100 dark:border-white/10 dark:bg-slate-900/70 dark:focus-within:border-sky-400 dark:focus-within:ring-sky-500/10">
            <Search className="h-4 w-4 text-slate-400 transition group-focus-within:text-sky-500 dark:text-slate-500" />
            <input
              value={localQuery}
              onChange={(event) => setLocalQuery(event.target.value)}
              placeholder="搜索标题或正文内容"
              className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500"
            />
          </label>

          <SaveBadge saveStatus={saveStatus} lastSavedAt={lastSavedAt} />
        </div>

        <div className="flex items-center justify-between gap-3">
          <button
            onClick={() => void createNote()}
            className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-slate-900/15 transition hover:-translate-y-0.5 hover:bg-slate-800 dark:bg-sky-500 dark:text-slate-950 dark:hover:bg-sky-400"
          >
            <Plus className="h-4 w-4" />
            新建笔记
          </button>

          <div className="flex items-center gap-1 rounded-2xl border border-slate-200/80 bg-white/80 p-1 shadow-sm dark:border-white/10 dark:bg-slate-900/70">
            <button
              onClick={() => void setTheme('light')}
              className={`rounded-xl p-2 transition ${
                settings.theme === 'light'
                  ? 'bg-slate-900 text-white dark:bg-sky-400 dark:text-slate-950'
                  : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
              }`}
              title="浅色模式"
            >
              <Sun className="h-4 w-4" />
            </button>
            <button
              onClick={() => void setTheme('dark')}
              className={`rounded-xl p-2 transition ${
                settings.theme === 'dark'
                  ? 'bg-slate-900 text-white dark:bg-sky-400 dark:text-slate-950'
                  : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
              }`}
              title="深色模式"
            >
              <Moon className="h-4 w-4" />
            </button>
            <button
              onClick={() => void setTheme('system')}
              className={`rounded-xl p-2 transition ${
                settings.theme === 'system'
                  ? 'bg-slate-900 text-white dark:bg-sky-400 dark:text-slate-950'
                  : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
              }`}
              title="跟随系统"
            >
              <Monitor className="h-4 w-4" />
            </button>
          </div>

          <div className="hidden rounded-2xl border border-slate-200/80 bg-white/85 px-3 py-2 shadow-sm sm:flex sm:items-center sm:gap-3 dark:border-white/10 dark:bg-slate-900/70">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-sm font-semibold text-white">
              {(user?.nickname ?? 'N').slice(0, 1).toUpperCase()}
            </div>
            <div className="leading-tight">
              <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{user?.nickname ?? '访客'}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">个人空间</p>
            </div>
            <button
              onClick={logout}
              className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              title="退出登录"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
