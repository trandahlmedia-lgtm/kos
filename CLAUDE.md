# KOS — Konvyrt Operating System

Private internal tool for Konvyrt Marketing (Jay + Dylan). Replaces scattered docs, Meta Business Suite guessing, and manual lead tracking. Clients, content, leads, AI workflows, and billing in one place. **The client's `claude_md` field is the brain — every AI workflow reads from it.**

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

## CURRENT STATE — (overwrite this section, never append)

<!-- Claude Code: At the end of each session, REPLACE everything between the markers below with a fresh 3-5 line snapshot. Do NOT grow this section. Delete the old content and write the new summary. Keep it under 6 lines. -->

<!-- STATE:START -->
**Last updated:** 2026-04-04
**Phases 1-3 complete.** Auth, client hub, content engine, and AI workflows built and functional. Phase 3 passed Codex review, lint, and build clean.
**Phase 4 is next:** Lead pipeline — full spec in `KOS_Phase4_BuildPlan.md`. Kickoff prompt in `KOS_SessionHandoff.md`.
**Open TODO:** Add `MODEL.fast` (Haiku) to `lib/ai/claude.ts` as part of Phase 4 — research sub-agents use it.
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
| Workflow | Current | Recommended | Rationale |
|----------|---------|-------------|-----------|
| Weekly plan generation | Sonnet | **Sonnet** | Needs strategic thinking about content themes |
| Caption generation (single post with brief) | Sonnet | **Haiku** | Brief already provides direction |
| Caption generation (batch/no brief) | Sonnet | **Sonnet** | Must infer tone/themes from claude_md |
| Brand doc generation | Sonnet | **Opus** | One-time, high-stakes doc that shapes all future output |
| Platform bios | Sonnet | **Haiku** | Short-form, constrained output |
| Client intake assistant | Sonnet | **Sonnet** | Conversational, needs good follow-up questions |

**TODO:** Add `MODEL.fast = 'claude-haiku-4-5-20251001'` to `lib/ai/claude.ts` and update `PRICING` map. Then update individual workflow routes to use the recommended model tier.

### Local/Open-Source Models
Not recommended for KOS today. All current workflows need brand-aware, nuanced content generation. The ops overhead of running local inference doesn't justify the savings for a 2-person team. **Revisit in Phase 4** — bulk lead classification/scoring could be a fit for a local model.

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
app/(dashboard)/content/          — Content engine (What's Next, calendar, schedule)
app/(dashboard)/workflows/        — AI workflow runner UI
proxy.ts                          — Auth guard (Next.js 16 convention, NOT middleware.ts)
```

### API Routes
```
app/api/ai/weekly-plan/           — Weekly content plan generation
app/api/ai/captions/              — Caption generation (single + batch)
app/api/ai/brand-doc/             — Brand document generation
app/api/ai/platform-bios/        — Platform-specific bio generation
app/api/ai/client-intake/         — Client intake assistant
app/api/media/upload/             — File upload to Supabase storage
```

### Components
```
components/clients/               — Client hub, overview, onboarding, CLAUDE.md editor
components/content/               — Queue, calendar, day view, schedule panel
components/workflows/             — Workflow page, dialogs, runners
components/layout/                — Sidebar navigation
components/shared/                — StatusBadge, PlatformIcon, EmptyState
components/ui/                    — shadcn/ui primitives (don't modify directly)
```

### Lib (Business Logic)
```
lib/ai/claude.ts                  — Claude API wrapper (MODEL config, callClaude, streamClaude, extractJSON)
lib/ai/costTracker.ts             — Logs AI runs to ai_runs table (tokens, cost, duration)
lib/ai/generateCaptions.ts        — Shared caption generation logic
lib/ai/prompts/                   — Prompt templates: brandDoc, captions, clientIntake, platformBios, weeklyPlan
lib/actions/clients.ts            — Server actions: CRUD clients
lib/actions/posts.ts              — Server actions: CRUD posts
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
supabase/migrations/              — SQL migration files
```

Schema in Supabase. Tables: `profiles`, `clients`, `posts`, `captions`, `media`, `leads`, `onboarding_steps`, `ai_runs`, `invoices`, `activity_log`. Storage bucket: `kos-media`. RLS on all tables. Types mirrored in `types/index.ts`.

---

## Tech Stack

| Layer | Choice | Notes |
|-------|--------|-------|
| Framework | Next.js 16 (App Router, TypeScript) | No Pages Router. Check `node_modules/next/dist/docs/` for v16 conventions |
| Database + Auth | Supabase | Postgres + GoTrue Auth |
| Styling | Tailwind CSS v4 + shadcn/ui | Dark mode only. @theme in globals.css — NO tailwind.config.ts |
| AI | Anthropic Claude API | Wrapper in `lib/ai/claude.ts`. Haiku/Sonnet/Opus tiered |
| State | TanStack React Query | Client-side data fetching/caching |
| Validation | Zod v4 | Server actions + API routes |
| Package manager | npm | |
| Auth | `proxy.ts` (root) | Next.js 16 convention — not middleware.ts |

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

Second-pass code review via OpenAI Codex, invoked directly from Claude Code. Useful for catching hidden assumptions, validating migrations/auth changes, and getting a different agent's perspective without leaving the workflow.

### Prerequisites

- ChatGPT subscription (including Free) or OpenAI API key
- Node.js 18.18+
- Codex CLI installed: `npm install -g @openai/codex`
- Codex authenticated: `!codex login` (run inside Claude Code if needed)

### Setup

```bash
/plugin marketplace add openai/codex-plugin-cc
/plugin install codex@openai-codex
/codex:setup
```

Optional review gate (blocks Claude Code exit until Codex review completes — use carefully, burns usage fast):
```bash
/codex:setup --enable-review-gate
```

### Core Commands

| Command | What it does |
|---------|-------------|
| `/codex:review` | Standard read-only Codex review |
| `/codex:adversarial-review` | Skeptical challenge review — questions the implementation |
| `/codex:rescue` | Hands the task to Codex directly |
| `/codex:review --background` | Run review in background |
| `/codex:status` | Check background job status |
| `/codex:result` | Get background job result |
| `/codex:cancel` | Cancel background job |

### When to Use

- **`/codex:review`** — Default second pass on all work.
- **`/codex:adversarial-review`** — High-stakes changes: migrations, auth, infra scripts, refactors, anything where danger is hidden assumptions.
- **`/codex:rescue`** — When a Claude Code thread stalls or you want Codex to take over.

Plugin repo: https://github.com/openai/codex-plugin-cc

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

- **Phase 1 — COMPLETE:** Auth, sidebar, dashboard shell, client list, client hub (overview + CLAUDE.md editor + onboarding checklist)
- **Phase 2 — COMPLETE:** Content engine (What's Next queue, weekly calendar, day view, schedule panel, creative upload, manual captions)
- **Phase 3 — COMPLETE:** AI workflows (Claude API infra, weekly plan, captions, brand doc, platform bios, client intake, workflows page)
- **Phase 4 — NEXT:** Lead pipeline (kanban, qualification scorecard, research agent, lead-to-client conversion)
- **Phase 5:** Media library + filming sessions + platform setup module
- **Phase 6:** Dashboard polish (Today view, scorecard, lifecycle alerts, analytics + billing)

## Not Building

No public pages, no client portal, no Stripe, no mobile layout, no dark/light toggle, no Canva auto-gen (brief export only), no notifications (yet).

---

## Reference Docs

| File | Purpose |
|------|---------|
| `AGENTS.md` | Next.js 16 agent rules — read before touching routing/config |
| `KOS_MasterBuildPlan.md` | Full build plan across all phases |
| `KOS_Phase3_BuildPlan.md` | Phase 3 AI workflows detailed spec |
| `KOS_Phase2_Amendments.md` | Phase 2 changes |
| `KOS_AIWorkflow_ClientIntakeAssistant.md` | Client intake workflow spec |
| `KOS_SessionHandoff.md` | Session handoff notes between builds |
