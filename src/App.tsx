import { useEffect } from 'react'
import { AlertCircle } from 'lucide-react'
import { useAppStore } from './store/appStore'
import { Header } from './components/Header'
import { Sidebar } from './components/Sidebar'
import { Editor } from './components/Editor'
import { NoteList } from './components/NoteList'
import { LoginScreen } from './components/LoginScreen'

function App() {
  const settings = useAppStore((state) => state.settings)
  const initialize = useAppStore((state) => state.initialize)
  const initialized = useAppStore((state) => state.initialized)
  const bootstrapping = useAppStore((state) => state.bootstrapping)
  const errorMessage = useAppStore((state) => state.errorMessage)
  const isAuthenticated = useAppStore((state) => state.isAuthenticated)

  useEffect(() => {
    void initialize()
  }, [initialize])

  useEffect(() => {
    const root = document.documentElement
    const applyTheme = () => {
      const finalTheme =
        settings.theme === 'system'
          ? window.matchMedia('(prefers-color-scheme: dark)').matches
            ? 'dark'
            : 'light'
          : settings.theme

      root.classList.toggle('dark', finalTheme === 'dark')
    }

    applyTheme()

    if (settings.theme === 'system') {
      const media = window.matchMedia('(prefers-color-scheme: dark)')
      const handler = () => applyTheme()
      media.addEventListener('change', handler)
      return () => media.removeEventListener('change', handler)
    }
  }, [settings.theme])

  if (!initialized || bootstrapping) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.14),_transparent_35%),linear-gradient(180deg,#f8fafc_0%,#eef2f7_100%)] text-slate-600 dark:bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.12),_transparent_30%),linear-gradient(180deg,#020617_0%,#0f172a_100%)] dark:text-slate-300">
        <div className="rounded-3xl border border-white/60 bg-white/80 px-10 py-8 text-center shadow-[0_30px_120px_rgba(15,23,42,0.12)] backdrop-blur dark:border-white/10 dark:bg-slate-900/70">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
          <p className="text-lg font-semibold">正在同步你的工作空间</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">初始化目录、笔记列表与用户设置...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <LoginScreen />
  }

  return (
    <div className="flex min-h-screen bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.12),_transparent_26%),linear-gradient(180deg,#f8fafc_0%,#eef2f7_100%)] text-slate-800 dark:bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.12),_transparent_25%),linear-gradient(180deg,#020617_0%,#0f172a_100%)] dark:text-slate-100">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header />
        {errorMessage ? (
          <div className="mx-4 mt-3 flex items-center gap-2 rounded-2xl border border-amber-200/80 bg-amber-50/90 px-4 py-3 text-sm text-amber-800 shadow-sm dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-100">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        ) : null}
        <main className="flex min-h-0 flex-1 gap-4 p-4 pt-3">
          <NoteList />
          <Editor />
        </main>
      </div>
    </div>
  )
}

export default App
