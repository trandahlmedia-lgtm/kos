# KOS Phase 6 — Dashboard & Client Deep-Dive Spec

> **Purpose:** This spec defines exactly what to build for KOS Phase 6. It was written after a full codebase audit (all 17 Supabase tables, 34 API routes, all existing components) and screenshots of the current state.
>
> **Date:** April 12, 2026
> **Author:** Jay (via Cowork session)

---

## What Exists Today (from screenshots)

### Dashboard — Today Tab
- Shows "GOING OUT TODAY" (posts scheduled for today from `posts` table)
- Shows "NEEDS ATTENTION" (clients with no posts in 7+ days)
- **Gap:** No tasks, no priorities, no actionable daily plan

### Dashboard — Overview Tab
- 3 KPI cards: Monthly MRR, Active Clients, Outstanding invoices
- Client Health table: Client name, Tier, MRR, Last Post (color-coded)
- **Gap:** No charts, no trends, no visual indicators of what's good/bad

### Client Hub — Overview Tab
- 9 stat cards: Tier, MRR, Contract Start, Primary Producer, Days as Client, Platforms, Posts this month, Last post, Onboarding %
- **Gap:** No tasks, no content calendar preview, no analytics, no action items

### Client Hub — Brand Kit Tab
- 4 logo upload slots (Icon, Wordmark Dark, Wordmark Light, Full Logo)
- Instagram Handle field
- **Gap:** No colors, fonts, voice/tone, content pillars, pain points, services — just logos

---

## What to Build

### 1. Dashboard — Enhanced Today Tab

**Replace the current Today tab with a full daily command center.**

#### Layout:
```
┌─────────────────────────────────────────────────────┐
│ Today — Monday, April 14                            │
│ 8 tasks · 3 high priority · ~2.5h estimated         │
├─────────────────────────────────────────────────────┤
│                                                     │
│ ┌─ HIGH PRIORITY ─────────────────────────────────┐ │
│ │ 🔴 [NS] Verify Meta Pixel is firing    20 min  │ │
│ │ 🔴 [NS] Review & send contract         30 min  │ │
│ │ 🔴 [SC] Review intake form responses   30 min  │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ ┌─ CONTENT DUE ───────────────────────────────────┐ │
│ │ 📝 [NS] Spring AC Tune-Up post    Wed 9:30AM   │ │
│ │ 📝 [NS] Super Clean education     Fri 9:30AM   │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ ┌─ OTHER TASKS ───────────────────────────────────┐ │
│ │ 🟡 [NS] Plan this week's content       15 min  │ │
│ │ 🟢 [KM] Weekly planning review         10 min  │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ ┌─ NEEDS ATTENTION (existing, keep) ──────────────┐ │
│ │ ⚠ Northern Standard — No posts yet              │ │
│ └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

#### Data Sources:
- **Tasks:** Pull from `client_tasks` (per-client) and `agency_tasks` (agency-wide). Both tables already exist with: id, title, completed, completed_at, sort_order
- **Content due:** Pull from `posts` table where `scheduled_date` is within the next 3 days and status is not 'published'
- **Needs attention:** Keep existing logic (clients with no posts in 7+ days)

#### Task Enhancements Needed:
- Add columns to `client_tasks` and `agency_tasks`:
  - `priority` (enum: 'high', 'medium', 'low') — default 'medium'
  - `due_date` (date, nullable)
  - `estimated_minutes` (integer, nullable)
  - `task_type` (enum: 'content', 'admin', 'tech', 'ads', 'seo', 'planning')
- Tasks should be checkable directly from the dashboard (optimistic update)
- Completed tasks slide to bottom with strikethrough, auto-hide after 24h
- Click a task to expand and see detail/instructions (add `description` text column)

#### Interactions:
- Check/uncheck tasks inline
- Click task to expand details
- "Add task" button (quick-add: title, client, priority, type)
- Filter by client (dropdown)

---

### 2. Dashboard — Enhanced Overview Tab

**Add charts and better visual indicators.**

#### Layout:
```
┌─────────────────────────────────────────────────────┐
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────────┐ │
│ │ MRR      │ │ Active   │ │ Posts    │ │ AI Cost │ │
│ │ $3,000   │ │ Clients  │ │ This Mo  │ │ $12.40  │ │
│ │ ▲ $3,000 │ │ 1        │ │ 6        │ │         │ │
│ └──────────┘ └──────────┘ └──────────┘ └─────────┘ │
│                                                     │
│ ┌─ CONTENT VELOCITY (Recharts area chart) ────────┐ │
│ │  Posts published per week, last 8 weeks          │ │
│ │  [visual line/area chart]                        │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ ┌─ CLIENT HEALTH ─────────────────────────────────┐ │
│ │ Client    │ Tier    │ MRR    │ Posts │ Health   │ │
│ │ North Std │ Full Sv │ $3,000 │ 2/wk  │ 🟢 Good │ │
│ │ Stone Cr  │ TBD     │ TBD    │ —     │ 🟡 New  │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ ┌─ THIS WEEK'S WINS ─────────────────────────────┐ │
│ │ ☐ Contract sent to Justin                      │ │
│ │ ☐ First Meta ad live                           │ │
│ │ ☐ Cameron onboarded                            │ │
│ └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

#### Data Sources:
- **MRR:** `SUM(clients.mrr)` where status = 'active'
- **Active Clients:** `COUNT(clients)` where status = 'active'
- **Posts this month:** `COUNT(posts)` where scheduled_date in current month
- **AI Cost:** `SUM(ai_runs.cost_usd)` for current month (table already exists and tracks all AI usage)
- **Content Velocity chart:** `COUNT(posts) GROUP BY week` for last 8 weeks
- **Client Health:** Enhanced version of existing table — add calculated health score
- **This Week's Wins:** `agency_tasks` where due_date is this week

#### Health Score Calculation:
- Green (healthy): Posted within 7 days, tasks on track
- Yellow (attention): No posts in 7-14 days, or overdue tasks
- Red (at risk): No posts in 14+ days, or multiple overdue high-priority tasks
- Gray (new): Client onboarding < 50% complete

#### Chart Library:
- **Install Recharts** (`npm install recharts`)
- Use AreaChart for content velocity, BarChart for MRR trend (future)
- Style to match KOS design system (dark mode, #E8732A accent)

---

### 3. Client Deep-Dive — Enhanced Client Hub

**When you click into a client from the dashboard or Client Health table, you land on a much richer client page.**

#### Add new tabs / enhance existing:

**Overview Tab (enhanced):**
```
┌─────────────────────────────────────────────────────┐
│ Northern Standard Heating & Air                     │
│ ● Active · Full Service · $3,000/mo                 │
├──────────┬───────────┬───────────┬─────────┬────────┤
│ Overview │ Brand Kit │ Content   │ Tasks   │ Onboard│
├──────────┴───────────┴───────────┴─────────┴────────┤
│                                                     │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐             │
│ │ Posts/Mo │ │ Days as  │ │ Onboard  │             │
│ │ 6        │ │ Client   │ │ 45%      │             │
│ │ target:8 │ │ 12       │ │ 5/11done │             │
│ └──────────┘ └──────────┘ └──────────┘             │
│                                                     │
│ ┌─ UPCOMING CONTENT ──────────────────────────────┐ │
│ │ Wed 4/16 · Spring AC Tune-Up · IG+FB · Draft   │ │
│ │ Fri 4/18 · Super Clean Education · FB · Draft   │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ ┌─ CLIENT TASKS ──────────────────────────────────┐ │
│ │ 🔴 Verify Meta Pixel          Due: Mon 4/14    │ │
│ │ 🔴 Send contract              Due: Tue 4/15    │ │
│ │ 🟡 Build furnace ad campaign  Due: Wed 4/16    │ │
│ │ 🟡 GBP optimization           Due: Thu 4/17    │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ ┌─ ANALYTICS (manual entry for now) ──────────────┐ │
│ │ Website Sessions: 347  │ Meta Reach: 2,400     │ │
│ │ Google Reviews: 12     │ GBP Views: 890        │ │
│ │ (last updated: Apr 10) │                        │ │
│ │ [Edit Metrics]                                  │ │
│ └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

#### New: Content Tab (per-client)
- Shows this client's content calendar (filter existing calendar view to single client)
- Posts by status: Draft → In Production → Ready → Scheduled → Published
- Quick stats: posts this week, posts this month, content pillar distribution

#### New: Tasks Tab (per-client)
- Full task list from `client_tasks` for this client
- Add/edit/complete tasks
- Filter by priority, type, status
- Shows both active and recently completed (last 7 days)

#### Analytics Section (manual entry — Phase 6a)
**New table needed:** `client_metrics`
```sql
CREATE TABLE client_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  metric_date DATE NOT NULL,
  website_sessions INTEGER,
  meta_reach INTEGER,
  meta_impressions INTEGER,
  meta_clicks INTEGER,
  meta_spend DECIMAL(10,2),
  meta_leads INTEGER,
  google_reviews INTEGER,
  google_rating DECIMAL(3,2),
  gbp_views INTEGER,
  gbp_clicks INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```
- Jay manually enters weekly metrics (takes 5 min)
- Simple form: date picker + metric fields
- Dashboard shows latest values with green/red arrows vs previous week
- Future: automate with GA4 + Meta APIs when those connections work

---

### 4. Brand Kit Tab — Full Brand Identity View

**Replace the current logos-only view with a rich visual brand overview.**

#### Layout:
```
┌─────────────────────────────────────────────────────┐
│ BRAND IDENTITY                                      │
│                                                     │
│ ┌─ LOGOS (existing, keep) ────────────────────────┐ │
│ │ [Icon] [Wordmark Dark] [Wordmark Light] [Full] │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ ┌─ COLORS ────────────────────────────────────────┐ │
│ │ ■ Navy #1B3A5C  ■ Amber #E8732A               │ │
│ │ ■ Deep #0F2640  ■ Ice Blue #A8D5E2            │ │
│ │ ■ Cloud #F2F4F7 ■ White #FFFFFF               │ │
│ │ (rendered as color swatches with hex codes)     │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ ┌─ TYPOGRAPHY ────────────────────────────────────┐ │
│ │ Headlines: Montserrat Bold                      │ │
│ │ "The quick brown fox jumps over the lazy dog"   │ │
│ │                                                 │ │
│ │ Body: Open Sans Regular                         │ │
│ │ "The quick brown fox jumps over the lazy dog"   │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ ┌─ VOICE & TONE ──────────────────────────────────┐ │
│ │ Straightforward · Warm · Knowledgeable          │ │
│ │ Trustworthy · Confident                         │ │
│ │                                                 │ │
│ │ Sounds like: "A knowledgeable neighbor,         │ │
│ │ not a salesperson"                              │ │
│ │                                                 │ │
│ │ ✓ Do: Lead with helpfulness, plain language     │ │
│ │ ✗ Don't: Sound salesy, use HVAC jargon        │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ ┌─ CONTENT PILLARS ───────────────────────────────┐ │
│ │ 1. Trust & Transparency                         │ │
│ │ 2. Education                                    │ │
│ │ 3. Social Proof                                 │ │
│ │ 4. Seasonal Urgency                             │ │
│ │ 5. Behind the Scenes                            │ │
│ │ 6. Offers / CTAs                                │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ ┌─ TARGET AUDIENCE ───────────────────────────────┐ │
│ │ Age: 30-65 · Homeowners · Twin Cities metro     │ │
│ │                                                 │ │
│ │ Pain Points:                                    │ │
│ │ • Fear of being ripped off                      │ │
│ │ • Emergency anxiety                             │ │
│ │ • Decision paralysis                            │ │
│ │ • Distrust of contractors                       │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ ┌─ SOCIAL HANDLES ────────────────────────────────┐ │
│ │ IG: @northernstandardhvac                       │ │
│ │ FB: /northernstandardheatingandair              │ │
│ │ Website: northernstandardhvac.com               │ │
│ │ Phone: (612) 655-3370                           │ │
│ └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

#### Data Source:
- Parse from `clients.claude_md` field (the brand kit markdown is stored here)
- Use a structured parser to extract: colors, fonts, voice keywords, content pillars, pain points, audience info
- OR: Add structured columns to the `clients` table for brand data:
  - `brand_colors` (JSONB array: [{name, hex, role}])
  - `brand_fonts` (JSONB: {headline: string, body: string})
  - `brand_voice` (JSONB: {keywords: string[], description: string, dos: string[], donts: string[]})
  - `content_pillars` (JSONB array: [{name, description}])
  - `target_audience` (JSONB: {age_range, location, traits: string[], pain_points: string[]})

**Recommended approach:** Add JSONB columns. The CLAUDE.md is great for agents, but structured data is better for UI rendering. Parse existing CLAUDE.md to pre-populate the structured fields.

---

## Build Order (for Claude Code sessions)

### Session 1: Dashboard Tasks + Recharts
1. Run migration: add priority, due_date, estimated_minutes, task_type, description to client_tasks and agency_tasks
2. Install Recharts
3. Rebuild TodayView with task groups (high/medium/low), checkable tasks, expandable details
4. Enhance AgencyScorecard with AI cost card + content velocity chart
5. Add "This Week's Wins" section to Overview tab

### Session 2: Client Deep-Dive
1. Run migration: create client_metrics table
2. Add Content tab to client hub (filtered calendar view)
3. Add Tasks tab to client hub (full CRUD for client_tasks)
4. Add Analytics section to Overview tab (manual metric entry + display)
5. Enhance stat cards with targets and green/red indicators

### Session 3: Brand Kit Enhancement
1. Run migration: add JSONB brand columns to clients table
2. Build Brand Kit visual renderer (colors, fonts, voice, pillars, audience)
3. Build Brand Kit editor (form to update structured brand data)
4. Parse existing NS CLAUDE.md to pre-populate structured fields
5. Keep logos section as-is, add new sections below

### Session 4: Polish + Health Scores
1. Implement client health score calculation
2. Color-code Client Health table (green/yellow/red/gray)
3. Add health score badge to dashboard + client hub header
4. Polish responsive layout, empty states, loading states
5. Deploy and verify

---

## Technical Notes

### Existing Tables to Modify:
- `client_tasks`: ADD priority, due_date, estimated_minutes, task_type, description
- `agency_tasks`: ADD priority, due_date, estimated_minutes, task_type, description
- `clients`: ADD brand_colors, brand_fonts, brand_voice, content_pillars, target_audience (all JSONB)

### New Tables:
- `client_metrics`: Weekly client performance data (manual entry)

### New Dependencies:
- `recharts` (charting)

### Files to Modify:
- `components/dashboard/TodayView.tsx` — Full rebuild
- `components/dashboard/AgencyScorecard.tsx` — Add charts + enhanced KPIs
- `components/dashboard/DashboardTabs.tsx` — Minor (may need new data props)
- `app/(dashboard)/page.tsx` — Updated queries for new task fields
- `app/(dashboard)/clients/[id]/page.tsx` — New tabs, analytics, enhanced overview

### New Files:
- `components/dashboard/TaskCard.tsx`
- `components/dashboard/ContentVelocityChart.tsx`
- `components/dashboard/WeeklyWins.tsx`
- `components/clients/ContentTab.tsx`
- `components/clients/TasksTab.tsx`
- `components/clients/AnalyticsSection.tsx`
- `components/clients/BrandKitVisual.tsx`
- `components/clients/BrandKitEditor.tsx`
- `components/clients/MetricEntryForm.tsx`
- `supabase/migrations/016_phase6_dashboard.sql`
- `supabase/migrations/017_client_metrics.sql`
- `supabase/migrations/018_brand_columns.sql`
- `lib/actions/tasks.ts`
- `lib/actions/metrics.ts`

### Design Rules (from CLAUDE.md):
- Dark mode only, no gradients
- linear.app aesthetic
- Colors: bg #0a0a0a, surface #111111, elevated #1a1a1a, border #2a2a2a, accent #E8732A
- Font: Inter, 4px base spacing, max rounded-md
- Use shadcn/ui primitives
- Sonner for toasts
- Zod for all validation
