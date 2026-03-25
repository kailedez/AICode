import { z } from 'zod'

export const listNotesQuerySchema = z.object({
  folderUid: z.string().optional(),
  includeDescendants: z.enum(['true', 'false']).optional(),
  keyword: z.string().optional(),
})

export const createNoteSchema = z.object({
  title: z.string().trim().min(1).max(255),
  folderUid: z.string().nullable(),
})

export const updateNoteSchema = z.object({
  title: z.string().trim().min(1).max(255).optional(),
  folderUid: z.string().nullable().optional(),
})

export const saveNoteContentSchema = z.object({
  title: z.string().trim().min(1).max(255),
  contentJson: z.record(z.string(), z.unknown()).nullable(),
  contentHtml: z.string().nullable(),
  contentText: z.string().nullable(),
  wordCount: z.number().int().nonnegative(),
  clientUpdatedAt: z.string(),
})

export const restoreRevisionSchema = z.object({
  versionNo: z.number().int().positive(),
})
