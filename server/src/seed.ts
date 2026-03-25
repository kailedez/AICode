export interface SeedFolderDefinition {
  key: 'product' | 'research' | 'sprint' | 'capture'
  name: string
  parentKey: SeedFolderDefinition['key'] | null
  sortOrder: number
}

export interface SeedNoteDefinition {
  key: 'roadmap' | 'research' | 'daily'
  title: string
  folderKey: SeedFolderDefinition['key']
  contentHtml: string
}

export const DEMO_USER_UID = 'usr_demo'

export const DEMO_FOLDERS: SeedFolderDefinition[] = [
  { key: 'product', name: '产品设计', parentKey: null, sortOrder: 10 },
  { key: 'research', name: '竞品研究', parentKey: 'product', sortOrder: 20 },
  { key: 'sprint', name: 'Sprint 规划', parentKey: 'product', sortOrder: 30 },
  { key: 'capture', name: '灵感速记', parentKey: null, sortOrder: 40 },
]

export const DEMO_NOTES: SeedNoteDefinition[] = [
  {
    key: 'roadmap',
    title: 'NoteFlow 迭代方向',
    folderKey: 'sprint',
    contentHtml:
      '<h1>NoteFlow 迭代方向</h1><p>围绕目录组织、自动保存和在线同步建立一致体验。</p><ul><li><p>明确 API 数据结构</p></li><li><p>建立保存状态提示</p></li><li><p>重做信息层级</p></li></ul>',
  },
  {
    key: 'research',
    title: '竞品观察',
    folderKey: 'research',
    contentHtml:
      '<h2>竞品观察</h2><p>优秀笔记产品通常把搜索、收藏、最近更新放在第一屏可见范围内。</p><blockquote><p>信息架构比视觉细节更先决定专业感。</p></blockquote>',
  },
  {
    key: 'daily',
    title: '今日速记',
    folderKey: 'capture',
    contentHtml:
      '<p>今天整理了新的编辑器交互。</p><ul data-type="taskList"><li data-type="taskItem" data-checked="true"><label><input type="checkbox" checked="checked"><span></span></label><div><p>标题独立保存</p></div></li><li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>补充历史版本入口</p></div></li></ul>',
  },
]

export const CORRUPTED_FOLDER_NAMES = new Map<string, string>([
  ['浜у搧璁捐', '产品设计'],
  ['绔炲搧鐮旂┒', '竞品研究'],
  ['Sprint 瑙勫垝', 'Sprint 规划'],
  ['鐏垫劅閫熻', '灵感速记'],
])

export const CORRUPTED_NOTE_TITLES = new Map<string, string>([
  ['NoteFlow 杩唬鏂瑰悜', 'NoteFlow 迭代方向'],
  ['绔炲搧瑙傚療', '竞品观察'],
  ['浠婃棩閫熻', '今日速记'],
])
