import { z } from 'zod'

export const updateSettingsSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).optional(),
  defaultFolderUid: z.string().nullable().optional(),
})
