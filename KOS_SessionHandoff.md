# KOS & Northern Standard — Session Handoff v9

Drop this into a new Cowork session to pick up where we left off.

## What's Active

Two parallel tracks:
1. **KOS** — Phases 1–4 complete, Phase 5 partially built. Content engine, lead pipeline, outreach engine all operational. Phase 6 (dashboard polish, analytics, billing) is next.
2. **Northern Standard (Justin Fodor)** — Meta ads, analytics, AEO, and revenue-generating work. Analytics + Meta Pixel set up April 12. First ad campaign next.

---

## KOS — Current State (April 12, 2026)

### What's Built & Working

**Content Engine (Phases 1–3):**
- 7-step New Post Wizard: Client → Date → Content Type → Angle → Format → Creative → Caption
- Multi-platform captions (Instagram, Facebook, TikTok, LinkedIn, Nextdoor) with per-platform tone
- AI angle suggestions with seasonal calendar context (holidays + HVAC triggers)
- AI format recommendations (carousel vs. static)
- Caption tweaks on Haiku (fast refinement)
- Weekly content plan generation (5 posts from claude_md)
- Brand doc generation, platform bios, client intake assistant
- Creative upload to Supabase storage
- Visual HTML generation (template-based, color/font extraction, photo slots)
- 8 AI workflows total, 13 prompt templates, all cost-tracked

**Lead Pipeline (Phase 4):**
- 7-stage kanban: new → reached_out → connected → interested → proposal_sent → won → lost
- Drag-and-drop kanban board (dnd-kit) + list view with sorting/filtering
- Bulk CSV lead import
- 6-agent AI research system: website auditor, social auditor, business intel, service fit, pricing recommender, orchestrator
- Bulk research triggering (select multiple, run all)
- AI scoring (0-100) + heat classification (hot/good/maybe/cut)
- Lead activity logging (calls, notes, stage changes)
- Lead-to-client conversion (pre-fills profile, preserves history)
- Disqualify/requalify actions

**Outreach Engine (Phase 4 continued):**
- Cold email sequences — initial + 3 follow-ups per lead
- AI-drafted emails personalized from research findings
- Resend integration (ready to send, needs API key configured)
- Draft/Queue/Sent/Opened/Replied/Bounced tracking
- Email opt-out list + unsubscribe handling
- Outreach settings (per-user from/reply-to, daily send limit, score threshold)
- Outreach dashboard (review drafts, hot leads, stats, email editor)
- Follow-up automation (cron route exists, not yet scheduled)

### What's NOT Done Yet

**Immediate items:**
- [ ] Media library UI (search, filter, organize) — tables/routes exist, UI incomplete
- [ ] Playwright PNG export (1080x1350 / 1080x1920)
- [ ] Configure Resend API key + verified domain for live sends
- [ ] Schedule cron for outreach follow-ups
- [ ] Wire Resend webhook for bounce/open tracking

**Phase 6 (not started):**
- [ ] Today view dashboard (stub exists, not functional)
- [ ] Analytics dashboard
- [ ] Lifecycle alerts
- [ ] Billing / Stripe
- [ ] Notifications

### Infrastructure

- **Git:** All changes committed and pushed to main
- **Vercel:** Auto-deploys from main to kos-kohl.vercel.app
- **Database:** 17 tables, 15 migrations applied to Supabase, RLS on all
- **Migrations:** After any new migration file, run SQL manually in Supabase dashboard SQL Editor

### Build commands:
```bash
npm run dev          # Dev server → http://localhost:3000
npm run build        # Production build
npm run lint         # ESLint
```

---

## Northern Standard — Current Priorities (April 12–18)

### Done (April 12):
- [x] Cloudflare Web Analytics enabled
- [x] GA4 connected via Cloudflare Zaraz (Measurement ID: G-MVX69N51JV)
- [x] Meta Pixel connected via Zaraz (Pixel ID: 2197808841033364) — awaiting verification

### This Week:
- [ ] Verify Meta Pixel is firing (check Events Manager for PageView events)
- [ ] Review + send marketing services contract to Justin ($2,500/mo)
- [ ] Launch first Meta ad campaign — Furnace Replacement ($15-20/day, two ad variations)
- [ ] AEO / JSON-LD structured data on Astro site (Claude Code Sonnet session)
- [ ] GBP optimization + review request system

### Ad Campaign Plan (Furnace Replacement):
- **Budget:** $15-20/day
- **Audience:** 50mi from St. Paul, homeowners, 35-65
- **Ad 1:** GE Warranty hook (12-year parts, 12-year labor, lifetime heat exchanger)
- **Ad 2:** Upfront Pricing hook (exact cost before work begins)
- **Landing:** Furnace install page (not homepage)
- **After 7 days:** Kill loser, scale winner, launch retargeting

### Contract
**Built.** `Northern Standard/Docs/Konvyrt_NorthernStandard_MarketingServicesAgreement.docx`
$2,500/mo retainer. Ad spend billed separately ($500 min recommended). Month-to-month, 30-day notice.
**Action:** Jay reviews, considers attorney review, sends to Justin.

---

## Website Tech Stack (Northern Standard)

- **Framework:** Astro 6 + React
- **Hosting:** Cloudflare Pages
- **Domain:** northernstandardhvac.com
- **Source:** `C:\HQ\Clients\Northern Standard\Deliverables\Website\source\`
- **Styling:** Tailwind CSS v4
- **Email:** Resend

---

## Active Clients

| Client | Status | Next action |
|--------|--------|-------------|
| Northern Standard | Active — $2,500/mo, contract ready | Send contract, launch ads |
| College Works Painting | Brand kit done | Content audit, establish posting cadence |
| allbeautybylily | Brand kit done | Scope + build website |
| Ian Mercil - Peptides | New prospect | Discovery call, collect brand info |
| Owens Detailing | Empty | Needs brand info or archive |
| Vyntyge | Empty | Needs brand info or archive |

---

## Ideas Captured (not lost)

- **KOS Ads Manager** — Phase 1: Visual campaign planner. Phase 2: Meta API data pull. Phase 3: AI analysis. Jay's principle: "Authority to manipulate anything, AI assistance at every step."
- **Flux API** — $0.03/image photorealistic. Add to upload step.
- **Ideogram API** — Text-in-image AI. $0.01-0.08/image. Promo graphics.
- **Canva + Make.com** — Batch-fill templates from post data. ~$10/mo.
- **Google LSAs** — Pay-per-lead, Google Guaranteed. After Meta ads stable.
- **Email/SMS marketing** — In NS contract scope. After ads + analytics live.
- **KOS as product** — Long-term. White-label / sell to other agencies.

---

## Jay's Preferences

- Direct and efficient. No fluff. Concrete next steps.
- One step at a time. Don't give 5 things — give step 1, wait for confirmation.
- Not technical — write exact copy-paste commands for Claude Code.
- Opus for planning, Sonnet for builds, Haiku for lookups.
- 95% confidence before executing. Ask if unsure.
- Update this handoff doc every session.
- Never assume he knows terminal/git commands.

---

## Documentation Cleanup (April 12)

13 outdated docs moved to `_archive/` folder. CLAUDE.md fully rewritten. Only active docs remain at root:
- `CLAUDE.md` — Project instructions (current)
- `AGENTS.md` — Next.js 16 rules
- `HYBRID_VISUAL_ENGINE_PLAN.md` — Visual engine architecture
- `KOS_SessionHandoff.md` — This file (update every session)
- `_archive/` — Old build plans and handoffs (historical reference)

Last updated: 2026-04-12
