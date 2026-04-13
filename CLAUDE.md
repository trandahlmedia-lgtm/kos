# KOS — Konvyrt Operating System

Private internal tool for Konvyrt Marketing (Jay + Dylan). Replaces scattered docs, Meta Business Suite guessing, and manual lead tracking. Clients, content, leads, AI workflows, outreach, and billing in one place. **The client's `claude_md` field is the brain — every AI workflow reads from it.**

---

## CONFIDENCE GATE — READ THIS FIRST

**Do not execute any build, code generation, or file modification until you reach 95% confidence in what is being asked.** This is non-negotiable.

Before writing code:
1. **Enter Plan Mode.** Outline what you intend to build, which files you'll touch, and why.
2. **State your understanding back** to the user in plain English. Include scope, affected files, and expected behavior.
3. **Ask clarifying questions** if anything is ambiguous — scope, behavior, edge cases, UI expectations.
4. **Get explicit approval** before exiting Plan Mode and executing.

If the task is a small bug fix in a single file, you can skip the full plan — but still state what you're changing and why before editing.

**Why:** Agent workflows consume 7-10x more tokens than single-agent sessions. A wrong build wastes real money. Plan first, build once.

---

## Build & Quality

After making code changes, always run the build (`npm run build` or equivalent) and fix any errors before presenting work as complete. Never skip the build verification step.

---

## Debugging

Before fixing a bug, verify the root cause by tracing the full data flow (UI → state → API → database). Do not fix symptoms at the wrong layer. Check if the issue is data-layer (missing DB records) vs code-layer before writing fixes.

---

## Code Changes

When making multi-file changes, do NOT introduce regressions in existing functionality. Before editing a file, read the current implementation fully to understand what behavior must be preserved.

---

## Content Writing

For content writing tasks (social media captions, ad copy, scripts): be minimal and precise. Do not add details the user hasn't mentioned. When describing a video/reel, only reference what's actually shown in the footage, not the full service process.

---

## CURRENT STATE — (overwrite this section, never append)

<!-- Claude Code: At the end of each session, REPLACE everything between the markers below with a fresh 3-5 line snapshot. Do NOT grow this section. Delete the old content and write the new summary. Keep it under 6 lines. -->

<!-- STATE:START -->
**Last updated:** 2026-04-12
**Phases 1–4 complete. Phase 5 substantially built.** Auth, client hub, content engine (7-step wizard), 8 AI workflows, lead pipeline (kanban + 6-agent research + scoring + conversion), and outreach engine (cold email sequences + Resend integration) all operational. Build and lint pass clean. Deployed to kos-kohl.vercel.app.
**Phase 6 is next:** Dashboard polish — Today view, analytics, billing/Stripe, lifecycle alerts.
**Open items:** Media library UI incomplete (tables/routes exist, search/filter not built). Playwright PNG export not wired. Resend API key needed for live outreach sends. Cron jobs for follow-up automation not scheduled yet.
<!-- STATE:END -->

---

## MODEL ROUTING — USE THE CHEAPEST MODEL THAT WORKS

### In Claude Code (subagents)
| Task type | Model | Why |
|-----------|-------|-----|
| Complex architecture, multi-file refactors, new features | **Opus** | Needs deep reasoning across files |
| Standard feature work, moderate edits, debugging | **Sonnet** | Good balance of quality/cost |
| One-off file edits, linting, formatting, simple lookups, grep/search | **Haiku** | Fast, cheap, no reasoning needed |
| Boilerplate generation, repetitive scaffolding | **Haiku** | Pattern-following, no creativity needed |

**Default to Haiku for subagent delegation.** Only escalate to Sonnet/Opus when the task genuinely requires multi-step reasoning or cross-file context.

### In KOS AI Workflows (API calls via `lib/ai/claude.ts`)
| Workflow | Model | Rationale |
|----------|-------|-----------|
| Weekly plan generation | **Sonnet** | Needs strategic thinking about content themes |
| Caption generation (single post with brief) | **Haiku** | Brief already provides direction |
| Caption generation (batch/no brief) | **Sonnet** | Must infer tone/themes from claude_md |
| Brand doc generation | **Opus** | One-time, high-stakes doc that shapes all future output |
| Platform bios | **Haiku** | Short-form, constrained output |
| Client intake assistant | **Sonnet** | Conversational, needs good follow-up questions |
| Angle suggestion | **Haiku** | Quick suggestion with seasonal context |
| Format recommendation | **Haiku** | Simple carousel vs. static decision |
| Caption tweaks | **Haiku** | Fast refinement of existing caption |
| Lead research (sub-agents) | **Haiku** | Each sub-agent is focused, single-task |
| Lead research (orchestrator) | **Sonnet** | Synthesizes all sub-agent findings |
| Outreach email drafting | **Sonnet** | Needs personalization from research data |

`MODEL.fast` (Haiku) is live in `lib/ai/claude.ts`. All models configured with cost tracking.

---

## Build Commands

```bash
npm run dev          # Dev server → http://localhost:3000
npm run build        # Production build — must pass before any PR/deploy
npm run start        # Production server
npm run lint         # ESLint — run after code changes
```

**Pre-commit:** `npm run lint && npm run build` must both pass.

---

## File Index — Where Things Live

### App Routes
```
app/layout.tsx                    — Root layout (fonts, providers, metadata)
app/globals.css                   — Tailwind v4 @theme config, all design tokens
app/(auth)/login/                 — Login page (only unprotected route)
app/(dashboard)/                  — All protected routes (layout.tsx has sidebar)
app/(dashboard)/clients/          — Client list + [id] hub
app/(dashboard)/content/          — Content engine (What's Next, calendar, wizard)
app/(dashboard)/workflows/        — AI workflow runner UI
app/(dashboard)/leads/            — Lead pipeline (kanban + list view)
app/(dashboard)/outreach/         — Outreach engine (drafts, hot leads, stats)
app/(dashboard)/media/            — Media library (route exists, UI incomplete)
proxy.ts                          — Auth guard (Next.js 16 convention, NOT middleware.ts)
```

### API Routes
```
# Content Engine
app/api/ai/weekly-plan/           — Weekly content plan generation
app/api/ai/captions/              — Caption generation (multi-platform)
app/api/ai/suggest-angle/         — AI angle suggestion with seasonal context
app/api/ai/recommend-format/      — Carousel vs. static recommendation
app/api/ai/tweak-caption/         — Caption refinement (Haiku)
app/api/ai/brand-doc/             — Brand document generation
app/api/ai/platform-bios/         — Platform-specific bio generation
app/api/ai/client-intake/         — Client intake assistant
app/api/ai/visuals/               — Visual content generation (HTML)
app/api/media/upload/             — File upload to Supabase storage

# Lead Pipeline
app/api/leads/                    — Lead CRUD + filtering
app/api/leads/[id]/               — Single lead operations
app/api/leads/[id]/stage/         — Kanban stage changes + activity log
app/api/leads/[id]/convert/       — Lead-to-client conversion
app/api/leads/[id]/disqualify/    — Disqualify lead
app/api/leads/[id]/requalify/     — Requalify lead
app/api/ai/lead-research/         — Trigger full 6-agent research (fire-and-forget)
app/api/ai/lead-research/running/ — Poll for research-in-progress
app/api/ai/lead-research/status/  — Research status for specific lead
app/api/ai/lead-research/process-one/ — Single lead research (for batch)
app/api/ai/lead-research/active-status/ — Active batch status
app/api/ai/lead-research/reset-stuck/  — Unstick stuck research
app/api/ai/lead-score/            — Score a lead from research data
app/api/ai/call-summary/          — Summarize call transcript

# Outreach Engine
app/api/ai/outreach-draft/        — Draft 4-email sequence for a lead
app/api/ai/outreach-draft/active/ — Active draft status
app/api/outreach/send/            — Send email via Resend
app/api/outreach/unsubscribe/     — Handle unsubscribe
app/api/cron/outreach-followups/  — Cron endpoint for scheduled sends
app/api/webhooks/resend/          — Resend bounce/open tracking (partial)
```

### Components
```
components/clients/               — Client hub, overview, onboarding, CLAUDE.md editor, brand assets
components/content/               — Queue, calendar, day view, schedule panel
components/content/wizard/        — New Post Wizard (7 steps: StepClient through StepCaption)
components/content/NewPostWizard.tsx — Wizard shell, state, navigation
components/workflows/             — Workflow page, dialogs, runners
components/leads/                 — Kanban, lead cards, detail panel, research tab, notes tab, bulk import, convert dialog, batch research
components/outreach/              — Review queue, email cards, email editor, hot leads, follow-ups, stats
components/layout/                — Sidebar navigation
components/shared/                — StatusBadge, PlatformIcon, EmptyState
components/ui/                    — shadcn/ui primitives (don't modify directly)
```

### Lib (Business Logic)
```
lib/ai/claude.ts                  — Claude API wrapper (MODEL.default + MODEL.fast + MODEL.powerful, callClaude, streamClaude, extractJSON)
lib/ai/costTracker.ts             — Logs AI runs to ai_runs table (tokens, cost, duration)
lib/ai/generateCaptions.ts        — Multi-platform caption generation (generateCaptionsForPlatforms)
lib/ai/seasonalCalendar.ts        — Holiday + HVAC seasonal context for angle suggestions
lib/ai/leadResearch.ts            — 6-agent research system (website, social, business intel, service fit, pricing, orchestrator)
lib/ai/outreachDraft.ts           — Cold email sequence drafting from research findings
lib/ai/prompts/                   — 13 prompt templates (brandDoc, captions, clientIntake, platformBios, weeklyPlan, leadResearch, outreach, visuals, etc.)
lib/actions/clients.ts            — Server actions: CRUD clients
lib/actions/posts.ts              — Server actions: CRUD posts
lib/actions/leads.ts              — Server actions: CRUD leads + stage changes + conversion
lib/actions/outreach.ts           — Server actions: email operations
lib/actions/onboarding.ts         — Server actions: onboarding steps
lib/actions/auth.ts               — Server actions: auth helpers
lib/security/rateLimit.ts         — Rate limiter (LIMITS.USER_HEAVY for AI endpoints)
lib/security/validation.ts        — Input validation (Zod)
lib/supabase/client.ts            — Browser Supabase client
lib/supabase/server.ts            — Server Supabase client (actions/routes)
lib/supabase/admin.ts             — Service role client (RLS bypass — use sparingly)
lib/utils.ts                      — cn() helper, shared utilities
```

### Types & Config
```
types/index.ts                    — All TypeScript types (single source of truth)
next.config.ts                    — Security headers, CSP policy
tsconfig.json                     — Strict mode, bundler resolution, @/* path alias
postcss.config.mjs                — PostCSS + Tailwind v4
components.json                   — shadcn/ui config
```

### Database
```
supabase/migrations/              — 15 SQL migration files (all applied)
```

Schema in Supabase. **17 tables:** `profiles`, `clients`, `posts`, `captions`, `media`, `post_visuals`, `leads`, `lead_research`, `lead_activities`, `outreach_emails`, `outreach_sequences`, `email_opt_outs`, `outreach_settings`, `onboarding_steps`, `ai_runs`, `invoices`, `platform_setups`. Storage bucket: `kos-media`. RLS on all tables. Types mirrored in `types/index.ts`.

---

## Tech Stack

| Layer | Choice | Notes |
|-------|--------|-------|
| Framework | Next.js 16 (App Router, TypeScript) | No Pages Router. Check `node_modules/next/dist/docs/` for v16 conventions |
| Database + Auth | Supabase | Postgres + GoTrue Auth |
| Styling | Tailwind CSS v4 + shadcn/ui | Dark mode only. @theme in globals.css — NO tailwind.config.ts |
| AI | Anthropic Claude API | Wrapper in `lib/ai/claude.ts`. Haiku/Sonnet/Opus tiered. Cost tracked. |
| State | TanStack React Query | Client-side data fetching/caching |
| Validation | Zod v4 | Server actions + API routes |
| Drag & Drop | dnd-kit | Kanban board |
| Email | Resend | Outreach sending (needs API key configured) |
| Package manager | npm | |
| Auth | `proxy.ts` (root) | Next.js 16 convention — not middleware.ts |

**TypeScript + Supabase rules:** Always use TypeScript strict mode compatible patterns. After Supabase `.update()` or `.insert()`, verify the return signature before chaining `.select()`.

---

## Design System

Dark mode only. No gradients. Linear.app aesthetic — clean, fast, tool-like.

```
Background:  #0a0a0a   Surface: #111111   Surface elevated: #1a1a1a
Border:      #2a2a2a   Text primary: #fff  Text secondary: #999999
Text muted:  #555555   Accent: #E8732A     Accent hover: #d4621f
```

Font: Inter. Spacing: 4px base. Max radius: `rounded-md`. shadcn/ui as component base. All borders `#2a2a2a`. Hover/active use accent color.

---

## Coding Conventions

1. TypeScript strict mode. No `any` unless unavoidable.
2. Server Components by default. `'use client'` only when interactivity needed.
3. Server Actions for mutations. Re-verify auth with `supabase.auth.getUser()` inside every action.
4. No inline styles — Tailwind only.
5. shadcn/ui as base. Don't rebuild what exists.
6. Loading states on every async op. Error boundaries (`error.tsx`) on every route.
7. No `console.log` in production code.
8. Desktop only — no mobile layout.
9. Comments on complex logic only.
10. Use `@/` path alias for imports.
11. Components PascalCase, route files kebab-case, lib files camelCase.

---

## Codex Review Plugin (Claude Code)

Second-pass code review via OpenAI Codex, invoked directly from Claude Code.

| Command | What it does |
|---------|-------------|
| `/codex:review` | Standard read-only Codex review |
| `/codex:adversarial-review` | Skeptical challenge review — questions the implementation |
| `/codex:rescue` | Hands the task to Codex directly |

Use `/codex:adversarial-review` for high-stakes changes: migrations, auth, infra scripts, refactors.

---

## Security Rules (Non-Negotiable)

1. **Env vars:** `ANTHROPIC_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `INNGEST_SIGNING_KEY` — server-side only, never `NEXT_PUBLIC_`
2. **Claude API calls:** Always through API routes or Server Actions. Key never touches the client.
3. **Supabase clients:** Three clients — `client.ts` (browser), `server.ts` (server), `admin.ts` (RLS bypass — sparingly)
4. **Auth proxy:** `proxy.ts` protects all routes except `/login`
5. **Server Actions:** Re-verify auth inside every action
6. **RLS:** Enabled on every table. Index RLS columns.
7. **Security headers:** CSP, X-Frame-Options, Permissions-Policy in `next.config.ts`
8. **Errors:** Full log server-side, generic message to client
9. **Rate limiting:** `lib/security/rateLimit.ts` — `LIMITS.USER_HEAVY` for AI calls
10. **Validation:** Zod on all user input before processing

---

## Phases

- **Phase 1 — COMPLETE:** Auth (invite-only), sidebar, dashboard shell, client list, client hub (overview + CLAUDE.md editor + onboarding checklist + brand assets)
- **Phase 2 — COMPLETE:** Content engine (What's Next queue, weekly calendar, day view, schedule panel, creative upload, post status tracking)
- **Phase 3 — COMPLETE:** AI workflows (Claude API infra with Haiku/Sonnet/Opus, weekly plan, captions, brand doc, platform bios, client intake, angle suggestion, format recommendation, caption tweaks, cost tracking — 8 workflows, 13 prompt templates)
- **Phase 4 — COMPLETE:** Lead pipeline (7-stage kanban with drag-and-drop, bulk CSV import, 6-agent AI research system, lead scoring 0-100, heat classification, activity logging, lead-to-client conversion) + Outreach engine (4-email cold sequences, AI-drafted from research, Resend integration, draft/send/track, opt-out handling, outreach settings, outreach dashboard)
- **Phase 5 — PARTIAL:** Visual engine (template-based HTML generation, color/font extraction, photo slots, export status tracking, media upload with thumbnails). Media library UI incomplete. PNG export not wired.
- **Phase 6 — NOT STARTED:** Dashboard polish (Today view, analytics, lifecycle alerts, billing/Stripe, notifications)

## Not Building

No public pages, no client portal, no Stripe (yet — Phase 6), no mobile layout, no dark/light toggle, no Canva auto-gen (brief export only), no notifications (yet — Phase 6).

---

## TODO — What's Left to Build

### Immediate (next session)
- [ ] Complete media library UI (search, filter, organize)
- [ ] Wire Playwright PNG export (1080x1350 / 1080x1920 captures)
- [ ] Configure Resend API key + verified domain for live outreach sends
- [ ] Schedule cron job for outreach follow-up automation
- [ ] Wire Resend webhook for bounce/open tracking

### Phase 6 (after immediate items)
- [ ] Today view dashboard (functional, not just stub)
- [ ] Analytics dashboard
- [ ] Lifecycle alerts
- [ ] Billing / Stripe integration
- [ ] Email notifications

### Future Ideas (captured, not scheduled)
- [ ] KOS Ads Manager — Phase 1: Visual campaign planner wizard
- [ ] KOS Ads Manager — Phase 2: Meta Marketing API integration (pull CPL, CTR, spend)
- [ ] KOS Ads Manager — Phase 3: AI analysis on live ad data
- [ ] Flux API integration ($0.03/image photorealistic AI)
- [ ] Ideogram API (text-in-image AI)
- [ ] Canva + Make.com batch automation
- [ ] KOS as a sellable product / white-label tool

---

## Reference Docs

| File | Purpose |
|------|---------|
| `AGENTS.md` | Next.js 16 agent rules — read before touching routing/config |
| `HYBRID_VISUAL_ENGINE_PLAN.md` | Current visual engine architecture (direct HTML generation) |
| `KOS_SessionHandoff.md` | Session handoff notes — update every session |
| `_archive/` | Old build plans and handoffs (historical reference only) |
