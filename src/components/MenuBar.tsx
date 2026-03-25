import type { ReactNode } from 'react'
import type { Editor } from '@tiptap/react'
import {
  Bold,
  CheckSquare,
  Code,
  Heading1,
  Heading2,
  Italic,
  List,
  ListOrdered,
  Quote,
  Redo,
  Strikethrough,
  Undo,
} from 'lucide-react'

interface MenuBarProps {
  editor: Editor
}

interface ActionItem {
  title: string
  active?: boolean
  disabled?: boolean
  onClick: () => void
  icon: ReactNode
}

function ActionButton({ title, active, disabled, onClick, icon }: ActionItem) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`rounded-2xl border px-3 py-2 text-sm transition ${
        active
          ? 'border-slate-900 bg-slate-900 text-white dark:border-sky-400 dark:bg-sky-400 dark:text-slate-950'
          : 'border-slate-200/80 bg-white/80 text-slate-600 hover:border-slate-300 hover:text-slate-900 dark:border-white/10 dark:bg-slate-950/50 dark:text-slate-300 dark:hover:border-white/20 dark:hover:text-white'
      } ${disabled ? 'cursor-not-allowed opacity-40' : ''}`}
    >
      {icon}
    </button>
  )
}

export function MenuBar({ editor }: MenuBarProps) {
  const groups: ActionItem[][] = [
    [
      {
        title: '一级标题',
        active: editor.isActive('heading', { level: 1 }),
        onClick: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
        icon: <Heading1 className="h-4 w-4" />,
      },
      {
        title: '二级标题',
        active: editor.isActive('heading', { level: 2 }),
        onClick: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
        icon: <Heading2 className="h-4 w-4" />,
      },
    ],
    [
      {
        title: '粗体',
        active: editor.isActive('bold'),
        onClick: () => editor.chain().focus().toggleBold().run(),
        icon: <Bold className="h-4 w-4" />,
      },
      {
        title: '斜体',
        active: editor.isActive('italic'),
        onClick: () => editor.chain().focus().toggleItalic().run(),
        icon: <Italic className="h-4 w-4" />,
      },
      {
        title: '删除线',
        active: editor.isActive('strike'),
        onClick: () => editor.chain().focus().toggleStrike().run(),
        icon: <Strikethrough className="h-4 w-4" />,
      },
      {
        title: '行内代码',
        active: editor.isActive('code'),
        onClick: () => editor.chain().focus().toggleCode().run(),
        icon: <Code className="h-4 w-4" />,
      },
    ],
    [
      {
        title: '无序列表',
        active: editor.isActive('bulletList'),
        onClick: () => editor.chain().focus().toggleBulletList().run(),
        icon: <List className="h-4 w-4" />,
      },
      {
        title: '有序列表',
        active: editor.isActive('orderedList'),
        onClick: () => editor.chain().focus().toggleOrderedList().run(),
        icon: <ListOrdered className="h-4 w-4" />,
      },
      {
        title: '任务列表',
        active: editor.isActive('taskList'),
        onClick: () => editor.chain().focus().toggleTaskList().run(),
        icon: <CheckSquare className="h-4 w-4" />,
      },
      {
        title: '引用',
        active: editor.isActive('blockquote'),
        onClick: () => editor.chain().focus().toggleBlockquote().run(),
        icon: <Quote className="h-4 w-4" />,
      },
    ],
    [
      {
        title: '撤销',
        disabled: !editor.can().undo(),
        onClick: () => editor.chain().focus().undo().run(),
        icon: <Undo className="h-4 w-4" />,
      },
      {
        title: '重做',
        disabled: !editor.can().redo(),
        onClick: () => editor.chain().focus().redo().run(),
        icon: <Redo className="h-4 w-4" />,
      },
    ],
  ]

  return (
    <div className="flex flex-wrap items-center gap-2 border-y border-slate-200/70 px-5 py-3 dark:border-white/10">
      {groups.map((group, groupIndex) => (
        <div
          key={groupIndex}
          className="flex items-center gap-2"
        >
          {group.map((action) => (
            <ActionButton key={action.title} {...action} />
          ))}
        </div>
      ))}
    </div>
  )
}
