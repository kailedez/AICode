import { useState } from 'react'
import { LockKeyhole, Mail, NotebookPen, UserRound } from 'lucide-react'
import { useAppStore } from '../store/appStore'

type AuthMode = 'login' | 'register'

export function LoginScreen() {
  const login = useAppStore((state) => state.login)
  const register = useAppStore((state) => state.register)
  const authLoading = useAppStore((state) => state.authLoading)
  const authError = useAppStore((state) => state.authError)
  const [mode, setMode] = useState<AuthMode>('login')
  const [nickname, setNickname] = useState('Yuki')
  const [email, setEmail] = useState('demo@example.com')
  const [password, setPassword] = useState('noteflow123')

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (mode === 'login') {
      await login({ email, password })
      return
    }

    await register({
      nickname,
      email,
      password,
    })
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.18),_transparent_32%),linear-gradient(180deg,#f8fafc_0%,#eef2f7_100%)] px-6 dark:bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.14),_transparent_28%),linear-gradient(180deg,#020617_0%,#0f172a_100%)]">
      <div className="grid w-full max-w-5xl gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-[36px] border border-white/60 bg-white/80 p-8 shadow-[0_32px_100px_rgba(15,23,42,0.12)] backdrop-blur dark:border-white/10 dark:bg-slate-900/75">
          <div className="flex h-14 w-14 items-center justify-center rounded-[24px] bg-gradient-to-br from-sky-500 via-cyan-500 to-emerald-500 text-white shadow-lg shadow-sky-500/20">
            <NotebookPen className="h-6 w-6" />
          </div>
          <h1 className="mt-6 text-4xl font-semibold tracking-tight text-slate-950 dark:text-white">
            {mode === 'login' ? '登录 NoteFlow' : '创建你的 NoteFlow 账号'}
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-7 text-slate-500 dark:text-slate-400">
            {mode === 'login'
              ? '进入你的在线笔记工作台，继续编辑、整理与同步全部内容。'
              : '注册后会自动进入工作台，目录、设置和笔记内容都会持久化保存。'}
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-3xl bg-slate-100/90 p-4 dark:bg-slate-800/80">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">Workspace</p>
              <p className="mt-2 text-sm font-medium text-slate-800 dark:text-slate-100">目录、笔记、设置统一同步</p>
            </div>
            <div className="rounded-3xl bg-slate-100/90 p-4 dark:bg-slate-800/80">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">Autosave</p>
              <p className="mt-2 text-sm font-medium text-slate-800 dark:text-slate-100">标题与正文自动保存</p>
            </div>
            <div className="rounded-3xl bg-slate-100/90 p-4 dark:bg-slate-800/80">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">Search</p>
              <p className="mt-2 text-sm font-medium text-slate-800 dark:text-slate-100">支持按目录和关键词检索</p>
            </div>
          </div>
        </section>

        <section className="rounded-[36px] border border-white/60 bg-white/85 p-8 shadow-[0_32px_100px_rgba(15,23,42,0.12)] backdrop-blur dark:border-white/10 dark:bg-slate-900/80">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">账户入口</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">
                {mode === 'login' ? '使用账号继续工作' : '注册后立即开始体验'}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-1 dark:border-white/10 dark:bg-slate-950/60">
              <button
                onClick={() => setMode('login')}
                className={`rounded-xl px-4 py-2 text-sm transition ${
                  mode === 'login'
                    ? 'bg-slate-900 text-white dark:bg-sky-500 dark:text-slate-950'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                登录
              </button>
              <button
                onClick={() => setMode('register')}
                className={`rounded-xl px-4 py-2 text-sm transition ${
                  mode === 'register'
                    ? 'bg-slate-900 text-white dark:bg-sky-500 dark:text-slate-950'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                注册
              </button>
            </div>
          </div>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            {mode === 'register' ? (
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">昵称</span>
                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-white/10 dark:bg-slate-950/60">
                  <UserRound className="h-4 w-4 text-slate-400" />
                  <input
                    value={nickname}
                    onChange={(event) => setNickname(event.target.value)}
                    className="w-full bg-transparent text-sm text-slate-800 outline-none dark:text-slate-100"
                  />
                </div>
              </label>
            ) : null}

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">邮箱</span>
              <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-white/10 dark:bg-slate-950/60">
                <Mail className="h-4 w-4 text-slate-400" />
                <input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full bg-transparent text-sm text-slate-800 outline-none dark:text-slate-100"
                />
              </div>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">密码</span>
              <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-white/10 dark:bg-slate-950/60">
                <LockKeyhole className="h-4 w-4 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full bg-transparent text-sm text-slate-800 outline-none dark:text-slate-100"
                />
              </div>
            </label>

            {authError ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
                {authError}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={authLoading}
              className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white shadow-lg shadow-slate-900/15 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-sky-500 dark:text-slate-950 dark:hover:bg-sky-400"
            >
              {authLoading ? (mode === 'login' ? '正在登录...' : '正在注册...') : mode === 'login' ? '进入工作台' : '创建账号并进入'}
            </button>
          </form>

          <div className="mt-6 rounded-3xl bg-slate-100/90 p-4 text-sm text-slate-600 dark:bg-slate-800/80 dark:text-slate-300">
            <p>演示登录账号：`demo@example.com`</p>
            <p className="mt-1">演示密码：`noteflow123`</p>
          </div>
        </section>
      </div>
    </div>
  )
}
