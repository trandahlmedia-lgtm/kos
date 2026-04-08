'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit, userAction, LIMITS } from '@/lib/security/rateLimit'
import type { AgencyTask } from '@/types'

// ---------------------------------------------------------------------------
// Input schemas
// ---------------------------------------------------------------------------

const uuidSchema = z.string().uuid('Invalid ID')
const titleSchema = z.string().min(1, 'Title required').max(500).trim()

// ---------------------------------------------------------------------------
// getAgencyTasks
// ---------------------------------------------------------------------------

export async function getAgencyTasks(): Promise<AgencyTask[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data, error } = await supabase
    .from('agency_tasks')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[getAgencyTasks] query failed:', error)
    throw new Error('Failed to load tasks.')
  }

  return data as AgencyTask[]
}

// ---------------------------------------------------------------------------
// createAgencyTask
// ---------------------------------------------------------------------------

export async function createAgencyTask(title: string): Promise<AgencyTask> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const titleResult = titleSchema.safeParse(title)
  if (!titleResult.success) throw new Error(titleResult.error.issues[0].message)

  const rl = await checkRateLimit(
    userAction(user.id, 'create_agency_task'),
    LIMITS.USER_WRITE.max,
    LIMITS.USER_WRITE.windowS
  )
  if (!rl.allowed) throw new Error(`Rate limit exceeded. Wait ${rl.retryAfter}s.`)

  const { data, error } = await supabase
    .from('agency_tasks')
    .insert({
      title: titleResult.data,
      created_by: user.id,
    })
    .select('*')
    .single()

  if (error || !data) {
    console.error('[createAgencyTask] insert failed:', error)
    throw new Error('Failed to create task.')
  }

  revalidatePath('/')
  return data as AgencyTask
}

// ---------------------------------------------------------------------------
// toggleAgencyTask
// ---------------------------------------------------------------------------

export async function toggleAgencyTask(taskId: string, completed: boolean): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const idResult = uuidSchema.safeParse(taskId)
  if (!idResult.success) throw new Error('Invalid task ID')

  const { error } = await supabase
    .from('agency_tasks')
    .update({
      completed,
      completed_at: completed ? new Date().toISOString() : null,
    })
    .eq('id', idResult.data)

  if (error) {
    console.error('[toggleAgencyTask] update failed:', error)
    throw new Error('Failed to update task.')
  }
}

// ---------------------------------------------------------------------------
// deleteAgencyTask
// ---------------------------------------------------------------------------

export async function deleteAgencyTask(taskId: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const idResult = uuidSchema.safeParse(taskId)
  if (!idResult.success) throw new Error('Invalid task ID')

  const { error } = await supabase
    .from('agency_tasks')
    .delete()
    .eq('id', idResult.data)

  if (error) {
    console.error('[deleteAgencyTask] delete failed:', error)
    throw new Error('Failed to delete task.')
  }

  revalidatePath('/')
}

// ---------------------------------------------------------------------------
// reorderAgencyTasks
// ---------------------------------------------------------------------------
// Delegates to the reorder_agency_tasks RPC which validates all ids exist
// and updates sort_order atomically — no partial-write corruption possible.

export async function reorderAgencyTasks(taskIds: string[]): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const idsResult = z.array(uuidSchema).min(1).safeParse(taskIds)
  if (!idsResult.success) throw new Error('Invalid task IDs')

  const { error } = await supabase.rpc('reorder_agency_tasks', {
    p_task_ids: idsResult.data,
  })

  if (error) {
    console.error('[reorderAgencyTasks] rpc failed:', error)
    throw new Error('Failed to reorder tasks.')
  }

  revalidatePath('/')
}
