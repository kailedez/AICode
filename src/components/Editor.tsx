import { useCallback, useEffect, useRef, useState } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import type { Editor as TipTapEditor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import TaskItem from '@tiptap/extension-task-item'
import TaskList from '@tiptap/extension-task-list'
import { Markdown } from '@tiptap/markdown'
import { CalendarDays, Clock3, Command, LoaderCircle, Sparkles } from 'lucide-react'
import { useAppStore } from '../store/appStore'
import { MenuBar } from './MenuBar'
import type { SaveStatus } from '../types'

function useDebouncedCallback<T extends (...args: never[]) => void>(fn: T, delay: number) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  return useCallback(
    (...args: Parameters<T>) => {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => fn(...args), delay)
    },
    [delay, fn]
  )
}

const COMMANDS = [
  { key: '# 空格', description: '一级标题', action: (editor: TipTapEditor) => editor.chain().focus().toggleHeading({ level: 1 }).run() },
  { key: '## 空格', description: '二级标题', action: (editor: TipTapEditor) => editor.chain().focus().toggleHeading({ level: 2 }).run() },
  { key: '**文本**', description: '粗体', action: (editor: TipTapEditor) => editor.chain().focus().toggleBold().run() },
  { key: '*文本*', description: '斜体', action: (editor: TipTapEditor) => editor.chain().focus().toggleItalic().run() },
  { key: '- 空格', description: '无序列表', action: (editor: TipTapEditor) => editor.chain().focus().toggleBulletList().run() },
  { key: '1. 空格', description: '有序列表', action: (editor: TipTapEditor) => editor.chain().focus().toggleOrderedList().run() },
  { key: '[ ] 空格', description: '任务列表', action: (editor: TipTapEditor) => editor.chain().focus().toggleTaskList().run() },
  { key: '> 空格', description: '引用', action: (editor: TipTapEditor) => editor.chain().focus().toggleBlockquote().run() },
]

function computeWordCount(text: string) {
  const cjk = (text.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g) || []).length
  const english = (text.match(/[a-zA-Z0-9_-]+/g) || []).length
  return cjk + english
}

function buildNoteDraft(
  title: string,
  editor: TipTapEditor
): {
  title: string
  contentJson: Record<string, unknown> | null
  contentHtml: string | null
  contentText: string | null
  wordCount: number
} {
  const plainText = editor.getText()
  return {
    title: title || '未命名笔记',
    contentJson: editor.getJSON() as Record<string, unknown>,
    contentHtml: editor.getHTML(),
    contentText: plainText,
    wordCount: computeWordCount(plainText),
  }
}

function debugEditor(event: string, payload?: Record<string, unknown>) {
  if (!import.meta.env.DEV) return
  const time = new Date().toLocaleTimeString('zh-CN', { hour12: false })
  console.log(`[noteflow-editor ${time}] ${event}`, payload ?? {})
}

function SaveTone({ status }: { status: SaveStatus }) {
  const styleMap: Record<SaveStatus, string> = {
    idle: 'border-slate-200 bg-white text-slate-500 dark:border-white/10 dark:bg-slate-900 dark:text-slate-400',
    saving: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-200',
    saved: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200',
    error: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200',
  }

  const labelMap: Record<SaveStatus, string> = {
    idle: '待同步',
    saving: '保存中',
    saved: '已保存',
    error: '保存失败',
  }

  return (
    <span className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${styleMap[status]}`}>
      {labelMap[status]}
    </span>
  )
}

export function Editor() {
  const activeNote = useAppStore((state) => state.activeNote)
  const saveStatus = useAppStore((state) => state.saveStatus)
  const lastSavedAt = useAppStore((state) => state.lastSavedAt)
  const isNoteLoading = useAppStore((state) => state.isNoteLoading)

  if (isNoteLoading) {
    return (
      <section className="flex min-w-0 flex-1 items-center justify-center rounded-[32px] border border-white/60 bg-white/75 shadow-[0_24px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/75">
        <div className="text-center text-slate-500 dark:text-slate-400">
          <LoaderCircle className="mx-auto mb-3 h-6 w-6 animate-spin" />
          <p className="text-sm font-medium">正在加载笔记内容...</p>
        </div>
      </section>
    )
  }

  if (!activeNote) {
    return (
      <section className="flex min-w-0 flex-1 items-center justify-center rounded-[32px] border border-white/60 bg-white/75 shadow-[0_24px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/75">
        <div className="max-w-md px-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[24px] bg-slate-900 text-white shadow-lg shadow-slate-900/10 dark:bg-sky-400 dark:text-slate-950">
            <Sparkles className="h-6 w-6" />
          </div>
          <h2 className="mt-5 text-2xl font-semibold text-slate-900 dark:text-white">选择一篇笔记开始编辑</h2>
          <p className="mt-3 text-sm leading-7 text-slate-500 dark:text-slate-400">
            左侧列表会按目录与更新时间组织内容。新建一篇笔记后，标题和正文都会通过统一保存接口自动同步。
          </p>
        </div>
      </section>
    )
  }

  return <ActiveEditorPanel key={activeNote.uid} saveStatus={saveStatus} lastSavedAt={lastSavedAt} />
}

function ActiveEditorPanel({
  saveStatus,
  lastSavedAt,
}: {
  saveStatus: SaveStatus
  lastSavedAt: string | null
}) {
  const activeNote = useAppStore((state) => state.activeNote)
  const saveActiveNote = useAppStore((state) => state.saveActiveNote)
  const [title, setTitle] = useState(activeNote?.title ?? '')
  const [showCommands, setShowCommands] = useState(false)
  const titleRef = useRef(activeNote?.title ?? '')
  const commandsRef = useRef<HTMLDivElement>(null)
  const isSyncingFromStoreRef = useRef(false)
  const lastQueuedPayloadRef = useRef<string | null>(null)

  const queueSave = useDebouncedCallback(
    (payload: {
      title: string
      contentJson: Record<string, unknown> | null
      contentHtml: string | null
      contentText: string | null
      wordCount: number
    }) => {
      const signature = JSON.stringify(payload)
      if (lastQueuedPayloadRef.current === signature) {
        return
      }

      lastQueuedPayloadRef.current = signature
      void saveActiveNote(payload)
    },
    450
  )

  const editor = useEditor({
    extensions: [
      StarterKit,
      Markdown,
      Placeholder.configure({
        placeholder: '开始记录你的灵感、会议结论或待办计划，输入 / 打开命令菜单',
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
    ],
    content: activeNote?.contentHtml ?? '',
    onUpdate: ({ editor: currentEditor }) => {
      if (isSyncingFromStoreRef.current) {
        return
      }

      debugEditor('update', {
        noteUid: activeNote?.uid,
        title: titleRef.current,
        wordCount: computeWordCount(currentEditor.getText()),
      })
      queueSave(buildNoteDraft(titleRef.current, currentEditor))
    },
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'focus:outline-none min-h-[420px] px-1',
      },
    },
  })

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === '/' && editor?.isFocused) {
        event.preventDefault()
        setShowCommands(true)
      }
      if (event.key === 'Escape') {
        setShowCommands(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [editor])

  useEffect(() => {
    if (!showCommands) return

    const handleClickOutside = (event: MouseEvent) => {
      if (commandsRef.current && !commandsRef.current.contains(event.target as Node)) {
        setShowCommands(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showCommands])

  useEffect(() => {
    if (!activeNote) return

    titleRef.current = activeNote.title
    lastQueuedPayloadRef.current = JSON.stringify({
      title: activeNote.title,
      contentJson: activeNote.contentJson,
      contentHtml: activeNote.contentHtml,
      contentText: activeNote.contentText,
      wordCount: activeNote.wordCount,
    })
  }, [activeNote])

  useEffect(() => {
    if (!activeNote || !editor) return

    const currentHtml = editor.getHTML()
    const nextHtml = activeNote.contentHtml ?? ''
    const htmlChanged = currentHtml !== nextHtml
    const titleChanged = titleRef.current !== activeNote.title

    if (!htmlChanged && !titleChanged) {
      return
    }

    debugEditor('sync-from-store', {
      noteUid: activeNote.uid,
      htmlChanged,
      titleChanged,
    })
    isSyncingFromStoreRef.current = true

    if (htmlChanged) {
      editor.commands.setContent(nextHtml, { emitUpdate: false })
    }

    if (titleChanged) {
      titleRef.current = activeNote.title
    }

    queueMicrotask(() => {
      isSyncingFromStoreRef.current = false
    })
  }, [activeNote, editor])

  if (!activeNote) return null

  const handleTitleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextTitle = event.target.value
    setTitle(nextTitle)
    titleRef.current = nextTitle

    if (!editor) return

    queueSave(buildNoteDraft(nextTitle, editor))
  }

  return (
    <section className="relative flex min-w-0 flex-1 flex-col rounded-[32px] border border-white/60 bg-white/75 shadow-[0_24px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/75">
      <div className="border-b border-slate-200/70 px-6 pb-4 pt-6 dark:border-white/10">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0 flex-1">
            <input
              value={title}
              onChange={handleTitleChange}
              placeholder="请输入笔记标题"
              className="w-full bg-transparent text-4xl font-semibold tracking-tight text-slate-950 outline-none placeholder:text-slate-300 dark:text-white dark:placeholder:text-slate-600"
            />
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 dark:bg-slate-800">
                <CalendarDays className="h-3.5 w-3.5" />
                创建于 {new Date(activeNote.createdAt).toLocaleDateString('zh-CN')}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 dark:bg-slate-800">
                <Clock3 className="h-3.5 w-3.5" />
                最近更新 {new Date(activeNote.updatedAt).toLocaleString('zh-CN', {
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 dark:bg-slate-800">{activeNote.wordCount} 字</span>
              {activeNote.folderName ? (
                <span className="rounded-full bg-slate-100 px-2.5 py-1 dark:bg-slate-800">{activeNote.folderName}</span>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <SaveTone status={saveStatus} />
            {lastSavedAt ? (
              <span className="text-xs text-slate-500 dark:text-slate-400">
                上次成功保存于{' '}
                {new Date(lastSavedAt).toLocaleTimeString('zh-CN', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {editor ? <MenuBar editor={editor} /> : null}

      <div className="border-b border-slate-200/70 px-6 py-3 dark:border-white/10">
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
          <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 dark:bg-slate-800">
            <Command className="h-3.5 w-3.5" />
            输入 / 打开命令菜单
          </span>
          <span className="rounded-full bg-slate-100 px-3 py-1.5 dark:bg-slate-800"># 空格 标题</span>
          <span className="rounded-full bg-slate-100 px-3 py-1.5 dark:bg-slate-800">- 空格 列表</span>
          <span className="rounded-full bg-slate-100 px-3 py-1.5 dark:bg-slate-800">[ ] 空格 待办</span>
          <span className="rounded-full bg-slate-100 px-3 py-1.5 dark:bg-slate-800">`代码` 行内代码</span>
        </div>
      </div>

      {showCommands && editor ? (
        <div className="pointer-events-none absolute inset-x-0 top-[172px] z-20 flex justify-center px-6">
          <div ref={commandsRef} className="pointer-events-auto w-full max-w-xl overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-slate-950">
            <div className="border-b border-slate-200/70 px-4 py-3 text-sm font-medium text-slate-700 dark:border-white/10 dark:text-slate-200">
              可用命令
            </div>
            <div className="max-h-80 overflow-y-auto p-2">
              {COMMANDS.map((command) => (
                <button
                  key={command.key}
                  onClick={() => {
                    command.action(editor)
                    setShowCommands(false)
                  }}
                  className="flex w-full items-center justify-between rounded-2xl px-3 py-3 text-left transition hover:bg-slate-50 dark:hover:bg-slate-900"
                >
                  <span className="text-sm font-medium text-slate-800 dark:text-slate-100">{command.description}</span>
                  <span className="rounded-full bg-slate-100 px-2 py-1 font-mono text-[11px] text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                    {command.key}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto max-w-5xl rounded-[32px] border border-slate-200/80 bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.06)] dark:border-white/10 dark:bg-slate-950/55">
          <EditorContent editor={editor} className="noteflow-editor prose prose-lg max-w-none text-slate-800 dark:prose-invert dark:text-slate-100" />
        </div>
      </div>
    </section>
  )
}
