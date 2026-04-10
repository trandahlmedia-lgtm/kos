import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import { ContentPageClient } from '@/components/content/ContentPageClient'

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

// ---------------------------------------------------------------------------
// Date helpers (server-side)
// ---------------------------------------------------------------------------

function getMondayOfWeek(isoDate: string): string {
  const d = new Date(isoDate + 'T12:00:00')
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d.toISOString().split('T')[0]
}

function addDays(isoDate: string, n: number): string {
  const d = new Date(isoDate + 'T12:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

function buildWeekDates(monday: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i))
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function ContentPage({ searchParams }: Props) {
  const params = await searchParams
  const supabase = await createClient()

  const today = new Date().toISOString().split('T')[0]
  const view = (params.view as string) ?? 'queue'

  // Week for calendar view — derived from ?week= param or current week
  const rawWeek = (params.week as string) ?? getMondayOfWeek(today)
  const weekStart = getMondayOfWeek(rawWeek)   // normalise in case param isn't a Monday
  const weekEnd = addDays(weekStart, 6)
  const weekDates = buildWeekDates(weekStart)

  // Clients and profiles (profiles via adminClient to bypass RLS)
  const [{ data: clients }, { data: profiles }] = await Promise.all([
    supabase.from('clients').select('*').eq('status', 'active').order('name'),
    adminClient.from('profiles').select('id, name').order('name'),
  ])

  // Posts — queue loads all non-old posts; calendar loads just the visible week
  let postsQuery = supabase
    .from('posts')
    .select('*, captions(*), media(id, thumbnail_path, storage_path, media_type), visual:post_visuals(id, post_id, client_id, generated_html, creative_brief, layout_recipe, slide_count, color_palette, photo_slots, font_pair, export_status, exported_at, notes, generation_mode, created_at, updated_at)')

  if (view === 'calendar') {
    postsQuery = postsQuery
      .gte('scheduled_date', weekStart)
      .lte('scheduled_date', weekEnd)
  } else {
    // Queue: exclude posts published more than 7 days ago
    const sevenDaysAgo = addDays(today, -7)
    postsQuery = postsQuery.or(
      `status.neq.published,published_at.gte.${sevenDaysAgo}`
    )
  }

  const { data: posts } = await postsQuery
    .order('scheduled_date', { ascending: true })
    .order('scheduled_time', { ascending: true, nullsFirst: false })

  // Batch-generate signed URLs for all media thumbnails (1-hour expiry)
  const thumbnailPaths = (posts ?? [])
    .flatMap((p) => p.media ?? [])
    .map((m: { thumbnail_path?: string; storage_path: string }) =>
      m.thumbnail_path ?? m.storage_path
    )
    .filter(Boolean) as string[]

  const signedUrlMap: Record<string, string> = {}

  if (thumbnailPaths.length > 0) {
    const { data: signedUrls } = await adminClient.storage
      .from('kos-media')
      .createSignedUrls(thumbnailPaths, 3600)

    signedUrls?.forEach(({ path, signedUrl }: { path: string | null; signedUrl: string }) => {
      if (path && signedUrl) signedUrlMap[path] = signedUrl
    })
  }

  return (
    <ContentPageClient
      posts={posts ?? []}
      clients={clients ?? []}
      profiles={profiles ?? []}
      signedUrlMap={signedUrlMap}
      weekDates={weekDates}
      today={today}
    />
  )
}
