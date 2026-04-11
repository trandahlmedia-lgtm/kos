'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { type Post } from '@/types'

interface StepCalendarProps {
  clientId: string
  clientName: string
  posts: Post[]
  selectedDate: string
  onSelect: (date: string) => void
}

const DOW_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

// Returns YYYY-MM-DD for a local Date
function toISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// Build a 6×7 grid of dates for the given year/month.
// Each cell is { date: string; inMonth: boolean }
function buildMonthGrid(year: number, month: number) {
  // month is 0-indexed
  const firstDay = new Date(year, month, 1)
  // getDay(): 0=Sun…6=Sat. We want Mon=0 so shift.
  const startOffset = (firstDay.getDay() + 6) % 7 // 0=Mon, 6=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const cells: { date: string; inMonth: boolean }[] = []

  // Leading days from prev month
  for (let i = startOffset - 1; i >= 0; i--) {
    const d = new Date(year, month, -i)
    cells.push({ date: toISODate(d), inMonth: false })
  }

  // Days in current month
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: toISODate(new Date(year, month, d)), inMonth: true })
  }

  // Trailing days to complete 6 rows (42 cells)
  let trailing = 1
  while (cells.length < 42) {
    cells.push({ date: toISODate(new Date(year, month + 1, trailing++)), inMonth: false })
  }

  return cells
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export function StepCalendar({
  clientId,
  clientName,
  posts,
  selectedDate,
  onSelect,
}: StepCalendarProps) {
  const now = new Date()
  const [viewYear, setViewYear] = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth())

  const today = toISODate(now)

  // Build set: date → count of this client's posts on that date
  const postCountByDate: Record<string, number> = {}
  for (const p of posts) {
    if (p.client_id === clientId && p.scheduled_date) {
      postCountByDate[p.scheduled_date] = (postCountByDate[p.scheduled_date] ?? 0) + 1
    }
  }

  const grid = buildMonthGrid(viewYear, viewMonth)

  function prevMonth() {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1)
      setViewMonth(11)
    } else {
      setViewMonth((m) => m - 1)
    }
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1)
      setViewMonth(0)
    } else {
      setViewMonth((m) => m + 1)
    }
  }

  return (
    <div className="w-full">
      {/* Heading */}
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold text-white">When should this go out?</h2>
        <p className="text-sm text-[#555555] mt-1">{clientName}</p>
      </div>

      {/* Month navigator */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={prevMonth}
          className="w-8 h-8 flex items-center justify-center text-[#555555] hover:text-white bg-[#111111] border border-[#2a2a2a] rounded-md transition-colors"
          aria-label="Previous month"
        >
          <ChevronLeft size={15} />
        </button>

        <span className="text-sm font-medium text-white">
          {MONTH_NAMES[viewMonth]} {viewYear}
        </span>

        <button
          onClick={nextMonth}
          className="w-8 h-8 flex items-center justify-center text-[#555555] hover:text-white bg-[#111111] border border-[#2a2a2a] rounded-md transition-colors"
          aria-label="Next month"
        >
          <ChevronRight size={15} />
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 mb-1">
        {DOW_LABELS.map((d) => (
          <div key={d} className="text-center text-[10px] font-medium text-[#555555] py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {grid.map(({ date, inMonth }) => {
          const isSelected = date === selectedDate
          const isToday = date === today
          const postCount = postCountByDate[date] ?? 0
          const isPast = date < today

          return (
            <button
              key={date}
              onClick={() => onSelect(date)}
              className={[
                'relative flex flex-col items-center justify-start pt-2 pb-1 min-h-[72px] rounded-sm border transition-colors',
                'focus:outline-none',
                isSelected
                  ? 'bg-[#E8732A]/10 border-[#E8732A]'
                  : 'bg-[#111111] border-[#2a2a2a] hover:border-[#E8732A]',
                !inMonth ? 'opacity-25' : isPast ? 'opacity-50' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {/* Day number */}
              <span
                className={[
                  'text-xs font-medium leading-none',
                  isSelected
                    ? 'text-[#E8732A]'
                    : isToday
                    ? 'text-white underline underline-offset-2 decoration-[#E8732A]'
                    : inMonth
                    ? 'text-white'
                    : 'text-[#333333]',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                {new Date(date + 'T12:00:00').getDate()}
              </span>

              {/* Post dots */}
              {postCount > 0 && (
                <div className="flex items-center gap-0.5 mt-1.5 flex-wrap justify-center px-1">
                  {Array.from({ length: Math.min(postCount, 3) }).map((_, i) => (
                    <div
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-[#E8732A]"
                    />
                  ))}
                  {postCount > 3 && (
                    <span className="text-[9px] text-[#E8732A] leading-none">+{postCount - 3}</span>
                  )}
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Selected date label */}
      <p className="mt-4 text-center text-xs text-[#555555] h-4">
        {selectedDate
          ? new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })
          : 'Select a date'}
      </p>
    </div>
  )
}
