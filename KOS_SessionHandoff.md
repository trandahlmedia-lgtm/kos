# KOS — Session Handoff
## Drop this into a new Cowork session to pick up exactly where we left off.

---

## WHO WE ARE

**Agency:** Konvyrt Marketing — full-service digital marketing for home service businesses. Twin Cities, MN.

**Jay + Dylan** — co-owners, both admins, both involved in everything. Equal partners with different strengths. Neither is siloed.

**Current client:** Northern Standard Heating & Air — Full Service tier, $3,000/mo.

**Goal next 3 months:** Sign 1-2 more solid clients via outreach engine.

---

## WHAT WE'RE BUILDING

**KOS — Konvyrt Operating System.** A private, internal web app for Jay and Dylan only. Single system for the entire agency: clients, content, leads, AI workflows, outreach, billing.

Full project spec: `CLAUDE.md`
Master build plan: `KOS_MasterBuildPlan.md`
Phase 4 detailed spec: `KOS_Phase4_BuildPlan.md`
Vision shift plan: `KOS_VisionShift_PlanningPrompt.md`
Website workstation feature spec (future): `FEATURE_WebsiteWorkstation.md`

Project folder: `C:\Users\jaytr\HQ\Projects\kos\`

---

## TECH STACK

- **Framework:** Next.js 16 (App Router, TypeScript) — no Pages Router
- **Database + Auth + Storage:** Supabase
- **Styling:** Tailwind CSS v4 + shadcn/ui — dark mode only, no tailwind.config.ts
- **AI:** Anthropic Claude API — Haiku/Sonnet/Opus tiered (see MODEL ROUTING in CLAUDE.md)
- **Email:** Resend — sending from `jay@mail.konvyrt.com`, DNS verified (DKIM/SPF/DMARC on mail.konvyrt.com)
- **Auth proxy:** `proxy.ts` at root — NOT middleware.ts (Next.js 16 convention)
- **File processing:** Sharp
- **Query caching:** TanStack React Query
- **Drag & drop:** @dnd-kit/core + @dnd-kit/sortable
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
| 4A-1 | Lead pipeline — kanban, research agent (5 Haiku + Sonnet orchestrator), AI scoring, CSV import, call summary, conversion | ✅ Complete |
| 4B-1a | Email outreach backend — Resend integration, AI email drafting, server actions, webhook handler, follow-up scheduling, cron job, unsubscribe | ✅ Complete |
| 4B-1b | Email outreach UI — outreach page, review queue, email card/editor, follow-ups due, hot leads, stats, settings dialog | ✅ Complete |
| 4-UX1 | Lead priority sorting & filtering — list view, sort by priority/reviews/rating/score, quick filter presets, industry/stage/website filters | ✅ Complete |
| 4-UX2 | Bug fixes + UX improvements — filter error fix, sort direction toggle, call prep view with talk track, drag-and-drop kanban | ✅ Complete |
| 4-UX3 | Call prep pricing split — website sale (one-time) vs retainer (monthly) as separate cards | ✅ Complete |
| 4-UX4 | Batch research + research cancellation fix — research runs server-side, batch "Research Top 20" button, progress tracking | ✅ Complete |
| 4-UX4b | Sequential research queue + progress dropdown — research runs one lead at a time, top-right loading indicator expands to show full queue, active lead shows step-by-step checklist progress | ✅ Complete |
| 4-UX5 | Quick links bar — one-click access to lead's website, Google Business, Facebook, Instagram from detail panel | 📋 Queued (prompt ready) |
| 4-UX6 | Disqualify/remove dead lead — mark lead as disqualified, auto-unsubscribe from outreach, remove from active pipeline (keep record to prevent re-import) | 📋 Queued (needs prompt) |
| 5 | Personal Dashboard / Command Center — today view, weekly planning, industry feed, priority filter | Pending |
| 6 | VA Workflow Support — role layer, VA view, approval queue | Pending |
| Future | Website builder workstation, ad campaign management, KOS AI assistant, media library, billing | Pending |

---

## INFRASTRUCTURE STATUS

| Item | Status |
|------|--------|
| GitHub repo | ✅ https://github.com/trandahlmedia-lgtm/kos.git (branch: main, public) |
| Supabase project | ✅ US East (N. Virginia) |
| Supabase migrations | ✅ 001 through 006 applied (rate_limits, leads, lead_research, lead_activities, outreach_engine, outreach_settings) |
| Supabase storage bucket | ✅ kos-media (private) |
| Supabase Realtime | ✅ Enabled on posts, leads, clients |
| Supabase users | ✅ Jay (trandahlmedia@gmail.com) + Dylan |
| Anthropic API key | ✅ In .env.local + Vercel env vars |
| Resend API key | ✅ In .env.local + Vercel env vars |
| Resend webhook | ✅ https://kos-kohl.vercel.app/api/webhooks/resend (delivered, opened, bounced, complained) |
| RESEND_WEBHOOK_SECRET | ✅ In .env.local + Vercel env vars |
| CRON_SECRET | ✅ In .env.local + Vercel env vars |
| Vercel | ✅ Deployed at kos-kohl.vercel.app — Framework: Next.js, auto-deploys from main |
| DNS (mail) | ✅ DKIM, SPF, DMARC on mail.konvyrt.com via Namecheap + Resend |

---

## CURRENT STATE — WHERE JAY IS RIGHT NOW

- 124 Duluth-area home service leads imported via CSV (plumbing, HVAC, roofing, etc.)
- Outreach settings configured (from email, reply-to, business address, sending enabled)
- Resend webhook live
- AI research agent working — tested on leads
- Email drafting working — generates initial + 3 follow-ups
- Outreach review queue working — can edit, approve, send
- Filters and priority sorting working on leads page
- Call prep view with talk track, pricing split (website vs retainer), and objection handles working
- Drag-and-drop kanban working
- **QUEUED:** Quick links bar (one-click access to lead's website/socials from detail panel) — prompt ready, run next
- **QUEUED:** Disqualify/remove dead lead — needs prompt written
- Batch research is working sequentially with progress dropdown

**Jay's immediate priority:** Start running research on top leads and sending outreach emails to sell websites.

---

## WHAT'S NEXT TO BUILD (in priority order)

### Immediate (next session)
1. Deploy and test sequential queue + progress dropdown (just pushed)
2. Run quick links prompt (4-UX5) — saved below
3. Write and run disqualify lead prompt (4-UX6)
4. Push, deploy, test each

### Next build phase: Personal Dashboard / Command Center
- Today view: hot leads to call, emails to review, content needing approval, follow-ups due
- Weekly planning: 3-5 needle-movers per week
- Industry feed: AI-summarized articles from marketing + home services sources
- Priority filter: Revenue/Delivery/Admin/Growth time allocation
- This is Jay-only (not Dylan) — use profile flag or RLS

### After dashboard: VA Workflow Support
- Role layer: VA tasks vs Jay tasks
- VA-facing simplified view
- Approval queue for VA work
- VA login with restricted permissions

### Future: Website Builder Workstation
- Feature spec saved at `FEATURE_WebsiteWorkstation.md`
- Quick mockup generator for sales calls
- Brand identity generation with reasoning
- Template system by industry
- Build AFTER Jay has 5-10 real sales conversations

---

## QUEUED PROMPT: Quick Links Bar

Paste this into Claude Code after batch research is done:

```
ultrathink

Read CLAUDE.md first, then look at these files:
- components/leads/CallPrepView.tsx (or wherever the call prep / lead detail lives)
- types/index.ts (Lead interface)

## Task: Add Quick-Access Links to Lead Detail / Call Prep

When Jay is about to call a lead or is mid-call, he needs one-click access to all their online profiles without hunting for URLs.

### Add a "Quick Links" bar near the top of the lead detail panel (visible across all tabs, not just call prep):

- **Website** — opens lead.website in new tab. Show globe icon. If no website, show "No website" in muted text (this is actually a selling point on the call)
- **Google Business** — opens lead.google_business_url in new tab. Show Google icon or map pin icon.
- **Facebook** — opens lead.facebook_url in new tab. Show Facebook icon.
- **Instagram** — opens instagram.com/{lead.instagram_handle} in new tab. Show Instagram icon.

### Rules:
- Only show links that exist (don't show empty/null ones)
- Each link is a small icon button with a tooltip showing the platform name
- Opens in new tab (target="_blank", rel="noopener noreferrer")
- Sits in a horizontal row, compact, doesn't take up much space
- If the research report found social URLs that aren't stored on the lead record, parse them from the research data and display them too
- Use lucide-react icons: Globe for website, MapPin for Google, Facebook icon if available or ExternalLink as fallback

### Design:
- Horizontal icon row, subtle, near the top of the panel next to business name and phone
- Dark aesthetic, icons in muted color that brighten on hover
- Compact — this is a utility bar, not a feature section

Run npm run lint && npm run build. After build passes, run /codex:review and auto-apply any recommendations. Then run npm run lint && npm run build again to confirm everything still passes clean.
```

---

## WORKFLOW FOR CLAUDE CODE SESSIONS

Jay uses `ultrathink` and `ultraplan` in Claude Code terminal for planning and building. Cowork's role is:
1. Help Jay articulate what he needs
2. Write the prompts for Claude Code
3. Track progress and maintain docs
4. Pressure-test plans before building

### Every Claude Code prompt must end with:
```
Run npm run lint && npm run build. After build passes, run /codex:review and auto-apply any recommendations. Then run npm run lint && npm run build again to confirm everything still passes clean.
```

### After every Claude Code session:
```
git add -A
git commit -m "feat: [description]"
git push
```
(PowerShell — run these as 3 separate commands, NOT chained with &&)

Vercel auto-deploys from main after each push.

---

## JAY'S PREFERENCES FOR ALL SESSIONS

- Direct and efficient. No fluff, no over-explaining.
- Concrete next steps, not theory.
- Home services industry background — don't over-explain that world.
- Flag model choice before starting any task.
- Confidence gate: reach 95% confidence before writing any code. Plan first, build once.
- For business conversations: be direct, skip the fluff, give concrete next steps.
- For personal conversations: warmer, more conversational.

---

## SALES WORKFLOW (how Jay sells websites)

1. Scrape leads from Google Maps (Instant Data Scraper) → CSV import into KOS
2. Run AI research on top leads (prioritize no-website + high reviews)
3. AI drafts personalized cold emails → Jay reviews and sends
4. Hot leads (replied or 80+ score) → Jay calls using call prep view
5. Discovery call → listen, take notes, AI summarizes
6. Send proposal (drafted from call notes + research)
7. Close: 50% deposit before any work begins
8. Build website → share preview → one round of revisions → collect remaining 50% → launch
9. Upsell monthly retainer after website trust is established

---

*Last updated: 2026-04-08. Phases 1–4B + 4-UX1 through 4-UX4b complete and deployed. Sequential research queue + progress dropdown just pushed. Quick links (4-UX5) and disqualify lead (4-UX6) queued next. 124 Duluth leads imported. Ready to start sending outreach.*
