import { z } from 'zod'

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  nickname: z.string().trim().min(1).max(64),
})

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
})

export const logoutSchema = z.object({
  refreshToken: z.string().min(1),
})
