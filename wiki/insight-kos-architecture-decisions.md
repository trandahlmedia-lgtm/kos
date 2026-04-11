---
type: insight
track: KOS
created: 2026-04-10
updated: 2026-04-10
status: current
sources: [CLAUDE.md, KOS_ContentEngine_Handoff_v5.md, KOS_Competitive_Research.md]
---

# KOS Architecture Decisions

Key technical and product decisions that shape KOS and why they were made. Future sessions should understand these before proposing changes.

## Content

### claude_md as the Brain
Every client in KOS has a `claude_md` field in the database. Every AI workflow reads from it. This is the single most important design decision in KOS — the brand doc IS the system prompt. When the brand doc is good, everything downstream (captions, visuals, weekly plans, bios) is good. When it's bad, nothing works.

**Implication:** Brand doc generation (Phase 3 workflow) is arguably the highest-stakes AI call in the system. It runs on Opus, not Sonnet, because it shapes all future output.

### Model Routing — Cheapest That Works
KOS uses tiered Claude models: Opus for architecture/brand docs, Sonnet for standard features/content, Haiku for simple lookups/scaffolding. This isn't theoretical — it directly controls Jay's API costs. Wrong-tier routing wastes real money.

**Current gap:** `MODEL.fast` (Haiku) hasn't been added to `lib/ai/claude.ts` yet. TODO from Phase 3.

### Dark Mode Only, Desktop Only
No light mode, no mobile layout. Jay and Dylan are the only users. This eliminates 50% of the UI work that doesn't serve anyone. If KOS ever gets external users, revisit — but not before.

### Direct HTML Over Templates
Pivoted from 14 pre-built carousel templates to Claude generating HTML directly. Massive quality improvement. Template mode is now dead code. See [[concept-direct-html-generation]].

### Next.js 16 + Supabase + Tailwind v4
- `proxy.ts` for auth (NOT middleware.ts — this is a Next.js 16 convention)
- Three Supabase clients: browser, server, admin (RLS bypass). Server Actions re-verify auth.
- Tailwind v4 uses `@theme` in `globals.css` — no `tailwind.config.ts`
- shadcn/ui as component base — don't rebuild what exists

### What KOS Is NOT Building
No public pages, no client portal, no Stripe integration, no mobile, no dark/light toggle, no Canva auto-gen (brief export only), no notifications (yet). No mobile app — desktop-only is right at this scale.

### Competitive Positioning
KOS sits in a unique spot: it's not trying to be GoHighLevel (too bloated) or Jobber (field ops focused). It's an internal agency operating system that combines CRM, content engine, AI workflows, and lead pipeline — purpose-built for a 2-person home service marketing agency. The closest competitors are GoHighLevel (for the all-in-one concept) and Planable (for the content engine UX).

Competitive research identified 10 actionable findings — see `KOS_Competitive_Research.md` for the full report. Top steals: Sonner for toasts, inline AI generation, drag-and-drop calendar with visual previews, magic link approvals.

## Connections

- [[concept-direct-html-generation]] — pivotal architecture call
- [[concept-visual-content-engine]] — the feature these decisions shaped
- [[concept-new-post-wizard]] — next major feature, needs careful architecture
- [[hub:entity-konvyrt-marketing]] — the agency KOS serves

## Open Questions

- When does KOS justify a local/open-source model for bulk operations (lead scoring, content classification)?
- Should KOS eventually support white-labeling for other agencies, or stay internal forever?
- Phase 4 (lead pipeline) introduces research sub-agents — how does this change the model routing strategy?
