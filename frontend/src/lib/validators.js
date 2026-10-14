import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

export const registerSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
})

export const resetPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
})

export const newPasswordSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
})

export const agentSchema = z.object({
  name: z.string().min(3, 'Agent name must be at least 3 characters').max(60, 'Name must be under 60 characters'),
  description: z.string().max(300, 'Description must be under 300 characters').optional(),
  role: z.string().min(2, 'Role is required'),
  modelProvider: z.enum(['anthropic', 'openai', 'gemini', 'groq']),
  modelName: z.string().min(1, 'Model name is required'),
  temperature: z.number().min(0).max(1.0),
  systemPrompt: z.string().min(10, 'System prompt must be at least 10 characters'),
})

export const workspaceSchema = z.object({
  name: z.string().min(2, 'Workspace name must be at least 2 characters').max(50),
  slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and dashes'),
})

export const inviteMemberSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  role: z.enum(['admin', 'member', 'viewer']),
})

export const apiKeySchema = z.object({
  name: z.string().min(3, 'Key name must be at least 3 characters'),
  scopes: z.array(z.string()).min(1, 'Select at least one scope'),
})

export const scheduleSchema = z.object({
  name: z.string().min(3, 'Schedule name is required'),
  agentId: z.string().min(1, 'Agent selection is required'),
  cronExpression: z.string().regex(/^(\*|([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])|\*\/[0-9]+)\s+(\*|([0-9]|1[0-9]|2[0-3])|\*\/[0-9]+)\s+(\*|([1-9]|1[0-9]|2[0-9]|3[0-1])|\*\/[0-9]+)\s+(\*|([1-9]|1[0-2])|\*\/[0-9]+)\s+(\*|([0-6])|\*\/[0-9]+)$/, 'Invalid 5-field cron expression (e.g. 0 * * * *)'),
})
