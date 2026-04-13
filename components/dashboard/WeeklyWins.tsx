'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { type AgencyTask } from '@/types'
import { toggleTask } from '@/lib/actions/tasks'

interface WeeklyWinsProps {
  tasks: AgencyTask[]
}

export function WeeklyWins({ tasks }: WeeklyWinsProps) {
  const router = useRouter()
  const [localCompleted, setLocalCompleted] = useState<Record<string, boolean>>({})
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set())

  function getCompleted(task: AgencyTask): boolean {
    return task.id in localCompleted ? localCompleted[task.id] : task.completed
  }

  async function handleToggle(task: AgencyTask) {
    if (pendingIds.has(task.id)) return

    setLocalCompleted((prev) => ({ ...prev, [task.id]: !getCompleted(task) }))
    setPendingIds((prev) => new Set(prev).add(task.id))

    try {
      await toggleTask(task.id, 'agency_tasks', task.completed)
      router.refresh()
    } catch {
      setLocalCompleted((prev) => {
        const next = { ...prev }
        delete next[task.id]
        return next
      })
    } finally {
      setPendingIds((prev) => {
        const next = new Set(prev)
        next.delete(task.id)
        return next
      })
    }
  }

  if (tasks.length === 0) return null

  return (
    <section>
      <h3 className="text-xs font-semibold text-[#555555] uppercase tracking-wider mb-3">
        This Week&apos;s Wins
      </h3>
      <div className="bg-[#111111] border border-[#2a2a2a] rounded-md overflow-hidden">
        {tasks.map((task, i) => {
          const completed = getCompleted(task)
          const pending = pendingIds.has(task.id)
          return (
            <div
              key={task.id}
              className={`flex items-center gap-3 px-4 py-3 ${
                i < tasks.length - 1 ? 'border-b border-[#2a2a2a]' : ''
              }`}
            >
              <button
                onClick={() => handleToggle(task)}
                disabled={pending}
                aria-label={completed ? 'Mark incomplete' : 'Mark complete'}
                className="shrink-0 w-4 h-4 rounded border border-[#3a3a3a] flex items-center justify-center transition-colors hover:border-[#E8732A] disabled:opacity-40"
                style={completed ? { backgroundColor: '#E8732A', borderColor: '#E8732A' } : {}}
              >
                {completed && (
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path
                      d="M1 4L3.5 6.5L9 1"
                      stroke="white"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </button>
              <span
                className={`text-sm flex-1 ${
                  completed ? 'line-through text-[#555555]' : 'text-white'
                }`}
              >
                {task.title}
              </span>
            </div>
          )
        })}
      </div>
    </section>
  )
}
