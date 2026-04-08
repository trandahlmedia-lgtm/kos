'use client'

import { useState } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Plus, ChevronLeft, ChevronRight, Sparkles, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { WhatNextQueue } from './WhatNextQueue'
import { WeeklyCalendar, DayView } from './WeeklyCalendar'
import { SchedulePanel } from './SchedulePanel'
import { PostDialog } from './PostDialog'
import { type Post, type Client } from '@/types'

interface ContentPageClientProps {
  posts: Post[]
  clients: Client[]
  profiles: { id: string; name: string }[]
  signedUrlMap: Record<string, string>
  weekDates: string[]
  today: string
}

export function ContentPageClient({
  posts,
  clients,
  profiles,
  signedUrlMap,
  weekDates,
  today,
}: ContentPageClientProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Read URL-driven state
  const view = (searchParams.get('view') ?? 'queue') as 'queue' | 'calendar'
  const calView = (searchParams.get('calview') ?? 'week') as 'week' | 'day'
  const selectedClientId = searchParams.get('client') ?? 'all'
  const selectedDay = searchParams.get('day') ?? today

  // Local UI state
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null)
  const [postDialogOpen, setPostDialogOpen] = useState(false)
  const [newPostDefaults, setNewPostDefaults] = useState<{ clientId?: string; date?: string }>({})

  // Generate week state
  const [generating, setGenerating] = useState(false)
  const [generateStep, setGenerateStep] = useState<'plan' | 'captions' | null>(null)
  const [generateError, setGenerateError] = useState('')

  // Derived: find the currently selected post from the posts list (fresh after router.refresh)
  const selectedPost = selectedPostId ? (posts.find((p) => p.id === selectedPostId) ?? null) : null
  const selectedPostThumbnail = selectedPost?.media?.[0]
    ? signedUrlMap[selectedPost.media[0].thumbnail_path ?? ''] ??
      signedUrlMap[selectedPost.media[0].storage_path] ??
      undefined
    : undefined

  // Detect "week complete" for the selected client in the current week
  const weekCompleteClients = getWeekCompleteClients(posts, clients, weekDates)

  // URL navigation helpers
  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set(key, value)
    router.replace(`${pathname}?${params.toString()}`)
  }

  function setView(v: 'queue' | 'calendar') { setParam('view', v) }
  function setCalView(v: 'week' | 'day') { setParam('calview', v) }
  function setClient(id: string) { setParam('client', id) }

  function navigateWeek(direction: -1 | 1) {
    const current = new Date(weekDates[0] + 'T12:00:00')
    current.setDate(current.getDate() + direction * 7)
    setParam('week', current.toISOString().split('T')[0])
  }

  function navigateDay(direction: -1 | 1) {
    const current = new Date(selectedDay + 'T12:00:00')
    current.setDate(current.getDate() + direction)
    setParam('day', current.toISOString().split('T')[0])
  }

  function openNewPost(clientId?: string, date?: string) {
    setNewPostDefaults({ clientId, date })
    setPostDialogOpen(true)
  }

  function handleRefresh() { router.refresh() }

  async function handleGenerateWeek() {
    if (selectedClientId === 'all') return
    setGenerating(true)
    setGenerateStep('plan')
    setGenerateError('')

    try {
      // Step 1: Generate weekly plan
      const planRes = await fetch('/api/ai/weekly-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: selectedClientId, weekStartDate: weekDates[0] }),
      })

      const planData = (await planRes.json()) as { postIds?: string[]; error?: string }

      if (!planRes.ok || !planData.postIds?.length) {
        setGenerateError(planData.error ?? 'Failed to generate plan.')
        return
      }

      // Step 2: Batch generate captions for all new posts
      setGenerateStep('captions')
      await fetch('/api/ai/captions/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postIds: planData.postIds }),
      })

      router.refresh()
    } catch {
      setGenerateError('Network error. Please try again.')
    } finally {
      setGenerating(false)
      setGenerateStep(null)
    }
  }

  function handleGenerateNextWeek(clientId: string) {
    const nextMonday = getNextMonday(weekDates[weekDates.length - 1] ?? today)
    const params = new URLSearchParams(searchParams.toString())
    params.set('client', clientId)
    params.set('week', nextMonday)
    router.push(`${pathname}?${params.toString()}`)
    // Trigger after navigation (user will click the button again on the new week)
  }

  // Filter posts for the current view
  const filteredPosts = selectedClientId === 'all'
    ? posts
    : posts.filter((p) => p.client_id === selectedClientId)

  const filteredClients = selectedClientId === 'all'
    ? clients
    : clients.filter((c) => c.id === selectedClientId)

  const dayPosts = filteredPosts.filter((p) => p.scheduled_date === selectedDay)

  const tabClass = (active: boolean) =>
    `px-3 py-1.5 text-sm font-medium rounded transition-colors ${
      active ? 'text-white bg-[#1a1a1a]' : 'text-[#555555] hover:text-[#999999]'
    }`

  const selectedClient = selectedClientId !== 'all'
    ? clients.find((c) => c.id === selectedClientId)
    : null

  const generateLabel = generating
    ? generateStep === 'plan'
      ? 'Building plan…'
      : 'Writing captions…'
    : 'Generate This Week'

  return (
    <div className="p-8">
      {/* Top controls bar */}
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          {/* Client filter */}
          <select
            value={selectedClientId}
            onChange={(e) => setClient(e.target.value)}
            className="h-8 px-3 rounded-md bg-[#1a1a1a] border border-[#2a2a2a] text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#E8732A]"
          >
            <option value="all">All Clients</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          {/* View toggle: Queue | Calendar */}
          <div className="flex items-center gap-1 bg-[#0a0a0a] border border-[#2a2a2a] rounded p-0.5">
            <button className={tabClass(view === 'queue')} onClick={() => setView('queue')}>Queue</button>
            <button className={tabClass(view === 'calendar')} onClick={() => setView('calendar')}>Calendar</button>
          </div>

          {/* Calendar sub-nav */}
          {view === 'calendar' && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-[#0a0a0a] border border-[#2a2a2a] rounded p-0.5">
                <button className={tabClass(calView === 'week')} onClick={() => setCalView('week')}>Week</button>
                <button className={tabClass(calView === 'day')} onClick={() => setCalView('day')}>Day</button>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => calView === 'week' ? navigateWeek(-1) : navigateDay(-1)}
                  className="w-7 h-7 flex items-center justify-center text-[#555555] hover:text-white bg-[#1a1a1a] border border-[#2a2a2a] rounded transition-colors"
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  onClick={() => {
                    if (calView === 'week') setParam('week', getMondayOfWeek(today))
                    else setParam('day', today)
                  }}
                  className="px-2 h-7 text-xs text-[#555555] hover:text-white bg-[#1a1a1a] border border-[#2a2a2a] rounded transition-colors"
                >
                  Today
                </button>
                <button
                  onClick={() => calView === 'week' ? navigateWeek(1) : navigateDay(1)}
                  className="w-7 h-7 flex items-center justify-center text-[#555555] hover:text-white bg-[#1a1a1a] border border-[#2a2a2a] rounded transition-colors"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
              {calView === 'week' && weekDates.length === 7 && (
                <span className="text-xs text-[#555555]">
                  {formatWeekRange(weekDates[0], weekDates[6])}
                </span>
              )}
              {calView === 'day' && (
                <span className="text-xs text-[#555555]">
                  {new Date(selectedDay + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {/* Generate This Week — only when a specific client is selected */}
          {selectedClientId !== 'all' && (
            <Button
              onClick={handleGenerateWeek}
              disabled={generating}
              className="bg-[#1a1a1a] hover:bg-[#222222] text-white border border-[#2a2a2a] h-8 px-3 text-sm gap-1.5 disabled:opacity-50"
            >
              <Sparkles size={13} className={`text-[#E8732A] ${generating ? 'animate-pulse' : ''}`} />
              {generateLabel}
            </Button>
          )}

          <Button
            onClick={() => openNewPost(selectedClientId !== 'all' ? selectedClientId : undefined)}
            className="bg-[#E8732A] hover:bg-[#d4621f] text-white border-0 h-8 px-3 text-sm"
          >
            <Plus size={14} className="mr-1.5" />
            New Post
          </Button>
        </div>
      </div>

      {/* Generate error */}
      {generateError && (
        <div className="mb-4 p-3 bg-red-400/10 border border-red-400/20 rounded-md text-sm text-red-400">
          {generateError}
        </div>
      )}

      {/* Week complete banner */}
      {selectedClientId !== 'all' && weekCompleteClients.includes(selectedClientId) && (
        <div className="mb-4 p-3 bg-green-400/10 border border-green-400/20 rounded-md flex items-center justify-between">
          <span className="text-sm text-green-400">This week is fully planned for {selectedClient?.name}.</span>
          <button
            onClick={() => handleGenerateNextWeek(selectedClientId)}
            className="flex items-center gap-1 text-sm text-[#E8732A] hover:text-[#d4621f] transition-colors"
          >
            Plan next week <ArrowRight size={14} />
          </button>
        </div>
      )}

      {/* Main content */}
      {view === 'queue' ? (
        <WhatNextQueue
          posts={filteredPosts}
          clients={filteredClients}
          signedUrlMap={signedUrlMap}
          profiles={profiles}
          onPostClick={(post) => setSelectedPostId(post.id)}
          onRefresh={handleRefresh}
          onNewPost={() => openNewPost(selectedClientId !== 'all' ? selectedClientId : undefined)}
        />
      ) : calView === 'week' ? (
        <WeeklyCalendar
          weekDates={weekDates}
          posts={filteredPosts}
          clients={filteredClients}
          onPostClick={(post) => setSelectedPostId(post.id)}
          onCellClick={(clientId, date) => openNewPost(clientId, date)}
        />
      ) : (
        <DayView
          date={selectedDay}
          posts={dayPosts}
          clients={filteredClients}
          signedUrlMap={signedUrlMap}
          profiles={profiles}
          onPostClick={(post) => setSelectedPostId(post.id)}
          onRefresh={handleRefresh}
        />
      )}

      {/* Schedule panel (slide-over for selected post) */}
      <SchedulePanel
        post={selectedPost}
        clientName={selectedPost ? clients.find((c) => c.id === selectedPost.client_id)?.name : undefined}
        thumbnailUrl={selectedPostThumbnail}
        profiles={profiles}
        open={!!selectedPost}
        onClose={() => setSelectedPostId(null)}
      />

      {/* New/Edit post dialog */}
      <PostDialog
        open={postDialogOpen}
        onOpenChange={setPostDialogOpen}
        defaultClientId={newPostDefaults.clientId}
        defaultDate={newPostDefaults.date}
        clients={clients}
        profiles={profiles}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

function getWeekCompleteClients(posts: Post[], clients: Client[], weekDates: string[]): string[] {
  return clients
    .filter((c) => {
      const freq = c.posting_frequency
      if (!freq) return false
      const totalExpected = Object.values(freq).reduce((sum: number, n) => sum + (n as number), 0)
      if (totalExpected === 0) return false
      const clientPosts = posts.filter(
        (p) => p.client_id === c.id && weekDates.includes(p.scheduled_date ?? '')
      )
      return clientPosts.length >= totalExpected
    })
    .map((c) => c.id)
}

function getNextMonday(fromDate: string): string {
  const d = new Date(fromDate + 'T12:00:00')
  const day = d.getDay()
  const diff = day === 1 ? 7 : (8 - day) % 7 || 7
  d.setDate(d.getDate() + diff)
  return d.toISOString().split('T')[0]
}

function getMondayOfWeek(isoDate: string): string {
  const d = new Date(isoDate + 'T12:00:00')
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d.toISOString().split('T')[0]
}

function formatWeekRange(start: string, end: string): string {
  const s = new Date(start + 'T12:00:00')
  const e = new Date(end + 'T12:00:00')
  const sMonth = s.toLocaleDateString('en-US', { month: 'short' })
  const eMonth = e.toLocaleDateString('en-US', { month: 'short' })
  if (sMonth === eMonth) {
    return `${sMonth} ${s.getDate()} – ${e.getDate()}`
  }
  return `${sMonth} ${s.getDate()} – ${eMonth} ${e.getDate()}`
}