# KOS Phase 3 — AI Workflows Build Plan

## Read CLAUDE.md, KOS_MasterBuildPlan.md, and KOS_Phase2_Amendments.md first. This plan incorporates decisions made in the April 4, 2026 planning session.

---

## BEFORE YOU START — Pre-flight Checklist

Do these BEFORE writing any Phase 3 code:

### 1. Fix the Profiles Blocker
Run this SQL in Supabase SQL Editor:
```sql
INSERT INTO profiles (id, name, email)
SELECT
  u.id,
  COALESCE(
    u.raw_user_meta_data->>'name',
    u.raw_user_meta_data->>'full_name',
    split_part(u.email, '@', 1)
  ) AS name,
  u.email
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
WHERE p.id IS NULL;
```
Verify: `SELECT id, name, email FROM profiles;` should show Jay and Dylan.

### 2. Remove Debug Log
Delete the `console.log('[clients page] profiles result:...')` line in `app/(dashboard)/clients/page.tsx`.

### 3. Confirm SUPABASE_SERVICE_ROLE_KEY is in .env.local
Check: `SUPABASE_SERVICE_ROLE_KEY=` must have a value. Get it from Supabase → Project Settings → API → service_role.

### 4. Install Phase 3 Dependencies
```bash
npm install @anthropic-ai/sdk
```
(Skip Inngest for now — all workflows run as direct API calls. Add Inngest later if background processing is needed.)

### 5. Import Northern Standard Brand Doc
Pull the existing CLAUDE.md from `C:\HQ\Clients\Northern Standard\CLAUDE.md` and paste it into the `claude_md` field on the Northern Standard client record in KOS. This is the brand doc the AI will read for all NS content generation. **KOS is the source of truth going forward.**

---

## PHASE 3 BUILD ORDER

Build in this exact order. Each step builds on the previous one.

---

### Step 1: Claude API Infrastructure

Create `lib/ai/claude.ts`:

```typescript
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export const MODEL = {
  default: 'claude-sonnet-4-6',
  powerful: 'claude-opus-4-6',
}

export const PRICING = {
  'claude-sonnet-4-6': { input: 3 / 1_000_000, output: 15 / 1_000_000 },
  'claude-opus-4-6': { input: 15 / 1_000_000, output: 75 / 1_000_000 },
}

// Standard (non-streaming) call
export async function callClaude(params: {
  model?: string
  system: string
  prompt: string
  maxTokens?: number
}) {
  const model = params.model ?? MODEL.default
  const response = await client.messages.create({
    model,
    max_tokens: params.maxTokens ?? 4096,
    system: params.system,
    messages: [{ role: 'user', content: params.prompt }],
  })

  const inputTokens = response.usage.input_tokens
  const outputTokens = response.usage.output_tokens
  const pricing = PRICING[model as keyof typeof PRICING]
  const costUsd = pricing
    ? inputTokens * pricing.input + outputTokens * pricing.output
    : 0

  return {
    content: response.content[0].type === 'text' ? response.content[0].text : '',
    usage: { inputTokens, outputTokens, costUsd },
    model,
  }
}

// Streaming call (for longer outputs like content plans)
export async function streamClaude(params: {
  model?: string
  system: string
  prompt: string
  maxTokens?: number
}) {
  const model = params.model ?? MODEL.default
  return client.messages.stream({
    model,
    max_tokens: params.maxTokens ?? 4096,
    system: params.system,
    messages: [{ role: 'user', content: params.prompt }],
  })
}
```

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

---

### Step 2: Prompt Templates (Priority Workflows Only)

Create `lib/ai/prompts/` directory. Build these two first — they are the highest priority:

#### 2a: Weekly Content Plan Generator — `lib/ai/prompts/weeklyPlan.ts`

This is the core workflow. It generates a full week of content for a client.

**Input:** Client's `claude_md`, the week start date, number of post slots to fill (default: 4-6 mixing 1-2 static, 1-2 reels, 1-2 stories), the client's active platforms.

**Output:** Structured JSON array of post objects, each containing:
- `scheduled_date` (specific day)
- `scheduled_time` (suggested time)
- `platform` (primary platform)
- `cross_post_platforms` (array of all platforms to cross-post to)
- `content_type` (from the existing enum: offer, seasonal, trust, differentiator, social_proof, education, bts, before_after)
- `format` (static, reel, story — this is guidance for the human, not a DB field)
- `angle` (1-2 sentence description of what to create — e.g., "Before/after of a furnace install, focus on the clean ductwork")
- `caption_brief` (key points the caption should hit — used later by caption generator)
- `ai_reasoning` (why this angle on this day for this client)

**Prompt rules:**
- Read the client's posting schedule and content pillars from CLAUDE.md
- Balance content types across the week (don't do 3 trust posts in a row)
- Account for seasonality (read the current date and match to seasonal focus)
- Prioritize dream jobs and current offers from the brand doc
- If the client's CLAUDE.md specifies posting frequency, follow it exactly
- If not specified, default to: 1-2 static, 1-2 reels, 1-2 stories per week
- Cross-post everything to all active platforms by default
- Adapt format suggestions per platform (reels for IG/TikTok, static+longer captions for FB)

**Critical:** The prompt must instruct Claude to return valid JSON only. Use a JSON schema in the prompt. Parse the response and validate before creating post records.

#### 2b: Caption Generator — `lib/ai/prompts/captions.ts`

**Input:** Client's `claude_md`, the post's `content_type`, `platform`, `angle`/`caption_brief` from the weekly plan, and the `format` (static/reel/story).

**Output:** JSON object with:
- `best_caption` — the AI's top pick, auto-assigned to the post
- `alternative_1` — second option
- `alternative_2` — third option
- Each caption includes: `content` (the caption text), `cta` (call to action), `hashtags` (platform-appropriate)

**Prompt rules:**
- Read voice & tone from CLAUDE.md — never drift into generic marketing voice
- Pull specific pain points and differentiators from the brand doc
- Platform-specific formatting:
  - Instagram: shorter, visual-first, relevant hashtags (15-20)
  - Facebook: longer captions ok, local hashtags, conversational tone
  - TikTok: short, punchy, trending format aware
  - Stories: ultra-short, 1-2 lines max, direct CTA
- CTA must be specific and from the brand doc (e.g., "Call (612) 655-3370" not "Learn More")
- Include the client's phone number in every caption if their brand doc specifies it
- Never use phrases listed in the client's "Things to Avoid" section

---

### Step 3: API Routes

#### 3a: Weekly Plan Generator — `app/api/ai/weekly-plan/route.ts`

```
POST /api/ai/weekly-plan
Body: { clientId: string, weekStartDate: string }
```

Flow:
1. Auth check
2. Rate limit check (from `lib/security/rateLimit.ts` — adapt existing or use the pattern from CLAUDE.md 4.9)
3. Fetch client record (need `claude_md`, `platforms`, `posting_frequency`)
4. Call Claude with `weeklyPlan` prompt
5. Parse JSON response
6. Create post records in `posts` table — one row per planned post, status = `'slot'`, with `scheduled_date`, `platform`, `content_type`, `ai_reasoning` filled in
7. Log the run to `ai_runs`
8. Return created post IDs

**Important:** Each post gets ALL the client's active platforms in a metadata field or the primary platform in the `platform` column. Since the DB schema has a single `platform` column per post, cross-posting means creating one post record per platform. OR — simpler approach — use the primary platform in the `platform` field and store `cross_post_platforms` in a new JSONB column or in `ai_reasoning`. Decide which is cleaner. (Recommendation: one post per platform is cleaner for the calendar view and status tracking, but creates more rows. Jay's call — ask if unclear.)

#### 3b: Caption Generator — `app/api/ai/captions/route.ts`

```
POST /api/ai/captions
Body: { postId: string }
```

Flow:
1. Auth check
2. Fetch post + client's `claude_md`
3. Call Claude with `captions` prompt
4. Parse response → get 3 captions
5. Insert 3 rows into `captions` table linked to `post_id`
6. Auto-select the `best_caption`: set `is_selected = true` on that row, update `posts.selected_caption_id` and `posts.caption` with the best caption content
7. Log the run to `ai_runs`
8. Return captions

#### 3c: Batch Caption Generator — `app/api/ai/captions/batch/route.ts`

```
POST /api/ai/captions/batch
Body: { postIds: string[] }
```

After a weekly plan generates 4-6 posts, this route generates captions for ALL of them in one click. Calls the caption generator for each post sequentially (or in parallel if rate limits allow). Returns all captions.

---

### Step 4: Update Phase 2 Components

#### 4a: CaptionEditor.tsx — Make AI Functional

Replace the 3 grayed-out placeholder cards with real AI caption cards:

- Add a "Generate Captions" button (accent color) above the caption options
- On click → call `/api/ai/captions` with the post ID
- Show loading state while generating
- When complete, display 3 caption cards:
  - Best caption is pre-selected (accent border, filled radio)
  - Other 2 are selectable (click to select)
  - Each shows: full caption text, CTA line, hashtags
  - "Copy" button on each card
- Manual caption textarea remains below as a 4th option
- Selecting any caption (AI or manual) updates `posts.selected_caption_id` and `posts.caption`
- "Show alternatives" behavior: if a caption was already auto-filled, the 3 cards are collapsed by default. Click "Show alternatives" to expand and see all 3.

#### 4b: ContentPageClient.tsx — Add "Generate Week" Button

Add a "Generate This Week" button (accent color) next to the "New Post" button:
- Only visible when a specific client is selected in the client filter (not "All Clients")
- On click → call `/api/ai/weekly-plan` with client ID and current week start date
- Show loading state: "Generating content plan for [Client Name]..."
- When complete → new post slots appear on the calendar/queue
- Then auto-trigger batch caption generation for all new slots
- Final state: 4-6 new posts on the calendar with captions pre-filled, ready for media

#### 4c: SchedulePanel.tsx — Add Caption Generation Trigger

In the schedule panel (slide-in), if the post has no caption:
- Show a "Generate Caption" button that triggers AI caption generation for that single post
- Same behavior as CaptionEditor but triggered from the panel

#### 4d: Auto-Generate Next Week

Add logic: when ALL posts in a week for a client are marked "scheduled" or "published":
- Show a banner/card: "Week complete for [Client]. Generate next week?"
- Button: "Generate Next Week" → calls the weekly plan API for the following week
- Include suggested dates: "Start building by [date], have ready by [date]" (calculated as: build by = 5 days before the week starts, ready by = 2 days before)

This should appear in the What's Next queue and on the content page.

---

### Step 5: Workflows Page — Runner UI

Replace the placeholder `app/(dashboard)/workflows/page.tsx` with a real workflow runner.

**Layout:**
- Client selector dropdown at top (required before running any workflow)
- Grid of workflow cards (2 columns)
- Each card: workflow name, 1-line description, "Run" button
- Clicking "Run" opens a dialog with workflow-specific inputs and output panel

**Workflow cards to build (priority order):**

1. **Weekly Content Plan** — "Generate a week of content"
   - Inputs: Week start date (default: next Monday)
   - Output: Summary of posts created + link to content calendar
   - Action: "View in Calendar" button

2. **Caption Generator** — "Write captions for a post"
   - Inputs: Post selector (dropdown of posts with no caption)
   - Output: 3 caption options displayed
   - Action: "Apply Best Caption" button

3. **Brand Doc Generator** — "Generate a client's brand document"
   - Inputs: Structured intake form (company name, industry, services, service area, audience, voice/tone, differentiators, competitors, social links)
   - Output: Full CLAUDE.md brand document displayed in a preview panel
   - Action: "Save to Client" button → writes to `clients.claude_md`

4. **Client Intake Assistant** — "Research a business and pre-fill their profile" (Workflow #9)
   - Inputs: Company name + website URL
   - Output: Pre-filled client form with AI recommendations highlighted in accent
   - Action: "Create Client" button → creates client record + onboarding steps
   - See `KOS_AIWorkflow_ClientIntakeAssistant.md` for full spec
   - Note: website fetching is server-side via Next.js API route to avoid CORS

5. **Platform Bios** — "Generate platform-specific bios"
   - Inputs: none (reads from client's CLAUDE.md + platforms)
   - Output: Bio text for each active platform
   - Action: "Copy" button per bio

**Deprioritize for now (build later or in Phase 6):**
- Video Scripts
- Design Brief
- Analytics Report
- Lead Research (build with Phase 4)

**Recent Runs section:** Below the workflow cards, a collapsible "Recent Runs" table showing data from `ai_runs` — workflow name, client, timestamp, token count, cost, status. Muted text. Sorted by most recent.

---

### Step 6: Cross-Post Caption Adaptation

When the weekly plan creates posts that cross-post to multiple platforms, the caption generator should produce platform-adapted versions:

- If a post is for IG + FB + TikTok, generate 3 versions of the best caption (one per platform)
- Store each as a separate caption row tagged with the platform
- In the SchedulePanel, show the caption for the relevant platform with a tab switcher: "Instagram | Facebook | TikTok" so Jay can copy the right version

**Implementation approach:** Add a `platform` column to the `captions` table (nullable — null means generic/all platforms). When generating captions for a cross-posted post, the prompt includes instructions to adapt per platform.

**Migration needed:**
```sql
ALTER TABLE captions ADD COLUMN platform TEXT;
```

---

## DECISIONS LOCKED IN (from planning session)

These are confirmed. Do not deviate.

| Decision | Choice |
|---|---|
| Caption flow | AI auto-fills best caption. "Show alternatives" reveals 2 more options on demand. |
| Weekly plan output | Auto-creates real post records in DB (status: 'slot'). No approval step. |
| Plan cadence | Rolling week-by-week. Auto-suggests next week when current week is complete. |
| Post volume per client | 1-2 static, 1-2 reels, 1-2 stories per week (4-6 total). AI decides mix. |
| Platform strategy | Cross-post everything to all active platforms. AI adapts caption per platform. |
| Streaming | Not required. Loading spinner → finished results is fine. |
| Background jobs (Inngest) | Skip for now. Direct API calls only. Add Inngest later if needed. |
| Priority workflows | Weekly plan + captions first. Then brand doc generator + intake assistant. |
| AI model | claude-sonnet-4-6 for all workflows (fast + cheap). No need for opus. |

---

## DOCS TO UPDATE BEFORE BUILDING

1. **CLAUDE.md** — Add this Phase 3 plan reference. Update Phase status: "Phase 2 — COMPLETE. Phase 3 — IN PROGRESS."
2. **KOS_Phase2_Amendments.md** — No changes needed, but Amendment 3 (caption placeholders) will be replaced by real AI captions in this phase.
3. **types/index.ts** — Add types for AI workflow responses (WeeklyPlanPost, CaptionResponse, etc.)

---

## CLAUDE CODE SESSION KICKOFF PROMPT

Copy-paste this when starting Phase 3:

```
Read these files in order:
1. CLAUDE.md
2. KOS_MasterBuildPlan.md
3. KOS_Phase2_Amendments.md
4. KOS_Phase3_BuildPlan.md

Phase 3 is now active. Build in the exact order specified in KOS_Phase3_BuildPlan.md.
Start with the pre-flight checklist (Step 0), then proceed step by step.
Do not skip steps. Do not build workflows that aren't in the priority list.
Ask me if you hit a blocker.
```

---

*Created: April 4, 2026. Based on planning session decisions. Read alongside CLAUDE.md and KOS_MasterBuildPlan.md.*
