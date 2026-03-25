import { z } from 'zod'

export const createFolderSchema = z.object({
  name: z.string().trim().min(1).max(128),
  parentUid: z.string().nullable(),
})

export const updateFolderSchema = z.object({
  name: z.string().trim().min(1).max(128).optional(),
  sortOrder: z.number().int().optional(),
  isExpanded: z.boolean().optional(),
})
