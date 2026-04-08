# KOS — Session Handoff
## Drop this into a new Claude Code session to pick up exactly where we left off.

---

## WHO WE ARE

**Agency:** Konvyrt Marketing — full-service digital marketing for home service businesses. Twin Cities, MN.

**Jay + Dylan** — co-owners, both admins, both involved in everything. Equal partners with different strengths. Neither is siloed.

**Current client:** Northern Standard Heating & Air — Full Service tier, $3,000/mo.

**Goal next 3 months:** Sign 1-2 more solid clients.

---

## WHAT WE'RE BUILDING

**KOS — Konvyrt Operating System.** A private, internal web app for Jay and Dylan only. Single system for the entire agency: clients, content, leads, AI workflows, billing.

Full project spec: `CLAUDE.md`
Master build plan: `KOS_MasterBuildPlan.md`
Phase 4 detailed spec: `KOS_Phase4_BuildPlan.md`

Project folder: `C:\Users\jaytr\HQ\Projects\kos\`

---

## TECH STACK

- **Framework:** Next.js 16 (App Router, TypeScript) — no Pages Router
- **Database + Auth + Storage:** Supabase
- **Styling:** Tailwind CSS v4 + shadcn/ui — dark mode only, no tailwind.config.ts
- **AI:** Anthropic Claude API — Haiku/Sonnet/Opus tiered (see MODEL ROUTING in CLAUDE.md)
- **Auth proxy:** `proxy.ts` at root — NOT middleware.ts (Next.js 16 convention)
- **File processing:** Sharp
- **Query caching:** TanStack React Query
- **Package manager:** npm

---

## DESIGN

Linear.app aesthetic — dark, minimal, fast, tool-like. No gradients, no decorative elements.

```
Background:       #0a0a0a
Surface:          #111111
Surface elevated: #1a1a1a
Border:           #2a2a2a
Accent:           #E8732A  (Konvyrt amber)
Text primary:     #ffffff
Text secondary:   #999999
Text muted:       #555555
```

---

## CURRENT BUILD STATUS

| Phase | What | Status |
|-------|------|--------|
| 1 | Login, sidebar, dashboard shell, clients, client hub | ✅ Complete |
| 2 | Content engine — post cards, calendar, schedule panel, creative upload | ✅ Complete |
| 3 | AI workflows — Claude API, weekly plan, captions, brand doc, platform bios, client intake | ✅ Complete |
| 4 | Lead pipeline — kanban, research agent, scoring, call summary, conversion | ⬅ NEXT |
| 5 | KOS AI assistant + media library + filming sessions + platform setup | Pending |
| 6 | Ad campaign management + dashboard polish + billing | Pending |

**Phase 3 was reviewed with Codex + lint + build — all clean before Phase 4 start.**

---

## INFRASTRUCTURE STATUS

| Item | Status |
|------|--------|
| GitHub repo | ✅ https://github.com/trandahlmedia-lgtm/kos.git |
| Supabase project | ✅ US East (N. Virginia) |
| Supabase migrations | ✅ 001_rate_limits.sql applied |
| Supabase storage bucket | ✅ kos-media (private) |
| Supabase Realtime | ✅ Enabled on posts, leads, clients |
| Supabase users | ✅ Jay + Dylan |
| Anthropic API key | ✅ In .env.local |
| Vercel | ⏳ Not deployed yet |

---

## PHASE 4 KICKOFF PROMPT

Paste this into Claude Code at the start of the next session:

---

```
Read CLAUDE.md first, then read KOS_Phase4_BuildPlan.md. Do not start building until you have read both files completely.

We have completed Phases 1, 2, and 3. Phase 3 passed lint and build clean. Now build Phase 4 — the lead pipeline — exactly as specified in KOS_Phase4_BuildPlan.md.

Before writing any code, enter Plan Mode:
1. State what you're about to build
2. List every file you will create or modify
3. List the migration changes needed
4. Ask me if anything is ambiguous

Key things to know before you plan:
- Check the existing `leads` table schema in Supabase before writing the migration — alter only what's missing, don't drop and recreate
- Lead detail is a slide-in panel (same UX pattern as SchedulePanel in content), NOT a separate route
- Research agent runs 5 sequential Haiku sub-agents, synthesized by a Sonnet orchestrator
- All AI routes need rate limiting (LIMITS.USER_HEAVY) and Zod validation
- Auth proxy is proxy.ts at root — /api routes are already excluded from the matcher
- Use MODEL.fast (Haiku) for sub-agents — if it's not in lib/ai/claude.ts yet, add it as part of Phase 4
- Run `npm run lint && npm run build` before declaring Phase 4 complete
- Run /codex:review after the build passes

Do not build Phase 5 or 6 features. Scope is strictly what's in KOS_Phase4_BuildPlan.md.
```

---

## BETWEEN PHASES — ALWAYS DO THIS

1. Test the critical flows after each phase
2. Come back to Cowork and report anything broken or different from plan
3. Cowork updates the docs
4. Then kick off the next phase

---

## JAY'S PREFERENCES FOR ALL SESSIONS

- Direct and efficient. No fluff, no over-explaining.
- Concrete next steps, not theory.
- Home services industry background — don't over-explain that world.
- Flag model choice before starting any task.
- Confidence gate: reach 95% confidence before writing any code. Plan first, build once.

---

*Last updated: 2026-04-04. Phases 1–3 complete and clean. Phase 4 ready to build.*
