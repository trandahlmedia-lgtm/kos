# KOS Phase 3.5 — Client Hub Rebuild & Content Workflow Refactor

**Author:** Claude (Opus) + Jay
**Date:** 2026-04-05
**Status:** APPROVED — Ready to build
**Estimated scope:** 15-20 files touched, ~2,500-3,500 lines changed

---

## Why This Phase Exists

KOS has solid backend infrastructure (auth, Supabase, Claude API, RLS, server actions) but the frontend doesn't match how Jay and Dylan actually work. The client hub is too shallow, the content workflow generates captions too early, and the agency-level view doesn't give a clear picture of what needs to happen across all clients. Phase 3.5 fixes this before Phase 4 (leads) builds on top of it.

---

## The Two Modes

### Agency View (Dashboard — `/`)
The broad view. "What does Konvyrt need to do today?"

- **Global content calendar** with client filter (replaces current content page as the default calendar)
- **Agency task list** — manual checklist for you and Dylan + AI-generated alerts (e.g., "Justin has no posts scheduled next week", "3 leads haven't been followed up in 5 days")
- **Client cards** — at-a-glance status per client (posts this week, upcoming gaps, retainer, lead count)

### Client View (Client Hub — `/clients/[id]`)
The immersive view. "Everything about this one client."

Click into a client and you're in their world. Tabbed interface:

| Tab | What's in it |
|-----|-------------|
| **Overview** | Key stats (MRR, tier, platforms, days as client, posts this month), website, phone, quick health indicators |
| **Content** | Client-scoped content calendar (week/day views), post slots, generate angles, upload creatives, write captions |
| **Tasks** | Simple checklist specific to this client — add items, check them off. No dates or assignees (keep it light) |
| **Leads** | This client's leads (once converted) — or leads associated with this business. Future Phase 4 integration point |
| **Brain** | The `claude_md` editor — the AI knowledge base for this client |
| **Settings** | Edit client info, posting frequency defaults, platform config, retainer/billing info |

---

## Content Workflow Refactor (The Big Change)

### Current Flow (what's wrong)
1. Pick a client + week → Generate
2. AI creates post slots AND auto-writes captions immediately
3. Captions are written without seeing any visuals
4. No way to give weekly strategic direction
5. Client website/phone not consistently used in captions

### New Flow (what we're building)

#### Step 1: Weekly Direction
User opens a client's Content tab → clicks "Plan This Week" → dialog with:
- **Week start date** (date picker, defaults to next Monday)
- **Free-text direction box** — "Easter week. Push Super Cleans at $120 instead of $160. Cross-post everything. Post every day."
- **Post count override** — defaults to client's `posting_frequency` setting, but can be bumped up (e.g., "7 posts this week instead of 5")
- Button: "Generate Angles"

#### Step 2: AI Generates Angles (NOT captions)
API returns a list of post angles/briefs:
```json
{
  "posts": [
    {
      "scheduled_date": "2026-04-06",
      "scheduled_time": "07:00",
      "platform": "instagram",
      "cross_post_platforms": ["facebook", "nextdoor"],
      "content_type": "offer",
      "format": "static",
      "angle": "Easter Super Clean special — $120 instead of $160. Clean house for the family gathering.",
      "visual_direction": "Before/after of a deep-cleaned kitchen. Bright, inviting. Price overlay.",
      "caption_brief": "Pain point: hosting family with a dirty house. Offer: $120 Super Clean. CTA: call now + website.",
      "ai_reasoning": "Easter Sunday — families hosting. Offer post with urgency. Cross-post all platforms for max reach."
    }
  ]
}
```

Posts are saved to DB with `status: 'slot'`. **No captions generated yet.**

#### Step 3: Jay Creates the Visual
Jay sees the angles in the client's content calendar. Each slot shows:
- The angle/brief
- Visual direction (what to create)
- An upload zone for the creative

Jay creates the graphic (in Canva, Photoshop, whatever) and uploads it to the post slot.

#### Step 4: AI Writes Captions (referencing the image)
Once an image is uploaded, a "Write Captions" button appears. AI now has:
- The client's `claude_md` (brand voice, services, audience)
- The client's website and phone number (from client profile)
- The angle/brief for this specific post
- The actual uploaded image (vision-capable prompt)
- The weekly direction notes

AI generates 3 caption options with **context-dependent CTAs**:
- **Offer/seasonal/social_proof posts** → Always include phone number + website + strong CTA
- **Education/BTS/trust/differentiator posts** → Softer CTA or no CTA, AI decides based on content

#### Step 5: Polish & Schedule
Jay picks the best caption (or edits), confirms, and schedules.

### Cross-Posting
When a post has `cross_post_platforms`, the system creates linked post records for each platform. Same creative, but captions are adapted per platform's style (Instagram = hashtags + emojis, Facebook = conversational, Nextdoor = neighborly, etc.). This happens when captions are generated — one API call produces platform-specific versions.

---

## Client Profile Enhancements

### New Fields on Client
The `website` and `phone` fields already exist on the Client type. We need to ensure:

1. **Website and phone are prominently visible** in the client hub overview
2. **Both are injected into every AI prompt** that generates content for this client — not buried in `claude_md` but passed as structured data
3. **Posting frequency defaults** become a client-level setting (already exists as `posting_frequency: Record<Platform, number>`) but needs a proper UI to edit it
4. **Weekly direction** is stored per-week so you can reference what you told the AI later

### New Database Table: `client_tasks`
```sql
CREATE TABLE client_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  sort_order INTEGER DEFAULT 0,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```
Simple checklist. No dates, no assignees, no priority. Just tasks and checkboxes.

### New Database Table: `weekly_directions`
```sql
CREATE TABLE weekly_directions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  week_start_date DATE NOT NULL,
  direction_text TEXT NOT NULL,
  post_count_override INTEGER,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(client_id, week_start_date)
);
```
Stores the free-text direction per client per week. AI prompts read from this. You can also look back and see "what did I tell the AI to do for Justin's Easter week?"

### New Database Table: `agency_tasks`
```sql
CREATE TABLE agency_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  sort_order INTEGER DEFAULT 0,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```
Same structure as client_tasks but not scoped to a client. Lives on the agency dashboard.

---

## Agency Dashboard Rebuild

### Current State
Basic stats cards (today's posts, active clients, overdue invoices). Not actionable.

### New Layout

**Top section: Agency Tasks + AI Alerts**
- Manual task checklist (agency_tasks table)
- AI alert cards that surface automatically:
  - "Justin has no content scheduled for next week"
  - "2 leads haven't been contacted in 5+ days"
  - "Sarah's retainer is $X but we only posted Y times this month"
  - These are computed on page load from existing data — no new AI calls needed

**Middle section: Global Content Calendar**
- Full calendar view with client color-coding
- Filter by client dropdown
- Click a post to open it in context

**Bottom section: Client Cards Grid**
- Each client shows: name, tier, MRR, posts this week, next gap, lead count
- Click to enter that client's hub

---

## Storage Upload Bug Fix

The upload route at `app/api/media/upload/route.ts` needs debugging. Likely causes:
1. Supabase storage bucket `kos-media` permissions/RLS policy
2. File path construction issue
3. Missing bucket or bucket not set to public/authenticated access

**Action:** Debug the actual error from Supabase, fix the storage policy or upload logic. This is a standalone fix, not tied to the workflow refactor.

---

## Post Status Workflow Cleanup

Current statuses: `slot → in_production → ready_for_review → sent_for_approval → approved → scheduled → published`

That's 7 stages. For a 2-person agency, that's too many. Proposed simplification:

| Status | Meaning | Visual |
|--------|---------|--------|
| `slot` | Angle generated, no creative yet | Empty/outline card |
| `in_production` | Creative being made or uploaded | Yellow indicator |
| `ready` | Creative + caption done, ready to schedule | Green indicator |
| `scheduled` | Scheduled for publishing | Blue indicator |
| `published` | Live | Muted/completed |

That's 5 stages. Dropped `ready_for_review`, `sent_for_approval`, `approved` — those make sense for a big agency with client approval loops, but you and Dylan don't need that overhead right now. If client approval becomes a thing later, we add it back.

**Note:** If you want to keep the approval flow for certain clients, we can make it optional per client (a `requires_approval` flag). But default should be the simpler 5-stage flow.

---

## Files Touched

### New Files
| File | Purpose |
|------|---------|
| `supabase/migrations/003_phase3_5.sql` | New tables: client_tasks, weekly_directions, agency_tasks |
| `lib/actions/clientTasks.ts` | Server actions for client task CRUD |
| `lib/actions/agencyTasks.ts` | Server actions for agency task CRUD |
| `lib/actions/weeklyDirections.ts` | Server actions for saving/fetching weekly direction |
| `components/clients/ClientContentTab.tsx` | Client-scoped content calendar + generation UI |
| `components/clients/ClientTasksTab.tsx` | Simple task checklist component |
| `components/clients/ClientOverviewTab.tsx` | Rebuilt overview with stats, website, phone, health |
| `components/clients/ClientSettingsTab.tsx` | Edit posting frequency, retainer, platform config |
| `components/clients/WeeklyDirectionDialog.tsx` | Dialog for entering weekly direction + generating angles |
| `components/dashboard/AgencyTaskList.tsx` | Agency-level task checklist |
| `components/dashboard/AIAlerts.tsx` | Computed alerts from client/post/lead data |
| `components/dashboard/GlobalCalendar.tsx` | Full calendar with client filter |
| `components/dashboard/DashboardClient.tsx` | New dashboard client component |

### Modified Files
| File | Change |
|------|--------|
| `app/(dashboard)/page.tsx` | Rebuild to new agency dashboard layout |
| `app/(dashboard)/clients/[id]/page.tsx` | New tab structure, fetch additional data |
| `components/clients/ClientHubClient.tsx` | Major refactor — new tabbed layout with Content, Tasks, Leads, Brain, Settings |
| `lib/ai/prompts/weeklyPlan.ts` | Add weekly direction injection, add visual_direction field, remove caption auto-gen trigger |
| `lib/ai/prompts/captions.ts` | Add image reference support, add website/phone as structured fields, context-dependent CTA logic |
| `app/api/ai/weekly-plan/route.ts` | Accept weekNotes field, pass to prompt, don't trigger batch captions |
| `app/api/ai/captions/route.ts` | Accept image data, include client website/phone explicitly |
| `app/api/media/upload/route.ts` | Debug and fix storage upload failure |
| `components/content/SchedulePanel.tsx` | Simplify status workflow, add "Write Captions" button post-upload |
| `components/content/PostCard.tsx` | Show angle/brief prominently, show upload zone when no creative |
| `components/content/CreativeUploader.tsx` | Post-upload trigger for caption generation |
| `components/workflows/WorkflowsPageClient.tsx` | Update WeeklyPlanDialog to match new flow |
| `types/index.ts` | Add ClientTask, AgencyTask, WeeklyDirection types. Possibly simplify PostStatus. |
| `lib/ai/claude.ts` | Add MODEL.fast (Haiku) for caption generation |

### Untouched
- Auth system (`proxy.ts`, `lib/actions/auth.ts`)
- Supabase client setup (`lib/supabase/*`)
- Security infrastructure (`lib/security/*`)
- shadcn/ui components (`components/ui/*`)
- Design system (`globals.css`)
- Config files (`next.config.ts`, `tsconfig.json`, etc.)

---

## Build Order

### Block 1: Foundation (do first)
1. Database migration — new tables (client_tasks, weekly_directions, agency_tasks)
2. Types update — new interfaces, PostStatus simplification decision
3. Server actions — CRUD for client tasks, agency tasks, weekly directions
4. `lib/ai/claude.ts` — add MODEL.fast (Haiku)
5. Fix storage upload bug (standalone)

### Block 2: Content Workflow Refactor
6. Update `weeklyPlan.ts` prompt — add weekly direction, visual_direction, remove auto-caption trigger
7. Update `captions.ts` prompt — structured website/phone injection, image reference, context-dependent CTAs
8. Update weekly plan API route — accept weekNotes, don't auto-trigger captions
9. Update captions API route — accept image data, use client website/phone explicitly
10. Update caption generation to produce platform-specific versions for cross-posts

### Block 3: Client Hub Rebuild
11. New ClientOverviewTab — stats, website, phone, health indicators
12. New ClientContentTab — client-scoped calendar, "Plan This Week" with direction dialog, upload-then-caption flow
13. New ClientTasksTab — simple checklist
14. New ClientSettingsTab — posting frequency editor, retainer, platform config
15. Refactor ClientHubClient — new tab layout wiring everything together
16. Update client [id] page — fetch tasks, weekly directions, pass to new components

### Block 4: Agency Dashboard Rebuild
17. New AgencyTaskList component
18. New AIAlerts component (computed from existing data)
19. New GlobalCalendar with client filter
20. Rebuild dashboard page with new layout

### Block 5: Polish & Bug Fixes
21. PostCard/SchedulePanel updates — simplified status, "Write Captions" button, angle display
22. Post status workflow cleanup across all components
23. Lint + build pass
24. End-to-end testing of the new content generation flow

---

## What This Does NOT Include
- Leads kanban drag-and-drop (Phase 4 — but the client hub now has a Leads tab ready for it)
- Ad spend tracking / Meta integration (future)
- Client approval portal (not needed for 2-person team)
- Mobile layout (desktop only per spec)
- Notifications system (future)

---

## Decisions (Locked)

1. **Post status** — 5-stage simplified flow: `slot → in_production → ready → scheduled → published`. No approval stages for now.

2. **Cross-posting** — One post card per graphic in the calendar, with platform badges showing which platforms it's going to. Clicking the card opens a detail view that shows one caption card per platform (same creative, platform-adapted copy). No duplicate calendar entries.

3. **Image-aware captions** — Yes. Claude uses the vision API to analyze the uploaded creative. Beyond just writing captions, it can flag improvements to ad copy text in the graphic and comment on visual placement/hierarchy. This surfaces as a "visual notes" field alongside the caption options.
