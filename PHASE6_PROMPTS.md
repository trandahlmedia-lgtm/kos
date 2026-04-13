# KOS Phase 6 — Claude Code Prompts

> **How to use:** Open Claude Code in the KOS project folder. Paste Prompt #1. Wait for it to finish. Then paste Prompt #2. And so on.
> 
> **Important:** Use **Sonnet** for these — it's the right balance of speed and quality for code work. Save Opus for complex debugging if something breaks.
>
> **Before starting:** Make sure you're in the KOS project directory and run `git status` to make sure you're on a clean branch.

---

## Prompt #1 — Database Migration + Recharts Install

```
Read PHASE6_SPEC.md and KOS_SessionHandoff.md and CLAUDE.md for full context on what we're building.

Phase 6, Session 1. Start with the foundation:

1. Create migration file `supabase/migrations/016_phase6_dashboard.sql` that:
   - Adds to `client_tasks`: priority (text DEFAULT 'medium' CHECK IN ('high','medium','low')), due_date (date), estimated_minutes (integer), task_type (text CHECK IN ('content','admin','tech','ads','seo','planning')), description (text)
   - Adds the same columns to `agency_tasks`
   - Make sure RLS policies stay intact (don't drop/recreate the table, just ALTER TABLE ADD COLUMN)

2. Create migration `supabase/migrations/017_client_metrics.sql`:
   - New table `client_metrics` with: id (uuid pk), client_id (uuid references clients ON DELETE CASCADE), metric_date (date NOT NULL), website_sessions (integer), meta_reach (integer), meta_impressions (integer), meta_clicks (integer), meta_spend (decimal 10,2), meta_leads (integer), google_reviews (integer), google_rating (decimal 3,2), gbp_views (integer), gbp_clicks (integer), notes (text), created_at (timestamptz default now())
   - Enable RLS, add policy for authenticated users
   - Add index on (client_id, metric_date)

3. Install recharts: `npm install recharts`

4. Update `types/index.ts` to add TypeScript types for the new columns and the client_metrics table. Follow the existing pattern in the file.

Don't build any UI yet — just the foundation. Run `npm run build` when done to make sure nothing breaks.
```

---

## Prompt #2 — Rebuild the Today View

```
Read PHASE6_SPEC.md for the Today View layout spec.

Now rebuild the Dashboard Today tab. Current files:
- app/(dashboard)/page.tsx (data fetching)
- components/dashboard/TodayView.tsx (renders Today tab)
- components/dashboard/DashboardTabs.tsx (tab shell)

Changes needed:

1. Update `app/(dashboard)/page.tsx` to fetch:
   - client_tasks with the new priority, due_date, estimated_minutes, task_type, description fields, joined with clients for client name and a display color
   - agency_tasks with the same new fields
   - posts scheduled for today and next 2 days (status != 'published'), joined with clients
   - clients with last_post_at for "needs attention" (existing logic, keep it)

2. Rebuild `components/dashboard/TodayView.tsx`:
   - Group tasks into 3 sections: HIGH PRIORITY (red dot), CONTENT DUE (posts due soon), OTHER TASKS (medium/low)
   - Each task card shows: priority dot (red/yellow/green), task title, client badge (colored), estimated time
   - Click a task card to expand it and show the description field
   - Checkbox on each task — checking it marks completed (optimistic update, call supabase to update completed + completed_at)
   - Completed tasks slide to bottom section with strikethrough styling
   - "Add Task" button at bottom — opens a simple inline form: title, select client, priority, type, due_date, estimated_minutes, description
   - Header shows: "Today — [Day], [Date]" with count of tasks and total estimated time

3. Create `components/dashboard/TaskCard.tsx` as a reusable component for task display.

4. Create `lib/actions/tasks.ts` with:
   - getClientTasks(clientId?) — fetch tasks, optionally filtered by client
   - getAgencyTasks() — fetch agency-wide tasks  
   - toggleTask(taskId, table: 'client_tasks' | 'agency_tasks') — mark complete/incomplete
   - createTask(data, table) — create new task
   - updateTask(id, data, table) — update task

Follow the existing patterns in lib/actions/posts.ts and lib/actions/clients.ts for how Supabase queries are structured. Use the existing supabase client imports.

Style everything to match existing KOS design: dark mode, #0a0a0a bg, #111111 surface, #1a1a1a elevated, #2a2a2a borders, #E8732A accent, Inter font. Use shadcn/ui components where appropriate.

Run `npm run build` when done.
```

---

## Prompt #3 — Enhanced Overview Tab with Charts

```
Read PHASE6_SPEC.md for the Overview tab layout spec.

Now enhance the Dashboard Overview tab. Current file:
- components/dashboard/AgencyScorecard.tsx

Changes needed:

1. Add a 4th KPI card: "AI Cost" — pulls SUM(ai_runs.cost_usd) for the current month. Format as currency. This data needs to be fetched in app/(dashboard)/page.tsx and passed as a prop.

2. Add a "Content Velocity" chart below the KPI cards:
   - Use Recharts AreaChart
   - Shows posts published per week for the last 8 weeks
   - Query: COUNT(posts) WHERE status = 'published' GROUP BY week of scheduled_date
   - Style: dark background, #E8732A fill with 0.3 opacity, #E8732A stroke
   - X-axis: week labels (e.g., "Mar 17", "Mar 24", "Mar 31")
   - Y-axis: post count
   - Create this as `components/dashboard/ContentVelocityChart.tsx`

3. Enhance the Client Health table:
   - Add a "Health" column with colored badges:
     - 🟢 Good: last_post_at within 7 days
     - 🟡 Attention: last_post_at 7-14 days ago
     - 🔴 At Risk: last_post_at 14+ days ago or null
     - ⚪ New: onboarding_steps completion < 50%
   - Add "Posts/Mo" column showing count of posts this month per client
   - Make client name clickable → navigates to /clients/[id]

4. Add a "This Week's Wins" section at the bottom:
   - Shows agency_tasks where due_date is within the current week
   - Checkable list (same toggle function as Today view)
   - Compact styling — no expanded details, just title + checkbox
   - Create as `components/dashboard/WeeklyWins.tsx`

All data fetching happens in app/(dashboard)/page.tsx. Follow the existing pattern where server-rendered data is passed as props to client components.

Run `npm run build` when done.
```

---

## Prompt #4 — Client Hub: Tasks + Content + Analytics

```
Read PHASE6_SPEC.md for the Client Deep-Dive spec.

Enhance the client hub page at app/(dashboard)/clients/[id]/page.tsx.

1. Add two new tabs to the client hub: "Content" and "Tasks" (alongside existing Overview, Brand Doc, Brand Kit, Onboarding).

2. **Content Tab** (`components/clients/ContentTab.tsx`):
   - Shows this client's posts from the `posts` table, filtered by client_id
   - Group by status: Draft, In Production, Ready, Scheduled, Published
   - Each post shows: scheduled_date, content_type, platform, caption preview (first 60 chars)
   - Quick stats at top: posts this week, posts this month, posts by pillar (pie chart or bar using Recharts)
   - Link each post to the content editor (existing route)

3. **Tasks Tab** (`components/clients/TasksTab.tsx`):
   - Full CRUD task list for this client's tasks from `client_tasks`
   - Reuse the TaskCard component from the dashboard
   - Add task inline (same form as dashboard but client pre-selected)
   - Filter toggles: All / Active / Completed
   - Sort by: priority, due date, created date

4. **Enhanced Overview Tab**:
   - Keep existing 9 stat cards
   - Add "Upcoming Content" section below: next 5 posts (same query as Content tab, limit 5, ordered by scheduled_date)
   - Add "Client Tasks" section: show top 5 incomplete tasks sorted by priority then due_date
   - Add "Analytics" section at the bottom:
     - Shows latest row from client_metrics for this client
     - Displays: website_sessions, meta_reach, meta_leads, google_reviews, gbp_views
     - Each metric shows value + arrow (green up / red down) compared to previous entry
     - "Update Metrics" button opens `components/clients/MetricEntryForm.tsx` — a simple form that creates a new client_metrics row
   - Create `lib/actions/metrics.ts` with: getLatestMetrics(clientId), getMetricHistory(clientId, limit), createMetricEntry(data)

Run `npm run build` when done.
```

---

## Prompt #5 — Brand Kit Visual Enhancement

```
Read PHASE6_SPEC.md for the Brand Kit Enhancement spec.

The Brand Kit tab currently only shows 4 logo slots and an Instagram handle. Enhance it to show the full brand identity.

1. Create migration `supabase/migrations/018_brand_columns.sql`:
   - ALTER TABLE clients ADD COLUMN brand_colors JSONB DEFAULT '[]'::jsonb;
   - ALTER TABLE clients ADD COLUMN brand_fonts JSONB DEFAULT '{}'::jsonb;
   - ALTER TABLE clients ADD COLUMN brand_voice JSONB DEFAULT '{}'::jsonb;
   - ALTER TABLE clients ADD COLUMN content_pillars JSONB DEFAULT '[]'::jsonb;
   - ALTER TABLE clients ADD COLUMN target_audience JSONB DEFAULT '{}'::jsonb;

2. Update types/index.ts with TypeScript types:
   - BrandColor: { name: string, hex: string, role: string }
   - BrandFonts: { headline: string, body: string }
   - BrandVoice: { keywords: string[], description: string, dos: string[], donts: string[] }
   - ContentPillar: { name: string, description: string }
   - TargetAudience: { age_range: string, location: string, traits: string[], pain_points: string[] }

3. Build `components/clients/BrandKitVisual.tsx`:
   - Renders below the existing logo grid
   - **Colors section:** Row of color swatches (squares with rounded corners) showing each color with name + hex code below. Swatch background = the actual color.
   - **Typography section:** Show headline font name + sample text rendered in that font. Show body font name + sample text. (Use Google Fonts link tag for Montserrat and Open Sans, or just display the font name if loading isn't feasible)
   - **Voice & Tone section:** Keyword badges (pill-shaped), description text, "Do" list (green checkmarks), "Don't" list (red x marks)
   - **Content Pillars section:** Numbered list with pillar name (bold) + description
   - **Target Audience section:** Age range, location, traits as badges, pain points as a list
   - **Social & Contact section:** All social handles, website, phone — with clickable links

4. Build `components/clients/BrandKitEditor.tsx`:
   - An "Edit Brand Kit" button that opens a form/modal
   - Form sections matching the visual layout: add/remove colors, set fonts, add/remove voice keywords, etc.
   - On save, updates the clients table JSONB columns via Supabase

5. Pre-populate Northern Standard's brand data. Create a seed script or add to the migration:
   - Colors: [{name:"Navy", hex:"#1B3A5C", role:"Primary"}, {name:"Deep Navy", hex:"#0F2640", role:"Dark backgrounds"}, {name:"Amber", hex:"#E8732A", role:"Accent/CTAs"}, {name:"Ice Blue", hex:"#A8D5E2", role:"Supporting"}, {name:"Cloud Gray", hex:"#F2F4F7", role:"Light backgrounds"}, {name:"White", hex:"#FFFFFF", role:"Breathing room"}]
   - Fonts: {headline:"Montserrat", body:"Open Sans"}
   - Voice: {keywords:["Straightforward","Warm","Knowledgeable","Trustworthy","Confident"], description:"A knowledgeable neighbor, not a salesperson. Lead with helpfulness, not pressure.", dos:["Lead with helpfulness","Use plain language","Be confident without bragging","Back up claims with proof points"], donts:["Sound salesy or pushy","Use HVAC jargon","Use generic phrases like 'best in the business'","Make Justin the face — brand leads, not owner"]}
   - Content pillars: [{name:"Trust & Transparency", description:"How we work, upfront pricing, what to expect"}, {name:"Education", description:"Help homeowners understand their system"}, {name:"Social Proof", description:"Real reviews, job photos, before/after"}, {name:"Seasonal Urgency", description:"Timely content tied to weather/season"}, {name:"Behind the Scenes", description:"Real technicians, real calls, real work"}, {name:"Offers / CTAs", description:"Promotions, tune-up specials, booking pushes"}]
   - Target audience: {age_range:"30-65", location:"Twin Cities metro (50-mile radius from St. Paul)", traits:["Homeowners","Middle to upper-middle income","Families — comfort and reliability matter"], pain_points:["Fear of being ripped off","Emergency anxiety — furnace dies in January","Decision paralysis — don't know enough about HVAC","Distrust of contractors — skeptical of 'recommended repairs'","Seasonal dread — worry system won't make it"]}

Run `npm run build` when done.
```

---

## Prompt #6 — Polish + Deploy

```
Final polish pass for Phase 6.

1. Go through every new component and make sure:
   - Empty states look clean (no broken layouts when there's no data)
   - Loading states exist (skeleton loaders or spinners)
   - Error handling is in place (try/catch on all Supabase queries, toast on error via Sonner)
   - All new pages/components follow the existing code conventions in CLAUDE.md

2. Run the full build and fix any errors:
   - npm run lint
   - npm run build
   - Fix anything that fails

3. Test the happy path:
   - Dashboard Today tab: shows tasks grouped by priority, checkable, expandable
   - Dashboard Overview tab: KPI cards + chart + health table + weekly wins
   - Client hub Overview: upcoming content + tasks + analytics section
   - Client hub Content tab: posts filtered to this client
   - Client hub Tasks tab: full CRUD
   - Client hub Brand Kit tab: full visual brand identity for Northern Standard

4. Commit with message: "feat: Phase 6 — dashboard, client deep-dive, brand kit enhancement"

5. Verify the Vercel deployment succeeds (it auto-deploys from main).
```

---

## If Something Breaks

If any prompt produces build errors, paste this:

```
The build failed. Read the error output above carefully. Fix all errors. Don't change the intent of what we built — just fix the code issues. Run npm run build again to verify.
```

If you need to re-run migrations because Supabase didn't pick them up, you'll need to:
1. Go to your Supabase dashboard (supabase.com)
2. Open SQL Editor
3. Copy the SQL from the migration file
4. Run it manually

I can walk you through that step-by-step when we get there.
