'use client'

import { useState, useTransition } from 'react'
import { Plus, X, AlertCircle, Calendar, Clock } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  type Client,
  type Post,
  type ClientTask,
  type AgencyTask,
  type TaskPriority,
  type TaskType,
  type Platform,
} from '@/types'
import { toggleTask, createTask } from '@/lib/actions/tasks'
import { TaskCard, getClientBadgeColor } from './TaskCard'
import { PlatformIcon } from '@/components/shared/PlatformIcon'
import { PostStatusBadge } from '@/components/shared/StatusBadge'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ClientTaskWithClient = ClientTask & { clients?: { id: string; name: string } | null }
type AnyTask = ClientTaskWithClient | AgencyTask

function isClientTask(task: AnyTask): task is ClientTaskWithClient {
  return 'client_id' in task
}

function getDaysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
}

const PRIORITY_ORDER: Record<TaskPriority, number> = { high: 0, medium: 1, low: 2 }

function sortTasks(tasks: AnyTask[]): AnyTask[] {
  return [...tasks].sort((a, b) => {
    const pDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
    if (pDiff !== 0) return pDiff
    // Sort by due_date ascending (nulls last)
    if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date)
    if (a.due_date) return -1
    if (b.due_date) return 1
    return a.sort_order - b.sort_order
  })
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface TodayViewProps {
  clientTasks: ClientTaskWithClient[]
  agencyTasks: AgencyTask[]
  upcomingPosts: (Post & { clients?: { name: string } | null })[]
  clients: Client[]
  today: string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TodayView({
  clientTasks,
  agencyTasks,
  upcomingPosts,
  clients,
  today,
}: TodayViewProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Optimistic completion state: id → completed boolean
  const [localCompleted, setLocalCompleted] = useState<Record<string, boolean>>({})
  // Per-task pending guard (prevent double-click)
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set())
  // Expanded task descriptions
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  // Add task form visibility
  const [showAddForm, setShowAddForm] = useState(false)

  // Add form state
  const [addTitle, setAddTitle] = useState('')
  const [addClientId, setAddClientId] = useState<string>('agency')
  const [addPriority, setAddPriority] = useState<TaskPriority>('medium')
  const [addType, setAddType] = useState<TaskType>('admin')
  const [addDueDate, setAddDueDate] = useState('')
  const [addMinutes, setAddMinutes] = useState('')
  const [addDescription, setAddDescription] = useState('')
  const [addError, setAddError] = useState('')

  // ---------------------------------------------------------------------------
  // Derived state
  // ---------------------------------------------------------------------------

  const allTasks: AnyTask[] = [...clientTasks, ...agencyTasks]

  function getCompleted(task: AnyTask): boolean {
    return task.id in localCompleted ? localCompleted[task.id] : task.completed
  }

  const activeTasks = allTasks.filter((t) => !getCompleted(t))
  const completedTasks = allTasks.filter((t) => getCompleted(t))

  const highPriorityTasks = sortTasks(activeTasks.filter((t) => t.priority === 'high'))
  const otherTasks = sortTasks(activeTasks.filter((t) => t.priority !== 'high'))

  const totalActiveTasks = activeTasks.length
  const highPriorityCount = highPriorityTasks.length
  const totalMinutes = activeTasks.reduce((sum, t) => sum + (t.estimated_minutes ?? 0), 0)
  const estimatedLabel =
    totalMinutes > 0
      ? `~${(totalMinutes / 60).toFixed(1).replace(/\.0$/, '')}h estimated`
      : null

  // Needs attention: clients with no post in 7 days
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const inactiveClients = clients.filter((c) => {
    if (!c.last_post_at) return true
    return new Date(c.last_post_at) < sevenDaysAgo
  })

  const formattedDate = new Date(today + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  async function handleToggle(
    taskId: string,
    table: 'client_tasks' | 'agency_tasks',
    serverCompleted: boolean
  ) {
    if (pendingIds.has(taskId)) return

    const newCompleted = !(taskId in localCompleted ? localCompleted[taskId] : serverCompleted)
    setLocalCompleted((prev) => ({ ...prev, [taskId]: newCompleted }))
    setPendingIds((prev) => new Set(prev).add(taskId))

    try {
      await toggleTask(taskId, table, serverCompleted)
    } catch {
      // Revert optimistic update
      setLocalCompleted((prev) => {
        const next = { ...prev }
        delete next[taskId]
        return next
      })
    } finally {
      setPendingIds((prev) => {
        const next = new Set(prev)
        next.delete(taskId)
        return next
      })
    }
  }

  function toggleExpand(taskId: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(taskId)) next.delete(taskId)
      else next.add(taskId)
      return next
    })
  }

  function resetAddForm() {
    setAddTitle('')
    setAddClientId('agency')
    setAddPriority('medium')
    setAddType('admin')
    setAddDueDate('')
    setAddMinutes('')
    setAddDescription('')
    setAddError('')
    setShowAddForm(false)
  }

  function handleAddTask(e: React.FormEvent) {
    e.preventDefault()
    if (!addTitle.trim()) {
      setAddError('Title is required')
      return
    }

    startTransition(async () => {
      try {
        const table = addClientId === 'agency' ? 'agency_tasks' : 'client_tasks'
        await createTask(
          {
            title: addTitle.trim(),
            client_id: addClientId !== 'agency' ? addClientId : undefined,
            priority: addPriority,
            task_type: addType,
            due_date: addDueDate || null,
            estimated_minutes: addMinutes ? parseInt(addMinutes, 10) : null,
            description: addDescription.trim() || null,
          },
          table
        )
        resetAddForm()
        router.refresh()
      } catch (err) {
        setAddError(err instanceof Error ? err.message : 'Failed to create task')
      }
    })
  }

  // ---------------------------------------------------------------------------
  // Task card renderer
  // ---------------------------------------------------------------------------

  function renderTask(task: AnyTask) {
    const clientInfo = isClientTask(task) ? task.clients : null
    const table: 'client_tasks' | 'agency_tasks' = isClientTask(task)
      ? 'client_tasks'
      : 'agency_tasks'
    const completed = getCompleted(task)
    const pending = pendingIds.has(task.id)

    return (
      <TaskCard
        key={task.id}
        id={task.id}
        title={task.title}
        priority={task.priority}
        taskType={task.task_type}
        estimatedMinutes={task.estimated_minutes}
        description={task.description}
        dueDate={task.due_date}
        clientId={clientInfo?.id ?? null}
        clientName={clientInfo?.name ?? null}
        isCompleted={completed}
        isPending={pending}
        isExpanded={expandedIds.has(task.id)}
        onToggle={() => handleToggle(task.id, table, task.completed)}
        onToggleExpand={() => toggleExpand(task.id)}
      />
    )
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-white">Today — {formattedDate}</h2>
        <p className="text-xs text-[#555555] mt-1">
          {totalActiveTasks === 0
            ? 'No open tasks'
            : [
                `${totalActiveTasks} task${totalActiveTasks !== 1 ? 's' : ''}`,
                highPriorityCount > 0
                  ? `${highPriorityCount} high priority`
                  : null,
                estimatedLabel,
              ]
                .filter(Boolean)
                .join(' · ')}
        </p>
      </div>

      {/* HIGH PRIORITY */}
      {highPriorityTasks.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold text-[#555555] uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
            High Priority
          </h3>
          <div className="space-y-1.5">{highPriorityTasks.map(renderTask)}</div>
        </section>
      )}

      {/* CONTENT DUE */}
      {upcomingPosts.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold text-[#555555] uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Calendar size={11} className="text-[#555555]" />
            Content Due
          </h3>
          <div className="space-y-1.5">
            {upcomingPosts.map((post) => {
              const isToday = post.scheduled_date === today
              const dateLabel = post.scheduled_date
                ? new Date(post.scheduled_date + 'T12:00:00').toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  })
                : null
              const timeLabel = post.scheduled_time
                ? post.scheduled_time.slice(0, 5)
                : null

              return (
                <Link
                  key={post.id}
                  href={`/content`}
                  className="flex items-center gap-3 bg-[#111111] border border-[#2a2a2a] rounded-md px-4 py-3 hover:border-[#3a3a3a] transition-colors"
                >
                  {/* Content icon */}
                  <span className="text-[#555555] text-xs shrink-0">📝</span>

                  {/* Post info */}
                  <span className="text-sm text-white flex-1 min-w-0 truncate">
                    {post.angle ?? post.caption?.slice(0, 60) ?? 'Untitled post'}
                  </span>

                  {/* Right side */}
                  <div className="flex items-center gap-2 shrink-0">
                    <PlatformIcon platform={post.platform as Platform} size="sm" />
                    <PostStatusBadge status={post.status} />
                    {(dateLabel || timeLabel) && (
                      <span
                        className={`text-xs ${isToday ? 'text-[#E8732A]' : 'text-[#555555]'}`}
                      >
                        {isToday ? `Today${timeLabel ? ` ${timeLabel}` : ''}` : `${dateLabel}${timeLabel ? ` ${timeLabel}` : ''}`}
                      </span>
                    )}
                    {post.clients?.name && (
                      <span
                        className="text-xs px-2 py-0.5 rounded border font-medium"
                        style={(() => {
                          const color = getClientBadgeColor(post.client_id)
                          return {
                            backgroundColor: color.bg,
                            color: color.text,
                            borderColor: color.border,
                          }
                        })()}
                      >
                        {post.clients.name.split(' ').slice(0, 2).join(' ')}
                      </span>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {/* OTHER TASKS */}
      {otherTasks.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold text-[#555555] uppercase tracking-wider mb-2">
            Other Tasks
          </h3>
          <div className="space-y-1.5">{otherTasks.map(renderTask)}</div>
        </section>
      )}

      {/* COMPLETED (from this session — optimistic) */}
      {completedTasks.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold text-[#555555] uppercase tracking-wider mb-2">
            Completed
          </h3>
          <div className="space-y-1.5">{completedTasks.map(renderTask)}</div>
        </section>
      )}

      {/* NEEDS ATTENTION */}
      {inactiveClients.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold text-[#555555] uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <AlertCircle size={11} className="text-yellow-400" />
            Needs Attention
          </h3>
          <div className="space-y-1.5">
            {inactiveClients.map((client) => (
              <Link
                key={client.id}
                href={`/clients/${client.id}`}
                className="flex items-center gap-3 bg-[#111111] border border-[#2a2a2a] rounded-md px-4 py-3 hover:border-yellow-400/30 transition-colors"
              >
                <AlertCircle size={14} className="text-yellow-400 shrink-0" />
                <span className="text-sm text-white">{client.name}</span>
                <span className="text-xs text-[#555555]">
                  {client.last_post_at
                    ? `No posts in ${getDaysSince(client.last_post_at)} days`
                    : 'No posts yet'}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Empty state */}
      {totalActiveTasks === 0 && upcomingPosts.length === 0 && inactiveClients.length === 0 && (
        <div className="bg-[#111111] border border-[#2a2a2a] rounded-md px-6 py-8 text-center">
          <p className="text-sm text-[#555555]">All clear — nothing on the board today.</p>
        </div>
      )}

      {/* ADD TASK */}
      {showAddForm ? (
        <form
          onSubmit={handleAddTask}
          className="bg-[#111111] border border-[#2a2a2a] rounded-md p-4 space-y-3"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-[#999999] uppercase tracking-wider">
              New Task
            </span>
            <button
              type="button"
              onClick={resetAddForm}
              className="text-[#555555] hover:text-[#999999] transition-colors"
            >
              <X size={14} />
            </button>
          </div>

          {/* Title */}
          <input
            type="text"
            placeholder="Task title"
            value={addTitle}
            onChange={(e) => setAddTitle(e.target.value)}
            autoFocus
            className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-md px-3 py-2 text-sm text-white placeholder-[#555555] focus:outline-none focus:border-[#E8732A] transition-colors"
          />

          {/* Row: client + priority + type */}
          <div className="grid grid-cols-3 gap-2">
            {/* Client */}
            <select
              value={addClientId}
              onChange={(e) => setAddClientId(e.target.value)}
              className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-[#E8732A] transition-colors"
            >
              <option value="agency">Agency</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            {/* Priority */}
            <select
              value={addPriority}
              onChange={(e) => setAddPriority(e.target.value as TaskPriority)}
              className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-[#E8732A] transition-colors"
            >
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            {/* Type */}
            <select
              value={addType}
              onChange={(e) => setAddType(e.target.value as TaskType)}
              className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-[#E8732A] transition-colors"
            >
              <option value="admin">Admin</option>
              <option value="content">Content</option>
              <option value="tech">Tech</option>
              <option value="ads">Ads</option>
              <option value="seo">SEO</option>
              <option value="planning">Planning</option>
            </select>
          </div>

          {/* Row: due date + estimated minutes */}
          <div className="grid grid-cols-2 gap-2">
            <div className="relative">
              <input
                type="date"
                value={addDueDate}
                onChange={(e) => setAddDueDate(e.target.value)}
                className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-[#E8732A] transition-colors"
              />
            </div>
            <div className="relative flex items-center">
              <Clock size={12} className="absolute left-3 text-[#555555]" />
              <input
                type="number"
                placeholder="Minutes"
                value={addMinutes}
                onChange={(e) => setAddMinutes(e.target.value)}
                min="1"
                max="480"
                className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-md pl-8 pr-3 py-2 text-sm text-white placeholder-[#555555] focus:outline-none focus:border-[#E8732A] transition-colors"
              />
            </div>
          </div>

          {/* Description */}
          <textarea
            placeholder="Description (optional)"
            value={addDescription}
            onChange={(e) => setAddDescription(e.target.value)}
            rows={2}
            className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-md px-3 py-2 text-sm text-white placeholder-[#555555] focus:outline-none focus:border-[#E8732A] transition-colors resize-none"
          />

          {addError && <p className="text-xs text-red-400">{addError}</p>}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={resetAddForm}
              className="px-3 py-1.5 text-sm text-[#555555] hover:text-[#999999] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending || !addTitle.trim()}
              className="px-4 py-1.5 text-sm font-medium text-white bg-[#E8732A] rounded-md hover:bg-[#d4621f] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isPending ? 'Adding…' : 'Add Task'}
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 text-sm text-[#555555] hover:text-[#999999] transition-colors py-1"
        >
          <Plus size={14} />
          Add task
        </button>
      )}
    </div>
  )
}
