'use client'

import { ChevronRight, ChevronDown, Clock } from 'lucide-react'
import { type TaskPriority, type TaskType } from '@/types'

// ---------------------------------------------------------------------------
// Badge color palette — deterministic by client ID
// ---------------------------------------------------------------------------

const BADGE_COLORS = [
  { bg: '#1e1b4b', text: '#a5b4fc', border: '#3730a3' },
  { bg: '#052e16', text: '#86efac', border: '#166534' },
  { bg: '#451a03', text: '#fcd34d', border: '#92400e' },
  { bg: '#0c4a6e', text: '#7dd3fc', border: '#0369a1' },
  { bg: '#4c0519', text: '#fca5a5', border: '#9f1239' },
  { bg: '#2e1065', text: '#d8b4fe', border: '#6b21a8' },
  { bg: '#042f2e', text: '#5eead4', border: '#0f766e' },
]

export function getClientBadgeColor(clientId: string) {
  let hash = 0
  for (let i = 0; i < clientId.length; i++) {
    hash = (hash << 5) - hash + clientId.charCodeAt(i)
    hash |= 0
  }
  return BADGE_COLORS[Math.abs(hash) % BADGE_COLORS.length]
}

// ---------------------------------------------------------------------------
// Priority dot
// ---------------------------------------------------------------------------

const PRIORITY_DOT: Record<TaskPriority, string> = {
  high: '#ef4444',
  medium: '#facc15',
  low: '#22c55e',
}

const PRIORITY_LABEL: Record<TaskPriority, string> = {
  high: 'High',
  medium: 'Med',
  low: 'Low',
}

const TASK_TYPE_LABEL: Record<TaskType, string> = {
  content: 'Content',
  admin: 'Admin',
  tech: 'Tech',
  ads: 'Ads',
  seo: 'SEO',
  planning: 'Planning',
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface TaskCardProps {
  id: string
  title: string
  priority: TaskPriority
  taskType?: string | null
  estimatedMinutes?: number | null
  description?: string | null
  dueDate?: string | null
  clientId?: string | null
  clientName?: string | null
  isCompleted: boolean
  isPending: boolean
  isExpanded: boolean
  onToggle: () => void
  onToggleExpand: () => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TaskCard({
  title,
  priority,
  taskType,
  estimatedMinutes,
  description,
  dueDate,
  clientId,
  clientName,
  isCompleted,
  isPending,
  isExpanded,
  onToggle,
  onToggleExpand,
}: TaskCardProps) {
  const badgeColor = clientId ? getClientBadgeColor(clientId) : null

  const formattedDue = dueDate
    ? new Date(dueDate + 'T12:00:00').toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      })
    : null

  return (
    <div
      className={`bg-[#111111] border rounded-md transition-all ${
        isCompleted ? 'border-[#2a2a2a] opacity-50' : 'border-[#2a2a2a] hover:border-[#3a3a3a]'
      }`}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Checkbox */}
        <button
          onClick={onToggle}
          disabled={isPending}
          aria-label={isCompleted ? 'Mark incomplete' : 'Mark complete'}
          className="shrink-0 w-4 h-4 rounded border border-[#3a3a3a] flex items-center justify-center transition-colors hover:border-[#E8732A] disabled:opacity-40"
          style={
            isCompleted
              ? { backgroundColor: '#E8732A', borderColor: '#E8732A' }
              : {}
          }
        >
          {isCompleted && (
            <svg
              width="10"
              height="8"
              viewBox="0 0 10 8"
              fill="none"
              className="text-white"
            >
              <path
                d="M1 4L3.5 6.5L9 1"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </button>

        {/* Priority dot */}
        <span
          className="shrink-0 w-2 h-2 rounded-full"
          style={{ backgroundColor: PRIORITY_DOT[priority] }}
          title={PRIORITY_LABEL[priority] + ' priority'}
        />

        {/* Title */}
        <span
          className={`text-sm flex-1 min-w-0 ${
            isCompleted ? 'line-through text-[#555555]' : 'text-white'
          }`}
        >
          {title}
        </span>

        {/* Right side metadata */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Task type badge */}
          {taskType && TASK_TYPE_LABEL[taskType as TaskType] && (
            <span className="text-xs text-[#555555] hidden sm:block">
              {TASK_TYPE_LABEL[taskType as TaskType]}
            </span>
          )}

          {/* Due date */}
          {formattedDue && (
            <span className="text-xs text-[#555555] hidden md:block">{formattedDue}</span>
          )}

          {/* Estimated time */}
          {estimatedMinutes && (
            <span className="flex items-center gap-1 text-xs text-[#555555]">
              <Clock size={11} />
              {estimatedMinutes >= 60
                ? `${(estimatedMinutes / 60).toFixed(1).replace(/\.0$/, '')}h`
                : `${estimatedMinutes}m`}
            </span>
          )}

          {/* Client badge */}
          {clientName && badgeColor ? (
            <span
              className="text-xs px-2 py-0.5 rounded border font-medium"
              style={{
                backgroundColor: badgeColor.bg,
                color: badgeColor.text,
                borderColor: badgeColor.border,
              }}
            >
              {clientName.split(' ').slice(0, 2).join(' ')}
            </span>
          ) : (
            <span className="text-xs px-2 py-0.5 rounded border font-medium bg-[#1a1a1a] text-[#999999] border-[#2a2a2a]">
              Agency
            </span>
          )}

          {/* Expand toggle (only if description exists) */}
          {description ? (
            <button
              onClick={onToggleExpand}
              className="text-[#555555] hover:text-[#999999] transition-colors ml-1"
              aria-label={isExpanded ? 'Collapse' : 'Expand'}
            >
              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
          ) : (
            <span className="w-[22px]" />
          )}
        </div>
      </div>

      {/* Expanded description */}
      {isExpanded && description && (
        <div className="px-4 pb-3 pt-0 border-t border-[#1a1a1a]">
          <p className="text-xs text-[#999999] leading-relaxed mt-2">{description}</p>
        </div>
      )}
    </div>
  )
}
