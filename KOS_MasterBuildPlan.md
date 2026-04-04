# KOS Master Build Plan
## Step-by-step execution guide for Claude Code

Read CLAUDE.md first. This plan assumes you've read and understood it completely.

**Kick-off prompt for Claude Code:**
```
Read CLAUDE.md in the current directory first. Then read KOS_MasterBuildPlan.md.
Execute the build phase by phase, starting with Phase 1. Work through each step in order.
Do not skip steps. Do not build anything outside the current phase scope.
Ask me if you hit a blocker that requires a decision not covered in the docs.
```

---

## PRE-BUILD CHECKLIST

Before starting any build session, confirm these are done:

- [ ] GitHub repo created: `https://github.com/trandahlmedia-lgtm/kos.git`
- [ ] Supabase project created (US East, N. Virginia)
- [ ] Supabase anon key + URL grabbed from project settings
- [ ] Supabase service_role key grabbed and stored securely (not in code)
- [ ] Supabase users created for Jay and Dylan via Supabase dashboard
- [ ] Anthropic API key grabbed from `console.anthropic.com`
- [ ] Vercel account created at `vercel.com` and linked to GitHub
- [ ] Node.js 18+ installed locally
- [ ] Git configured locally

---

## PHASE 1 — Foundation
**Goal:** Jay and Dylan can log in, create a client, write their CLAUDE.md, and check off onboarding steps.
**Estimated sessions:** 1-2 Claude Code sessions

### Step 1 — Project Initialization

```bash
npx create-next-app@latest kos \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --no-src-dir \
  --import-alias "@/*"

cd kos
npm install @supabase/supabase-js @supabase/ssr
npm install @radix-ui/react-icons lucide-react
npm install class-variance-authority clsx tailwind-merge
npm install @tanstack/react-query
npx shadcn-ui@latest init
```

shadcn init options: Default style, Slate base color, yes to CSS variables.

Then add components:
```bash
npx shadcn-ui@latest add button input label textarea card tabs badge dialog sheet dropdown-menu avatar separator skeleton toast
```

### Step 2 — Environment Variables

Create `.env.local` in project root:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
ANTHROPIC_API_KEY=your_anthropic_key
```

Add `.env.local` to `.gitignore` (should already be there from create-next-app).

### Step 3 — Supabase Setup

Create the three client files from CLAUDE.md section 4.3 exactly as written:
- `lib/supabase/client.ts`
- `lib/supabase/server.ts`
- `lib/supabase/admin.ts`
- `lib/supabase/middleware.ts`

Create `middleware.ts` at project root (section 4.4).

### Step 4 — Database Migrations

In Supabase dashboard → SQL Editor, run migrations from CLAUDE.md section 5.1 in this order:

1. `profiles` table + trigger
2. `clients` table
3. `leads` table
4. `onboarding_steps` table
5. `platform_setups` table
6. `filming_sessions` table
7. `posts` table
8. `captions` table
9. `media` table
10. `ai_runs` table
11. `invoices` table
12. `activity_log` table

After all tables are created, enable Realtime (section 10):
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE posts;
ALTER PUBLICATION supabase_realtime ADD TABLE leads;
ALTER PUBLICATION supabase_realtime ADD TABLE clients;
```

Create the storage bucket:
- Name: `kos-media`
- Public: false (private)
- Apply the RLS policies from section 5.2

### Step 5 — Design System Configuration

Update `tailwind.config.ts` to include KOS design tokens:

```typescript
extend: {
  colors: {
    background: '#0a0a0a',
    surface: '#111111',
    'surface-elevated': '#1a1a1a',
    border: '#2a2a2a',
    'text-primary': '#ffffff',
    'text-secondary': '#999999',
    'text-muted': '#555555',
    accent: '#E8732A',
    'accent-hover': '#d4621f',
    navy: '#1B2A4A',
  },
  fontFamily: {
    sans: ['Inter', 'sans-serif'],
  },
}
```

Update `app/globals.css`:
```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

:root {
  --background: #0a0a0a;
  --surface: #111111;
  /* etc — map all tokens as CSS vars */
}

body {
  background-color: var(--background);
  color: #ffffff;
}
```

Update `next.config.js` with security headers from CLAUDE.md section 4.7.

### Step 6 — Auth Pages

Build `app/(auth)/login/page.tsx`:
- Centered card on dark background
- KOS logo/wordmark (text: "KOS" in accent color, "Konvyrt Operating System" in muted)
- Email + password form
- Submit calls `supabase.auth.signInWithPassword()`
- On success, redirects to `/`
- On error, shows inline error message
- No "sign up" link — access is invite-only

### Step 7 — App Layout

Build `app/(dashboard)/layout.tsx`:
- Fixed left sidebar (240px wide, `surface` background)
- Main content area (fills remaining width, `background` color)
- Sidebar contains:
  - KOS logo at top
  - Nav links with icons (using lucide-react):
    - Dashboard (LayoutDashboard icon)
    - Clients (Users icon)
    - Content (CalendarDays icon)
    - Leads (TrendingUp icon)
    - Workflows (Zap icon)
    - Media (Image icon)
    - Billing (Receipt icon)
  - User avatar + name at bottom with sign-out option
- Active state: accent color left border + accent text
- Layout must check auth — if not logged in, redirect to `/login`

### Step 8 — Dashboard Home (Shell)

Build `app/(dashboard)/page.tsx`:

- Toggle between "Today" and "Overview" at top (two text tabs, accent underline on active)
- **Today view (default):**
  - "What's going out today" section — posts scheduled for today across all clients
  - Each item shows: client name, platform icon, time, status badge, caption preview
  - "Needs attention" section — posts with no creative, overdue slots, clients with no content in 7+ days
  - Empty state if nothing scheduled ("All clear today")
- **Overview (agency scorecard):**
  - MRR card (sum of all active client MRR)
  - Active clients count
  - Client health table: one row per client showing name, tier, last post date, days active, health status
  - Health status = green if posted in last 7 days, yellow if 8-14 days, red if 15+ days
  - Outstanding invoices count + total
  - Placeholder cards for content volume and team workload (Phase 6)

Data for this page comes from Supabase queries — keep it simple in Phase 1 (basic counts and lists).

### Step 9 — Client List Page

Build `app/(dashboard)/clients/page.tsx`:

- Page header: "Clients" + "New Client" button (accent, top right)
- Client cards in a 2-column grid:
  - Client name (large)
  - Tier badge (color-coded)
  - MRR
  - Status dot (green = active)
  - Last post date
  - Primary producer avatar
  - Click to go to client hub
- "New Client" opens a Dialog:
  - Fields: Name, Email, Phone, Website, Tier (select), MRR, Contract start date, Primary producer (Jay or Dylan), Platforms (multi-select checkboxes)
  - Submit creates client record + auto-generates onboarding steps based on tier (see CLAUDE.md section 8.4)
  - After creation, redirect to the new client's hub page

### Step 10 — Client Hub

Build `app/(dashboard)/clients/[id]/page.tsx` with 3 tabs using shadcn Tabs component:

**Tab 1 — Overview:**
- Client name as page heading
- Info grid: tier, MRR, contract start, primary producer, status, days as client, platforms
- Quick stats: posts this month, last post date, onboarding completion %
- "Edit client" button opens same form as creation (pre-filled)

**Tab 2 — Brand Doc:**
- Full-width, monospace-font textarea (or CodeMirror if available)
- Displays and edits `client.claude_md`
- Yellow banner at top: "This document is read by all AI workflows. Keep it accurate."
- "Save" button — saves to `clients.claude_md` column
- "Generate with AI" button — disabled in Phase 1, active in Phase 3

**Tab 3 — Onboarding:**
- Progress bar (completed steps / total steps)
- Checklist of `onboarding_steps` for this client
- Each step: checkbox, title, description, assigned-to badge (Jay or Dylan), completed timestamp
- Checking a step updates `completed = true`, `completed_at = now()`, `completed_by = current_user`
- Steps sorted by `sort_order`

### Step 11 — TypeScript Types + Error Handling

- Create `types/index.ts` with all types from CLAUDE.md section 7
- Add `app/(dashboard)/error.tsx` — generic error boundary for dashboard routes
- Add `app/(dashboard)/loading.tsx` — skeleton loader for dashboard routes
- Add `app/(auth)/error.tsx` — error state for login

### Step 12 — Vercel Deployment

```bash
# Push to GitHub
git add .
git commit -m "Phase 1 — Foundation complete"
git push origin main
```

In Vercel:
1. Import GitHub repo
2. Set all environment variables from `.env.local`
3. Deploy
4. Confirm Jay and Dylan can both log in at the Vercel URL

**Phase 1 is complete when:**
- Jay and Dylan can log in
- They can create a client
- They can write that client's CLAUDE.md
- They can check off onboarding steps
- It's deployed and accessible at the Vercel URL

---

## PHASE 2 — Content Engine
**Goal:** The full content production and scheduling workflow is operational. Jay can manage his entire content pipeline from KOS.
**Estimated sessions:** 2-3 Claude Code sessions

### Step 1 — Post Card Component

Build `components/content/PostCard.tsx`:

The post card is the core unit of content. Each card displays:
- Platform icon (top left)
- Content type label
- Status badge (color-coded: slot=muted, in_production=yellow, ready_for_review=blue, sent_for_approval=orange, approved=green, scheduled=green+check, published=accent)
- Creative thumbnail (if creative attached — image or video thumbnail) OR a dashed upload zone
- Caption preview (first 80 chars of selected caption)
- AI reasoning line (italic, muted, below caption)
- Assigned-to avatar
- Scheduled date/time
- Three-dot menu: Edit, Duplicate, Delete, Mark Published

Click anywhere on card (except three-dot menu) → open Schedule Panel (see Step 4).

### Step 2 — Content Calendar Views

Build `app/(dashboard)/content/page.tsx`:

Top controls:
- Client selector dropdown (filters to one client or "All Clients")
- "Week" / "Day" view toggle
- Date navigation (prev/next arrows, "Today" button)
- "New Post" button

**Weekly Grid View (default):**
- 7 columns (Mon-Sun) × N rows (one per client, or one row if client filtered)
- Each cell shows posts for that client on that day
- Post shown as a small pill: platform icon + content type + status dot
- Click a cell with no posts → create new post for that date/client
- Click an existing pill → open that post card

**Daily View:**
- Full list of all posts going out today, in time order
- Full PostCard displayed for each (not pills — full cards)
- Group by client

### Step 3 — Post Creation / Editing

Post creation form (Dialog or slide-in panel):
- Platform (select)
- Content type (select)
- Scheduled date + time (date picker)
- Assigned to (Jay/Dylan)
- Caption (manual entry, or generate with AI in Phase 3)
- CTA + phone number (pull from client's CLAUDE.md if possible)
- Hashtags

### Step 4 — Schedule Panel (Slide-in)

Build `components/content/SchedulePanel.tsx`:

Triggered by clicking a post card. Slides in from the right (Sheet component from shadcn).

Panel contents:
- Creative thumbnail (full preview) OR "No creative yet" empty state
- Platform + content type + assigned-to
- Full caption text in a read-only textarea with "Copy Caption" button (clipboard API)
- CTA + phone (with copy buttons)
- Hashtags (with copy button)
- Suggested scheduling time
- AI reasoning note (the "why this post")
- Status selector: current status + dropdown to advance status
- "Mark as Scheduled" primary button → sets status to 'scheduled', records timestamp
- "Send for Approval" button → sets status to 'sent_for_approval', records `approval_sent_at`

Status flow: slot → in_production → ready_for_review → sent_for_approval → approved → scheduled → published

### Step 5 — Creative Upload + Auto-Match

Build `components/content/CreativeUploader.tsx`:

Drag-and-drop zone on each post card (when no creative attached):
- Accepts image and video files
- On drop/select:
  1. Upload to Supabase storage under `{client_id}/creatives/{post_id}/{filename}`
  2. Generate thumbnail via `/api/media/upload` (Sharp — resize to 400px wide, WebP)
  3. Create `media` record linked to `post_id`
  4. Update `posts.has_creative = true`
  5. Update post card to show thumbnail

Also build a standalone uploader for the media library with auto-match logic:
- When a creative is uploaded without a specific post → AI suggests which open calendar slot it belongs in
- Suggestion based on: file name, content type, platform, open slots in the calendar
- Jay confirms → creative attaches to that slot

Build `app/api/media/upload/route.ts`:
- Validates MIME type server-side (image/jpeg, image/png, image/webp, image/gif, video/mp4, video/mov, video/quicktime)
- Validates file size (max 100MB for video, 20MB for image)
- Generates thumbnail with Sharp
- Uploads original + thumbnail to Supabase storage
- Creates `media` record in database
- Returns media record with signed URLs

### Step 6 — Caption Selector

Build `components/content/CaptionSelector.tsx`:

On each post card in edit mode:
- Shows up to 3 AI-generated caption options (Phase 3) + 1 "manual" slot
- Each option: full text, "Select" button
- Selected caption highlighted with accent border
- "Edit" button on any option opens inline textarea
- Manual caption: textarea that user types into directly
- Selecting a caption updates `posts.selected_caption_id` and `posts.caption`

---

## PHASE 3 — AI Workflows
**Goal:** All 8 AI workflows operational. Claude API integrated. Research agent fires automatically on lead creation.
**Estimated sessions:** 2-3 Claude Code sessions

### Step 1 — Claude API Infrastructure

Install:
```bash
npm install @anthropic-ai/sdk
npm install inngest
```

Create `lib/ai/claude.ts` from CLAUDE.md section 8.1 exactly.

Create `lib/ai/costTracker.ts`:
```typescript
export async function logAIRun(params: {
  supabase: any
  userId: string
  workflow: string
  model: string
  clientId?: string
  leadId?: string
  postId?: string
  usage: { inputTokens: number; outputTokens: number; costUsd: number }
  outputSummary?: string
  startedAt: number
}) {
  await params.supabase.from('ai_runs').insert({
    user_id: params.userId,
    client_id: params.clientId,
    lead_id: params.leadId,
    post_id: params.postId,
    workflow: params.workflow,
    model: params.model,
    prompt_tokens: params.usage.inputTokens,
    completion_tokens: params.usage.outputTokens,
    cost_usd: params.usage.costUsd,
    status: 'completed',
    output_summary: params.outputSummary,
    duration_ms: Date.now() - params.startedAt,
  })
}
```

### Step 2 — Prompt Templates

Create `lib/ai/prompts/` directory with one file per workflow. Each file exports a function that takes client data and returns a system prompt string.

Example structure:
```typescript
// lib/ai/prompts/contentCalendar.ts
export function contentCalendarPrompt(claudeMd: string, dateRange: string): string {
  return `You are a content strategist for a home services marketing agency.

CLIENT BRAND DOCUMENT:
${claudeMd}

Your task: Generate a ${dateRange} content calendar...
[Full prompt here]

IMPORTANT: For each post, include a one-line reasoning note explaining why this angle was chosen for this specific client at this time.`
}
```

Write prompt templates for all 8 workflows:
1. `contentCalendar.ts` — reads CLAUDE.md + date range → 2-week calendar with post stubs
2. `captions.ts` — reads post card + CLAUDE.md → 3 caption options
3. `videoScripts.ts` — reads CLAUDE.md + topic + format → Hook/Core/CTA scripts
4. `designBrief.ts` — reads post card + CLAUDE.md → Canva design brief (text export only)
5. `leadResearch.ts` — reads business name + website → online presence audit
6. `analyticsReport.ts` — reads platform data + CLAUDE.md → narrative report
7. `generateClaudeMd.ts` — reads intake answers → complete brand doc draft
8. `platformBios.ts` — reads CLAUDE.md + platform list → platform-specific bios

### Step 3 — AI API Routes (Streaming)

Build streaming API routes for long-running workflows:

```typescript
// app/api/ai/content-calendar/route.ts
import { streamClaude } from '@/lib/ai/claude'
import { contentCalendarPrompt } from '@/lib/ai/prompts/contentCalendar'

export async function POST(request: Request) {
  const { clientId, dateRange } = await request.json()

  // Auth check
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  // Rate limit check
  // [rate limit logic from CLAUDE.md section 4.9]

  // Get client CLAUDE.md
  const { data: client } = await supabase.from('clients').select('claude_md').eq('id', clientId).single()

  const stream = await streamClaude({
    system: contentCalendarPrompt(client.claude_md, dateRange),
    prompt: 'Generate the content calendar now.',
  })

  // Stream back as Server-Sent Events
  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event.delta.text)}\n\n`))
        }
      }
      // Log the completed run
      const finalMessage = await stream.finalMessage()
      await logAIRun({ supabase, userId: user.id, workflow: 'content_calendar', ... })
      controller.close()
    }
  })

  return new Response(readable, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' }
  })
}
```

Build non-streaming routes for fast workflows (captions, bios, design briefs).

### Step 4 — Workflow Runner UI

Build `app/(dashboard)/workflows/page.tsx`:

- Client selector dropdown (required before running)
- Workflow cards in a grid — one per workflow
- Each card: workflow name, description, expected output, "Run" button
- Clicking "Run" opens a Dialog:
  - Workflow-specific parameter fields (date range, topic, format, platform, etc.)
  - "Generate" button
  - Output panel (streaming text appears as it generates)
  - When complete: action buttons (push to content engine, copy, download)
- All run history visible in a collapsible "Recent Runs" section (from `ai_runs` table)
- Cost per run shown in muted text

### Step 5 — Research Agent (Inngest)

Install and configure Inngest:
```bash
npm install inngest
```

Create `lib/inngest.ts`:
```typescript
import { Inngest } from 'inngest'
export const inngest = new Inngest({ id: 'kos', signingKey: process.env.INNGEST_SIGNING_KEY })

export const leadResearchJob = inngest.createFunction(
  { id: 'lead-research', retries: 2 },
  { event: 'lead/created' },
  async ({ event, step }) => {
    const { leadId, website, businessName } = event.data

    const research = await step.run('research-lead', async () => {
      // Call Claude with leadResearch prompt
      // Return research summary text
    })

    await step.run('save-research', async () => {
      // Update lead: research_summary, research_completed_at, stage = 'researched'
    })
  }
)
```

Create `app/api/inngest/route.ts` (Inngest webhook handler).

Trigger the job when a lead is created with a website URL:
```typescript
// In lead creation server action
if (leadData.website) {
  await inngest.send({ name: 'lead/created', data: { leadId, website, businessName } })
}
```

### Step 6 — Generate CLAUDE.md Workflow

This is the most important onboarding workflow. When triggered:
1. Opens a structured intake form (all fields from the brand doc template)
2. User fills in business info, services, audience, differentiators, voice/tone, competitors
3. "Generate" calls the generateClaudeMd workflow
4. Output appears in a preview panel
5. "Save to Client" pushes the generated text to `clients.claude_md`

### Step 7 — Caption Generation Integration

Connect caption generation to post cards:
- "Generate Captions" button on post card → calls `/api/ai/captions` with post + client CLAUDE.md
- Returns 3 options → populates `captions` table records for that post
- CaptionSelector component displays them for Jay to choose from

---

## PHASE 4 — Lead Pipeline
**Goal:** Full lead management from first contact to client conversion, with automated research.
**Estimated sessions:** 1-2 Claude Code sessions

### Step 1 — Lead Kanban

Build `app/(dashboard)/leads/page.tsx`:

Kanban board with 6 columns: New → Researched → Qualified → Pitched → Won → Lost

Each column:
- Column title + count badge
- Scrollable list of lead cards
- "+" button at top to add a new lead to that stage

Lead card (compact):
- Business name
- Contact name
- Website (clickable link)
- Qual score badge (1-5 dots, colored green/yellow/red)
- Research status (spinner if running, checkmark if done)
- Follow-up date (red if overdue)
- Assigned-to avatar

Drag-and-drop between columns updates `leads.stage` in real-time.

### Step 2 — Lead Creation

"New Lead" form (Dialog):
- Business name, contact name, email, phone, website
- Industry
- Owner (Jay or Dylan)
- Follow-up date
- Notes

On submit:
- Create lead in `new` stage
- If website provided → trigger Inngest lead research job
- Show "Research running..." spinner on card

### Step 3 — Qualification Scorecard

Build `components/leads/QualificationScorecard.tsx`:

Shown inside LeadDetailPanel. Five yes/no toggles:

1. "Do they have a real, actually good service/product?"
2. "Are they willing to show up — share footage, film with us?"
3. "Do they have a real budget?"
4. "Is there actual market demand for what they do?"
5. "Will they let us do our job, or micromanage every post?"

Score auto-calculates (1 point each). Display:
- 5/5 → green, "Strong fit — pitch them"
- 3-4/5 → yellow, "Potential fit — ask more questions"
- 1-2/5 → red, "Pass"

Scorecard updates are saved to database on each toggle. Score updates `qual_score` automatically (computed column).

### Step 4 — Lead Detail Panel

Slide-in panel (Sheet) when a lead card is clicked:

Sections:
- Contact info (editable inline)
- Qualification scorecard (see Step 3)
- Research summary (populated by Inngest agent, editable)
- Stage selector + move to next stage button
- Recommended tier + proposed MRR fields
- Pitch notes textarea
- Follow-up date picker
- "Convert to Client" button (only shown in 'won' stage)

### Step 5 — Lead to Client Conversion

"Convert to Client" flow:
1. Dialog confirms: "Convert [Business Name] to a client?"
2. Asks for: Tier confirmation, MRR, Contract start date, Platforms, Primary producer
3. On confirm:
   - Creates `clients` record with data from lead + confirmation fields
   - Updates `leads.converted_client_id` and moves to 'won' stage
   - Auto-generates onboarding steps based on tier
   - Redirects to new client's hub page
4. The CLAUDE.md editor pre-populated with research summary as a starting point

---

## PHASE 5 — Media, Filming & Platform Setup
**Goal:** Centralized media library, filming session planning, platform setup tracking.
**Estimated sessions:** 1-2 Claude Code sessions

### Step 1 — Media Library

Build `app/(dashboard)/media/page.tsx`:

- Client filter dropdown (all clients or specific)
- Category filter (brand assets, creatives, footage, exports)
- Platform filter
- Search by filename
- Visual grid with thumbnails (3-4 columns)
- Click a file → detail panel: preview, metadata, linked posts, download link
- Drag files onto the page to upload (calls existing upload API)
- Files auto-tagged by platform/type based on the post they're linked to

### Step 2 — Platform Setup Tab

Add Tab 4 to Client Hub: "Platforms"

For each platform the client is on:
- Platform card with icon and name
- 6 checklist items: Profile photo, Bio, Contact info, Link, Cover image, Brand kit applied
- "Verified" status with timestamp when all 6 are checked
- Notes field for each platform

Data stored in `platform_setups` table.

### Step 3 — Filming Sessions Tab

Add Tab 5 to Client Hub: "Filming" (Full Service clients only — hide tab for Basic tier)

Page:
- "Schedule Session" button → creates new filming session
- Upcoming sessions list
- Past sessions (collapsed by default)

Session card when expanded:
- Date, time, location
- Status badge (Planned / Completed / Cancelled)
- Pre-shoot checklist: Scripts ready (links to content calendar for posts needing footage), Gear packed
- Shot list text area
- Post-shoot checklist: Footage captured, Editing done
- "Posts linked" counter — how many calendar slots this session's footage covers
- Session notes

### Step 4 — Creative ↔ Filming Session Link

On content calendar, posts that are `in_production` and assigned to a filming session:
- Show filming session badge on the post card
- Session date shown below platform icon
- "Footage captured" indicator updates when filming session is marked complete

---

## PHASE 6 — Dashboard Polish + Billing + Analytics
**Goal:** Dashboard is the morning view Jay actually uses. All lifecycle alerts working.
**Estimated sessions:** 1-2 Claude Code sessions

### Step 1 — Today View (Polish)

Fully build out the Today view with real data:
- Pulls all posts with `scheduled_date = today` across all active clients
- Groups by time
- Shows full status with action buttons (mark published, open schedule panel)
- "Needs attention" section:
  - Posts stuck in `ready_for_review` for 2+ days
  - Clients with no post scheduled in next 7 days
  - Onboarding steps overdue
  - Invoices overdue
- Client lifecycle alerts:
  - Client 90+ days old with `ads_eligible = false` → "Ads conversation ready for [Client]?"
  - Surfaces as a yellow banner or alert card

### Step 2 — Agency Scorecard (Polish)

Fully build out the Overview tab:
- MRR card with month-over-month comparison
- Client health table with sorting (worst health first)
- Content output volume: posts published this month per client
- Outstanding invoices with total amount
- Team workload: posts assigned to Jay vs Dylan (current week)

### Step 3 — Billing Module

Build `app/(dashboard)/billing/page.tsx`:

- Agency MRR summary at top (sum of all active client MRR)
- Per-client invoice table:
  - Invoice date, due date, amount, status, description
  - Status badges (pending=yellow, sent=blue, paid=green, overdue=red)
  - "Mark as Paid" button per invoice
- "New Invoice" button → form: client, amount, date, due date, description, invoice number
- Revenue chart (simple bar chart — monthly totals for last 6 months)
- Outstanding amount highlighted in accent color

### Step 4 — Analytics Module

Build inside Client Hub as Tab 6: "Analytics"

Per-client:
- "Upload CSV" button → accepts Meta Business Suite export
- AI generates narrative report from CSV data + client CLAUDE.md:
  - What performed well and why (in context of the client's goals)
  - What to test next month
  - How this month compares to last month
  - 3 actionable recommendations
- Downloadable as text/markdown for client delivery
- Report stored in database

### Step 5 — Ads Eligibility Tracking

Add to client record:
- `ads_eligible` boolean field (already in schema)
- `ads_eligible_at` date field
- When both are set → remove the lifecycle alert for that client
- "Mark Ads Ready" button in client overview sets these fields

---

## POST-BUILD CHECKLIST

Before considering KOS production-ready:

**Security:**
- [ ] All API keys confirmed private (no NEXT_PUBLIC_ on secret keys)
- [ ] `.env.local` not committed to git
- [ ] RLS enabled and tested on all tables (test as Jay user, confirm Dylan can access, confirm no one else can)
- [ ] Security headers verified (run `securityheaders.com` scan on the Vercel URL)
- [ ] Storage bucket confirmed private (test trying to access a file URL without auth)
- [ ] Rate limiting confirmed on AI endpoints
- [ ] Error messages never expose stack traces (check browser console and network tab)

**Functionality:**
- [ ] Jay and Dylan can both log in
- [ ] Full onboarding flow for a new client (create → CLAUDE.md → checklist)
- [ ] Post creation → caption generation → creative upload → schedule panel → mark scheduled
- [ ] Content calendar shows correct posts for correct clients on correct dates
- [ ] Lead created with URL → research agent fires → summary populated
- [ ] Lead converted to client → correct onboarding steps auto-generated
- [ ] All 8 AI workflows run without error and output to correct destination
- [ ] File upload → thumbnail generated → linked to post card
- [ ] Invoice created → marked paid

**Performance:**
- [ ] Dashboard loads in < 2 seconds on a production connection
- [ ] Calendar loads fast with 30+ posts visible
- [ ] Media grid loads with thumbnails (not full-size originals)

**Deployment:**
- [ ] Vercel production URL confirmed live
- [ ] All environment variables set in Vercel
- [ ] GitHub main branch protected (no direct pushes)
- [ ] Custom domain set up (optional but recommended: `kos.konvyrtmarketing.com`)

---

## NOTES FOR CLAUDE CODE

- Read CLAUDE.md before every session — it's the source of truth
- When in doubt about a design decision, default to simpler and darker
- Never build outside the current phase scope
- Ask before making architectural decisions not covered in the docs
- Every database operation goes through the Supabase client (never raw SQL from app code)
- Every mutation is a Server Action with auth re-verification
- If a component is getting complex, break it into smaller sub-components
- The post card and the schedule panel are the most used components — build them well

---

*Build plan last updated: April 2026. Stack confirmed, all decisions locked.*
