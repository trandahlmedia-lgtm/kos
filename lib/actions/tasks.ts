'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { type TaskPriority, type TaskType } from '@/types'

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const priorityEnum = z.enum(['high', 'medium', 'low'])
const taskTypeEnum = z.enum(['content', 'admin', 'tech', 'ads', 'seo', 'planning'])
const tableEnum = z.enum(['client_tasks', 'agency_tasks'])

const createTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500),
  client_id: z.string().uuid().optional(),
  priority: priorityEnum.default('medium'),
  task_type: taskTypeEnum.optional().nullable(),
  due_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable(),
  estimated_minutes: z.number().int().positive().optional().nullable(),
  description: z.string().max(5000).optional().nullable(),
})

// ---------------------------------------------------------------------------
// Auth helper
// ---------------------------------------------------------------------------

async function requireAuth() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  return { supabase, user }
}

// ---------------------------------------------------------------------------
// toggleTask — flip completed on a single task (optimistic-friendly)
// ---------------------------------------------------------------------------

export async function toggleTask(
  taskId: string,
  table: 'client_tasks' | 'agency_tasks',
  currentCompleted: boolean
): Promise<void> {
  const { supabase } = await requireAuth()

  const idResult = z.string().uuid().safeParse(taskId)
  if (!idResult.success) throw new Error('Invalid task ID')

  const tableResult = tableEnum.safeParse(table)
  if (!tableResult.success) throw new Error('Invalid table')

  const now = new Date().toISOString()

  const { error } = await supabase
    .from(tableResult.data)
    .update({
      completed: !currentCompleted,
      completed_at: !currentCompleted ? now : null,
    })
    .eq('id', idResult.data)

  if (error) {
    console.error('[toggleTask]', error)
    throw new Error('Failed to toggle task')
  }

  revalidatePath('/')
}

// ---------------------------------------------------------------------------
// createTask — add a new task to client_tasks or agency_tasks
// ---------------------------------------------------------------------------

export async function createTask(
  data: {
    title: string
    client_id?: string
    priority?: TaskPriority
    task_type?: TaskType | null
    due_date?: string | null
    estimated_minutes?: number | null
    description?: string | null
  },
  table: 'client_tasks' | 'agency_tasks'
): Promise<void> {
  const { supabase, user } = await requireAuth()

  const tableResult = tableEnum.safeParse(table)
  if (!tableResult.success) throw new Error('Invalid table')

  const parsed = createTaskSchema.safeParse(data)
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => i.message).join('. '))
  }

  const clean = parsed.data

  if (tableResult.data === 'client_tasks' && !clean.client_id) {
    throw new Error('client_id is required for client tasks')
  }

  // Get next sort_order
  let sortOrder = 0
  if (tableResult.data === 'client_tasks' && clean.client_id) {
    const { data: last } = await supabase
      .from('client_tasks')
      .select('sort_order')
      .eq('client_id', clean.client_id)
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle()
    sortOrder = (last?.sort_order ?? -1) + 1
  } else if (tableResult.data === 'agency_tasks') {
    const { data: last } = await supabase
      .from('agency_tasks')
      .select('sort_order')
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle()
    sortOrder = (last?.sort_order ?? -1) + 1
  }

  const payload: Record<string, unknown> = {
    title: clean.title,
    priority: clean.priority,
    task_type: clean.task_type ?? null,
    due_date: clean.due_date ?? null,
    estimated_minutes: clean.estimated_minutes ?? null,
    description: clean.description ?? null,
    sort_order: sortOrder,
    created_by: user.id,
    completed: false,
    completed_at: null,
  }

  if (tableResult.data === 'client_tasks') {
    payload.client_id = clean.client_id
  }

  const { error } = await supabase.from(tableResult.data).insert(payload)

  if (error) {
    console.error('[createTask]', error)
    throw new Error('Failed to create task')
  }

  revalidatePath('/')
}

// ---------------------------------------------------------------------------
// deleteTask — remove a task permanently
// ---------------------------------------------------------------------------

export async function deleteTask(
  id: string,
  table: 'client_tasks' | 'agency_tasks'
): Promise<void> {
  const { supabase } = await requireAuth()

  const idResult = z.string().uuid().safeParse(id)
  if (!idResult.success) throw new Error('Invalid task ID')

  const tableResult = tableEnum.safeParse(table)
  if (!tableResult.success) throw new Error('Invalid table')

  const { error } = await supabase
    .from(tableResult.data)
    .delete()
    .eq('id', idResult.data)

  if (error) {
    console.error('[deleteTask]', error)
    throw new Error('Failed to delete task')
  }

  revalidatePath('/')
}

// ---------------------------------------------------------------------------
// updateTask — partial update on a task record
// ---------------------------------------------------------------------------

export async function updateTask(
  id: string,
  data: Partial<{
    title: string
    priority: TaskPriority
    task_type: TaskType
    due_date: string | null
    estimated_minutes: number | null
    description: string | null
    sort_order: number
  }>,
  table: 'client_tasks' | 'agency_tasks'
): Promise<void> {
  const { supabase } = await requireAuth()

  const idResult = z.string().uuid().safeParse(id)
  if (!idResult.success) throw new Error('Invalid task ID')

  const tableResult = tableEnum.safeParse(table)
  if (!tableResult.success) throw new Error('Invalid table')

  const { error } = await supabase
    .from(tableResult.data)
    .update(data)
    .eq('id', idResult.data)

  if (error) {
    console.error('[updateTask]', error)
    throw new Error('Failed to update task')
  }

  revalidatePath('/')
}
