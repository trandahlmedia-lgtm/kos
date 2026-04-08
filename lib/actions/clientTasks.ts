'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit, userAction, LIMITS } from '@/lib/security/rateLimit'
import type { ClientTask } from '@/types'

// ---------------------------------------------------------------------------
// Input schemas
// ---------------------------------------------------------------------------

const uuidSchema = z.string().uuid('Invalid ID')
const titleSchema = z.string().min(1, 'Title required').max(500).trim()

// ---------------------------------------------------------------------------
// getClientTasks
// ---------------------------------------------------------------------------

export async function getClientTasks(clientId: string): Promise<ClientTask[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const idResult = uuidSchema.safeParse(clientId)
  if (!idResult.success) throw new Error('Invalid client ID')

  const { data, error } = await supabase
    .from('client_tasks')
    .select('*')
    .eq('client_id', idResult.data)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[getClientTasks] query failed:', error)
    throw new Error('Failed to load tasks.')
  }

  return data as ClientTask[]
}

// ---------------------------------------------------------------------------
// createClientTask
// ---------------------------------------------------------------------------

export async function createClientTask(
  clientId: string,
  title: string
): Promise<ClientTask> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const idResult = uuidSchema.safeParse(clientId)
  if (!idResult.success) throw new Error('Invalid client ID')

  const titleResult = titleSchema.safeParse(title)
  if (!titleResult.success) throw new Error(titleResult.error.issues[0].message)

  const rl = await checkRateLimit(
    userAction(user.id, 'create_client_task'),
    LIMITS.USER_WRITE.max,
    LIMITS.USER_WRITE.windowS
  )
  if (!rl.allowed) throw new Error(`Rate limit exceeded. Wait ${rl.retryAfter}s.`)

  const { data, error } = await supabase
    .from('client_tasks')
    .insert({
      client_id: idResult.data,
      title: titleResult.data,
      created_by: user.id,
    })
    .select('*')
    .single()

  if (error || !data) {
    console.error('[createClientTask] insert failed:', error)
    throw new Error('Failed to create task.')
  }

  revalidatePath(`/clients/${idResult.data}`)
  return data as ClientTask
}

// ---------------------------------------------------------------------------
// toggleClientTask
// ---------------------------------------------------------------------------

export async function toggleClientTask(taskId: string, completed: boolean): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const idResult = uuidSchema.safeParse(taskId)
  if (!idResult.success) throw new Error('Invalid task ID')

  const { error } = await supabase
    .from('client_tasks')
    .update({
      completed,
      completed_at: completed ? new Date().toISOString() : null,
    })
    .eq('id', idResult.data)

  if (error) {
    console.error('[toggleClientTask] update failed:', error)
    throw new Error('Failed to update task.')
  }

  // Revalidate is best-effort here since we don't have clientId in scope.
  // The calling component can optimistically update UI.
}

// ---------------------------------------------------------------------------
// deleteClientTask
// ---------------------------------------------------------------------------

export async function deleteClientTask(taskId: string, clientId: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const taskIdResult = uuidSchema.safeParse(taskId)
  if (!taskIdResult.success) throw new Error('Invalid task ID')

  const { error } = await supabase
    .from('client_tasks')
    .delete()
    .eq('id', taskIdResult.data)

  if (error) {
    console.error('[deleteClientTask] delete failed:', error)
    throw new Error('Failed to delete task.')
  }

  revalidatePath(`/clients/${clientId}`)
}

// ---------------------------------------------------------------------------
// reorderClientTasks
// ---------------------------------------------------------------------------
// Signature changed: now requires clientId for ownership verification.
// Delegates to the reorder_client_tasks RPC which validates all ids belong
// to the specified client and updates sort_order atomically.

export async function reorderClientTasks(
  clientId: string,
  taskIds: string[]
): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const clientIdResult = uuidSchema.safeParse(clientId)
  if (!clientIdResult.success) throw new Error('Invalid client ID')

  const idsResult = z.array(uuidSchema).min(1).safeParse(taskIds)
  if (!idsResult.success) throw new Error('Invalid task IDs')

  const { error } = await supabase.rpc('reorder_client_tasks', {
    p_task_ids: idsResult.data,
    p_client_id: clientIdResult.data,
  })

  if (error) {
    console.error('[reorderClientTasks] rpc failed:', error)
    throw new Error('Failed to reorder tasks.')
  }

  revalidatePath(`/clients/${clientIdResult.data}`)
}
