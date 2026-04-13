# KOS Phase 4 — Lead Pipeline

## Goal
Build a full lead tracking system from first contact to signed client. Cold calls, referrals, or any inbound lead gets entered here, tracked through a kanban pipeline, researched by AI, scored, and converted to a client with one button.

---

## Kanban Stages (in order)

| Stage | Description |
|-------|-------------|
| `new` | Just added — haven't reached out yet |
| `reached_out` | Called, emailed, or DMed. No response yet |
| `connected` | Had a conversation. They know who we are |
| `interested` | Expressed real interest. Wants to hear more |
| `proposal_sent` | Sent pricing/proposal |
| `won` | Signed. Ready to convert to client |
| `lost` | Not moving forward. Reason recorded |

---

## Database Schema

### `leads` table (alter existing or create fresh)

```sql
id                    uuid primary key default gen_random_uuid()
assigned_to           uuid references profiles(id)
business_name         text not null
phone                 text
email                 text
website               text
has_website           boolean default false
instagram_handle      text
facebook_url          text
google_business_url   text
other_social_links    text
social_presence_notes text
years_in_business     integer
jobs_per_week         integer
work_inflow_notes     text
industry              text
service_area          text
source                text default 'cold_call'   -- cold_call | referral | inbound | other
stage                 text default 'new'
stage_updated_at      timestamptz default now()
call_notes            text       -- raw notes or pasted transcript
ai_call_summary       text       -- AI-structured summary of the call
ai_score              integer    -- 1-100, set after research agent runs
manual_score          integer    -- 1-100, Jay/Dylan override
ai_evaluation         text       -- full AI evaluation markdown
ai_recommended_tier   text       -- starter | growth | full_service | full_stack
ai_recommended_mrr    integer    -- suggested monthly retainer in dollars
converted_to_client_id uuid references clients(id)
converted_at          timestamptz
lost_reason           text
notes                 text       -- general freeform notes
created_at            timestamptz default now()
updated_at            timestamptz default now()
```

### `lead_research` table (new)

```sql
id              uuid primary key default gen_random_uuid()
lead_id         uuid references leads(id) on delete cascade
website_audit   jsonb    -- { score, findings[], recommendations[] }
social_audit    jsonb    -- { platforms: { instagram, facebook, google }, overall_score, findings[] }
business_intel  jsonb    -- { estimated_revenue_range, size, growth_indicators, market_notes }
service_fit     jsonb    -- { services: [{ name, priority, rationale }] }
pricing_analysis jsonb   -- { recommended_tier, mrr_low, mrr_high, rationale }
full_report     text     -- synthesized markdown — displayed in Research tab
overall_score   integer  -- 1-100
status          text default 'pending'   -- pending | running | completed | failed
error_message   text
created_at      timestamptz default now()
updated_at      timestamptz default now()
```

### `lead_activities` table (new)

```sql
id          uuid primary key default gen_random_uuid()
lead_id     uuid references leads(id) on delete cascade
user_id     uuid references profiles(id)
type        text    -- call | note | stage_change | research_run | conversion
content     text
metadata    jsonb   -- e.g. { from_stage, to_stage } for stage_change
created_at  timestamptz default now()
```

**RLS:** Enable on all three tables. Policy: user must be authenticated (Jay + Dylan both access everything).
**Indexes:** `leads(stage)`, `leads(assigned_to)`, `lead_research(lead_id)`, `lead_activities(lead_id)`.

---

## Migration File

Create `supabase/migrations/002_leads_pipeline.sql` with:
- ALTER TABLE leads (add all missing columns) OR CREATE TABLE leads if it doesn't match
- CREATE TABLE lead_research
- CREATE TABLE lead_activities
- RLS policies
- Indexes

Check existing `leads` table schema in Supabase before writing the migration — alter only what's missing.

---

## App Routes

```
app/(dashboard)/leads/page.tsx          — Kanban board (server component, fetches leads)
app/(dashboard)/leads/loading.tsx       — Skeleton
app/(dashboard)/leads/error.tsx         — Error boundary
```

Lead detail is a slide-in panel (not a separate route) — same pattern as the schedule panel in content.

---

## API Routes

```
app/api/leads/route.ts                  — GET (list by stage), POST (create)
app/api/leads/[id]/route.ts             — GET, PATCH, DELETE
app/api/leads/[id]/stage/route.ts       — PATCH (update kanban stage + log activity)
app/api/leads/[id]/convert/route.ts     — POST (convert to client)
app/api/ai/lead-research/route.ts       — POST (run full research agent)
app/api/ai/lead-score/route.ts          — POST (run AI scoring only)
app/api/ai/call-summary/route.ts        — POST (summarize call notes / transcript)
```

All routes: re-verify auth, Zod validation, rate limiting on AI routes.

---

## Server Actions

```
lib/actions/leads.ts          — createLead, updateLead, deleteLead, updateLeadStage
lib/actions/leadResearch.ts   — triggerResearch, saveResearchResult
```

---

## Components

```
components/leads/
  LeadsPageClient.tsx         — Kanban board container, manages open panel state
  KanbanColumn.tsx            — Single column (stage label + lead cards + card count)
  LeadCard.tsx                — Card: business name, phone, scores, stage badge, research status
  LeadDetailPanel.tsx         — Slide-in panel (same UX as SchedulePanel)
  LeadOverviewTab.tsx         — Basic info fields, scores display, stage selector
  LeadResearchTab.tsx         — Full AI audit output, research trigger button
  LeadNotesTab.tsx            — Call notes textarea, AI summary, activity log
  NewLeadDialog.tsx           — Add lead dialog with AI assist option
  ConvertLeadDialog.tsx       — Review pre-filled client profile before converting
  ScoreDisplay.tsx            — Visual 1-100 score (AI score + manual override input)
  ResearchProgress.tsx        — Shows sub-agent progress while research is running
```

---

## AI Workflows — Research Agent Architecture

The research agent is an **orchestrator** that runs 5 focused sub-agents sequentially, then synthesizes results.

### Sub-agents (all use `MODEL.fast` / Haiku — structured JSON output)

**1. Website Auditor**
- Input: website URL
- Fetches page content (reuse `fetchWebsiteText` from client-intake)
- Output: `{ score: 0-100, has_website: bool, design_quality, content_quality, has_cta, seo_basics, mobile_notes, findings[], recommendations[] }`

**2. Social Media Auditor**
- Input: instagram_handle, facebook_url, google_business_url
- Fetches public profile data where possible
- Output: `{ overall_score: 0-100, platforms: { instagram: {...}, facebook: {...}, google: {...} }, posting_consistency, content_quality, engagement_indicators, findings[] }`

**3. Business Intelligence**
- Input: business_name, industry, service_area, jobs_per_week, years_in_business, website content, social data
- Output: `{ estimated_annual_revenue_range, business_size, growth_stage, market_notes, competitive_position }`

**4. Service Fit Analyzer**
- Input: all above outputs
- Output: `{ services: [{ name, priority: high|medium|low, rationale, estimated_effort }], primary_opportunity, quick_wins[] }`

**5. Pricing Recommender**
- Input: all above outputs + Konvyrt tier definitions
- Konvyrt tiers: Starter (~$500-1500/mo), Growth (~$1500-3000/mo), Full Service (~$3000-5000/mo), Full Stack (~$5000+/mo)
- Output: `{ recommended_tier, mrr_low, mrr_high, rationale, negotiation_notes }`

### Orchestrator (uses `MODEL.default` / Sonnet)
- Runs all 5 sub-agents
- Synthesizes into `full_report` (markdown — audit summary, opportunities, pricing, why us)
- Calculates `overall_score` (weighted: online presence 40%, business health 30%, service fit 20%, ad readiness 10%)
- Saves to `lead_research` table
- Updates `leads.ai_score`, `leads.ai_recommended_tier`, `leads.ai_recommended_mrr`, `leads.ai_evaluation`

### Prompt Files
```
lib/ai/prompts/leadResearch.ts    — All 5 sub-agent prompts + orchestrator synthesis prompt
lib/ai/prompts/leadScore.ts       — Standalone scoring prompt (when research already exists)
lib/ai/prompts/callSummary.ts     — Call notes/transcript summarization prompt
```

### Call Summary Prompt Output
```json
{
  "what_they_want": "string",
  "pain_points": ["string"],
  "current_situation": "string",
  "objections": ["string"],
  "next_steps": "string",
  "pricing_discussed": "string or null",
  "decision_timeline": "string or null",
  "overall_sentiment": "hot | warm | cold",
  "recommended_follow_up": "string"
}
```

---

## Key UX Flows

### Adding a Lead
1. Click **"+ New Lead"** (top right of leads page)
2. Dialog opens — required fields: business name, phone, source (cold call default)
3. Optional fields: website, industry, service area, social handles, years in business, jobs/week
4. **"AI Assist"** button (optional) — takes business name + website, runs quick pre-fill using client-intake logic to suggest industry, services summary, social presence notes
5. Save → card appears in **New** column

### Researching a Lead
1. Open lead detail panel → click **Research** tab
2. If no research exists: "Run Full Research" button + explanation of what it does
3. Click → `ResearchProgress` component shows each sub-agent completing in real time
4. On complete: full audit renders in structured sections (Website, Social, Business Intel, Service Fit, Pricing)
5. AI score appears on card immediately
6. "Re-run Research" available to refresh

### Scoring
- **AI Score** (1-100): auto-set after research runs. Read-only display.
- **Manual Score** (1-100): Jay/Dylan input after reviewing. Slider or number field.
- Both visible on kanban card as two small badges: `AI: 72` and `You: 85`
- Score color: 0-40 red, 41-70 yellow, 71-100 green

### Call Notes & Summary
1. Notes tab has a large textarea for raw call notes or pasted transcript
2. **"Summarize with AI"** button → sends to call-summary route
3. AI returns structured summary displayed below the raw notes
4. Summary sections: What They Want, Pain Points, Objections, Next Steps, Sentiment, Follow-up Recommendation
5. Activity log below shows all stage changes and research runs with timestamps

### Stage Updates
- Drag card between columns OR change stage from dropdown inside detail panel
- Stage change logged to `lead_activities` automatically
- `stage_updated_at` updated on every move

### Converting a Lead (Won stage only)
1. Lead must be in **Won** stage to see Convert button
2. Click **"Convert to Client"** → `ConvertLeadDialog` opens
3. Pre-filled from lead data:
   - Name ← `business_name`
   - Phone ← `phone`
   - Email ← `email`
   - Website ← `website`
   - Industry ← `industry`
   - Service area ← `service_area`
   - Tier ← `ai_recommended_tier` (editable)
   - MRR ← `ai_recommended_mrr` (editable)
   - Notes ← AI call summary + key findings from research
4. `claude_md` field pre-populated with the full research report + call summary
5. Jay reviews, edits anything needed, clicks **Confirm**
6. Server creates client record, updates `leads.converted_to_client_id` and `leads.converted_at`
7. Redirect to new client hub

---

## Sidebar Update

Add **Leads** nav item to `components/layout/Sidebar.tsx`:
- Icon: `Target` from lucide-react
- Label: "Leads"
- Route: `/leads`
- Position: between Clients and Content

---

## Types (add to `types/index.ts`)

```typescript
export type LeadStage = 'new' | 'reached_out' | 'connected' | 'interested' | 'proposal_sent' | 'won' | 'lost'
export type LeadSource = 'cold_call' | 'referral' | 'inbound' | 'other'
export type LeadActivityType = 'call' | 'note' | 'stage_change' | 'research_run' | 'conversion'

export interface Lead {
  id: string
  assigned_to: string | null
  business_name: string
  phone: string | null
  email: string | null
  website: string | null
  has_website: boolean
  instagram_handle: string | null
  facebook_url: string | null
  google_business_url: string | null
  other_social_links: string | null
  social_presence_notes: string | null
  years_in_business: number | null
  jobs_per_week: number | null
  work_inflow_notes: string | null
  industry: string | null
  service_area: string | null
  source: LeadSource
  stage: LeadStage
  stage_updated_at: string
  call_notes: string | null
  ai_call_summary: string | null
  ai_score: number | null
  manual_score: number | null
  ai_evaluation: string | null
  ai_recommended_tier: string | null
  ai_recommended_mrr: number | null
  converted_to_client_id: string | null
  converted_at: string | null
  lost_reason: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface LeadResearch {
  id: string
  lead_id: string
  website_audit: Record<string, unknown> | null
  social_audit: Record<string, unknown> | null
  business_intel: Record<string, unknown> | null
  service_fit: Record<string, unknown> | null
  pricing_analysis: Record<string, unknown> | null
  full_report: string | null
  overall_score: number | null
  status: 'pending' | 'running' | 'completed' | 'failed'
  error_message: string | null
  created_at: string
  updated_at: string
}

export interface LeadActivity {
  id: string
  lead_id: string
  user_id: string | null
  type: LeadActivityType
  content: string
  metadata: Record<string, unknown> | null
  created_at: string
}
```

---

## Scoring Rubric (for AI scoring prompt)

| Factor | Weight | What makes it high |
|--------|--------|-------------------|
| Online presence | 40% | No website or bad socials = high opportunity score |
| Business health | 30% | Active jobs, years in business, clear revenue |
| Ad readiness | 20% | Already running ads (even bad ones) = high — they spend money |
| Service fit | 10% | Clear match with what Konvyrt offers |

**Score interpretation:**
- 80-100: Hot lead. High opportunity, likely to close.
- 60-79: Warm. Worth pursuing with a solid pitch.
- 40-59: Moderate. Could work with right framing.
- Below 40: Low priority. Poor fit or too early.

---

## Model Routing for Lead Pipeline

| Workflow | Model | Reason |
|----------|-------|--------|
| Research sub-agents (x5) | Haiku | Structured JSON output, fast, cheap |
| Orchestrator synthesis | Sonnet | Needs to reason across all sub-agent outputs |
| Call summary | Haiku | Pattern-following structured extraction |
| AI assist on new lead form | Haiku | Quick pre-fill, simple lookup |
| Standalone score (no research) | Sonnet | Needs judgment from limited data |

---

## What NOT to Build in Phase 4

- Drag-and-drop kanban (click to change stage is fine for now)
- Email/SMS integration
- Automated follow-up sequences
- Ad campaign management (Phase 6)
- KOS AI assistant (Phase 5)
- Any public-facing pages

---

## Definition of Done

- [ ] Migration runs clean in Supabase
- [ ] Leads page loads with kanban board — all 7 columns
- [ ] Can add a lead manually (with and without AI assist)
- [ ] Can move a lead between stages
- [ ] Can open lead detail panel — all 3 tabs work
- [ ] Research agent runs and produces a full report
- [ ] AI score appears on kanban card after research
- [ ] Manual score can be set
- [ ] Call notes can be entered and summarized
- [ ] Won lead can be converted to client with pre-filled profile
- [ ] Activity log records stage changes and research runs
- [ ] `npm run lint && npm run build` both pass
- [ ] `/codex:review` run after build
