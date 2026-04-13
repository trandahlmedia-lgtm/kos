'use client'

import { useState, useTransition } from 'react'
import { Plus, X, Clock, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { type ClientTask, type TaskPriority, type TaskType } from '@/types'
import { toggleTask, createTask, deleteTask } from '@/lib/actions/tasks'
import { TaskCard } from '@/components/dashboard/TaskCard'

// ---------------------------------------------------------------------------
// Sort options
// ---------------------------------------------------------------------------

type SortKey = 'priority' | 'due_date' | 'created_at'
type FilterKey = 'all' | 'active' | 'completed'

const PRIORITY_ORDER: Record<TaskPriority, number> = { high: 0, medium: 1, low: 2 }

function sortTasks(tasks: ClientTask[], sortKey: SortKey): ClientTask[] {
  return [...tasks].sort((a, b) => {
    if (sortKey === 'priority') {
      const pDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
      if (pDiff !== 0) return pDiff
      if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date)
      if (a.due_date) return -1
      if (b.due_date) return 1
      return 0
    }
    if (sortKey === 'due_date') {
      if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date)
      if (a.due_date) return -1
      if (b.due_date) return 1
      return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
    }
    // created_at
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface TasksTabProps {
  initialTasks: ClientTask[]
  clientId: string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TasksTab({ initialTasks, clientId }: TasksTabProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Local task list (mirrors server state + optimistic updates)
  const [tasks, setTasks] = useState<ClientTask[]>(initialTasks)
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set())
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [localCompleted, setLocalCompleted] = useState<Record<string, boolean>>({})

  // UI state
  const [filter, setFilter] = useState<FilterKey>('active')
  const [sortKey, setSortKey] = useState<SortKey>('priority')
  const [showAddForm, setShowAddForm] = useState(false)

  // Add form state
  const [addTitle, setAddTitle] = useState('')
  const [addPriority, setAddPriority] = useState<TaskPriority>('medium')
  const [addType, setAddType] = useState<TaskType>('admin')
  const [addDueDate, setAddDueDate] = useState('')
  const [addMinutes, setAddMinutes] = useState('')
  const [addDescription, setAddDescription] = useState('')
  const [addError, setAddError] = useState('')

  // ---------------------------------------------------------------------------
  // Derived state
  // ---------------------------------------------------------------------------

  function getCompleted(task: ClientTask): boolean {
    return task.id in localCompleted ? localCompleted[task.id] : task.completed
  }

  const filteredTasks = tasks.filter((t) => {
    const completed = getCompleted(t)
    if (filter === 'active') return !completed
    if (filter === 'completed') return completed
    return true
  })

  const sortedTasks = sortTasks(filteredTasks, sortKey)

  const activeCount = tasks.filter((t) => !getCompleted(t)).length
  const completedCount = tasks.filter((t) => getCompleted(t)).length

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  async function handleToggle(taskId: string, serverCompleted: boolean) {
    if (pendingIds.has(taskId)) return
    const newCompleted = !(taskId in localCompleted ? localCompleted[taskId] : serverCompleted)
    setLocalCompleted((prev) => ({ ...prev, [taskId]: newCompleted }))
    setPendingIds((prev) => new Set(prev).add(taskId))
    try {
      await toggleTask(taskId, 'client_tasks', serverCompleted)
    } catch {
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

  function handleToggleExpand(taskId: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(taskId)) next.delete(taskId)
      else next.add(taskId)
      return next
    })
  }

  async function handleDelete(taskId: string) {
    if (!confirm('Delete this task?')) return
    setTasks((prev) => prev.filter((t) => t.id !== taskId))
    try {
      await deleteTask(taskId, 'client_tasks')
    } catch {
      // Revert
      router.refresh()
    }
  }

  function resetAddForm() {
    setAddTitle('')
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
        await createTask(
          {
            title: addTitle.trim(),
            client_id: clientId,
            priority: addPriority,
            task_type: addType,
            due_date: addDueDate || null,
            estimated_minutes: addMinutes ? parseInt(addMinutes, 10) : null,
            description: addDescription.trim() || null,
          },
          'client_tasks'
        )
        resetAddForm()
        router.refresh()
      } catch (err) {
        setAddError(err instanceof Error ? err.message : 'Failed to create task')
      }
    })
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-4 max-w-3xl">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        {/* Filter toggles */}
        <div className="flex items-center gap-1">
          {(['all', 'active', 'completed'] as FilterKey[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs rounded-md transition-colors capitalize ${
                filter === f
                  ? 'bg-[#1a1a1a] text-white border border-[#3a3a3a]'
                  : 'text-[#555555] hover:text-[#999999]'
              }`}
            >
              {f}
              {f === 'active' && activeCount > 0 && (
                <span className="ml-1.5 text-[#555555]">{activeCount}</span>
              )}
              {f === 'completed' && completedCount > 0 && (
                <span className="ml-1.5 text-[#555555]">{completedCount}</span>
              )}
            </button>
          ))}
        </div>

        {/* Sort */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#555555]">Sort:</span>
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="bg-[#111111] border border-[#2a2a2a] rounded-md px-2 py-1 text-xs text-white focus:outline-none focus:border-[#E8732A] transition-colors"
          >
            <option value="priority">Priority</option>
            <option value="due_date">Due Date</option>
            <option value="created_at">Created</option>
          </select>
        </div>
      </div>

      {/* Task list */}
      {sortedTasks.length > 0 ? (
        <div className="space-y-1.5">
          {sortedTasks.map((task) => (
            <div key={task.id} className="group relative">
              <TaskCard
                id={task.id}
                title={task.title}
                priority={task.priority}
                taskType={task.task_type}
                estimatedMinutes={task.estimated_minutes}
                description={task.description}
                dueDate={task.due_date}
                clientId={null}
                clientName={null}
                isCompleted={getCompleted(task)}
                isPending={pendingIds.has(task.id)}
                isExpanded={expandedIds.has(task.id)}
                onToggle={() => handleToggle(task.id, task.completed)}
                onToggleExpand={() => handleToggleExpand(task.id)}
              />
              {/* Delete button — visible on hover */}
              <button
                onClick={() => handleDelete(task.id)}
                className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 opacity-0 group-hover:opacity-100 transition-opacity text-[#555555] hover:text-red-400"
                aria-label="Delete task"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-[#111111] border border-[#2a2a2a] rounded-md px-6 py-8 text-center">
          <p className="text-sm text-[#555555]">
            {filter === 'completed' ? 'No completed tasks.' : 'No active tasks.'}
          </p>
        </div>
      )}

      {/* Add task form */}
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

          <input
            type="text"
            placeholder="Task title"
            value={addTitle}
            onChange={(e) => setAddTitle(e.target.value)}
            autoFocus
            className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-md px-3 py-2 text-sm text-white placeholder-[#555555] focus:outline-none focus:border-[#E8732A] transition-colors"
          />

          <div className="grid grid-cols-2 gap-2">
            <select
              value={addPriority}
              onChange={(e) => setAddPriority(e.target.value as TaskPriority)}
              className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-[#E8732A] transition-colors"
            >
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
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

          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              value={addDueDate}
              onChange={(e) => setAddDueDate(e.target.value)}
              className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-[#E8732A] transition-colors"
            />
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

          <textarea
            placeholder="Description (optional)"
            value={addDescription}
            onChange={(e) => setAddDescription(e.target.value)}
            rows={2}
            className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-md px-3 py-2 text-sm text-white placeholder-[#555555] focus:outline-none focus:border-[#E8732A] transition-colors resize-none"
          />

          {addError && <p className="text-xs text-red-400">{addError}</p>}

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
