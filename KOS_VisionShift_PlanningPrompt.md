# KOS Vision Shift — Planning Session Prompt
## Paste this into Claude Code (Opus) with KOS folder open in VS Code

---

```
Read these files in order before doing anything else:

KOS PROJECT FILES (in current directory):
1. CLAUDE.md
2. KOS_MasterBuildPlan.md
3. KOS_Phase4_BuildPlan.md
4. KOS_SessionHandoff.md

HQ REFERENCE FILES (read these for context — do NOT modify them):
5. C:\HQ\Business\Konvyrt_Pricing.md — Full pricing tiers for websites ($1,000-$2,500) and social media management ($750-$3,500/mo). The outreach engine AI MUST know these to draft accurate emails and score leads.
6. C:\HQ\Business\Leads\SONNET-LEAD-ANALYSIS-PROMPT.md — Jay's existing lead qualification rubric. This is exactly how he thinks about scoring leads (HOT/GOOD/MAYBE/CUT). The AI scoring system should mirror this logic.
7. C:\HQ\Business\Leads\LEADS - Scraped Leads.csv — Example of previously scraped leads (pest control/lawn care, Twin Cities + Duluth). Shows the data format and fields Jay has worked with before.
8. C:\HQ\Business\Leads\outreach-tracker.xlsx - Sheet1.csv — Jay's manual outreach tracker. Shows how he's been tracking leads by hand — the outreach dashboard replaces this.
9. C:\HQ\TASKS.md — Jay's current task management system (manual markdown). The personal dashboard replaces this entirely.
10. C:\HQ\Workflows\ — Existing SOPs for content calendars, caption writing, graphic briefs, web design. These inform what the VA workflow layer needs to support.
11. C:\HQ\Jay's Brain\CLAUDE.md — Jay's personal wiki/knowledge base schema. The industry feed feature should be aware this exists — articles and insights could flow into both the dashboard feed AND Jay's Brain wiki.

Do not write any code. Do not modify any files. Enter Plan Mode only.

---

## Context

KOS is a Next.js 16 app for Konvyrt Marketing (2-person digital marketing agency — Jay + Dylan, Twin Cities MN). Phases 1-3 are complete and clean: auth, client hub, content engine, AI workflows. Phase 4 (lead pipeline) was next, but the vision has shifted and we need to re-architect the build plan before touching any code.

Current tech stack: Next.js 16 (App Router, TS), Supabase (auth + DB + storage), Tailwind CSS v4 + shadcn/ui (dark mode only), Anthropic Claude API (Haiku/Sonnet/Opus tiered), TanStack React Query, deployed to Vercel (not live yet). Full stack details are in CLAUDE.md.

---

## The Vision Shift

KOS was built as an agency ops tool. It needs to become Jay's personal command center — the first thing he opens every morning. The agency CRM stays, but a new layer gets added on top: one that tells Jay what actually moves the business forward today vs. what's busy work.

There are three major additions, in priority order:

---

### PRIORITY 1: Outreach Engine (This Makes Money)

Jay sells websites to home service companies. Money is tight and websites are the fastest thing to sell ($2-5K each). The outreach engine automates the hardest part — finding and qualifying leads — so Jay just focuses on closing.

What the outreach engine does:

1. LEAD DISCOVERY — Finds local home service businesses that are good targets:
   - Scrapes Google Maps / Google Business for home service companies in target metro areas (start with Twin Cities)
   - Identifies businesses with bad websites, no websites, or weak online presence
   - Pulls: business name, phone, email (if listed), website URL, Google review count + rating, industry/trade, address
   - Stores discovered leads in the database with source = 'scraped'

2. AUTOMATED RESEARCH — For each discovered lead, runs the research agent (already specced in KOS_Phase4_BuildPlan.md):
   - Website audit (quality, mobile, SEO basics, CTA presence)
   - Social media audit (Instagram, Facebook, Google Business)
   - Business intelligence (size, years active, review volume)
   - Service fit analysis (what Konvyrt could offer them)
   - Pricing recommendation (which tier, estimated MRR)
   - Overall score (1-100)

3. AUTOMATED EMAIL OUTREACH — For qualified leads (score above threshold):
   - AI drafts personalized cold emails referencing the lead's specific situation (e.g. "I noticed your website doesn't have a way for customers to request a quote..." or "Your Google reviews are strong but your website isn't doing them justice...")
   - Emails are NOT sent automatically — they queue up for Jay to review, edit, and send
   - Follow-up email drafts generated on a cadence (3-day, 7-day, 14-day) if no response
   - Track: sent, opened (if possible), replied, bounced
   - CAN-SPAM compliant: real business address, opt-out link, no deceptive subjects

4. HIGH-INTENT FLAGGING — When a lead shows buying signals:
   - Replied to email → flag as high intent, suggest Jay call
   - High AI score (80+) + active Google reviews + no website → flag as hot
   - Surface these at the top of the outreach dashboard with a "Call This Person" CTA
   - Show the AI research summary and a suggested talk track

5. OUTREACH DASHBOARD — The daily view Jay uses to sell:
   - Pipeline overview: how many leads discovered, researched, emailed, replied, converted
   - "Hot Leads" section at top: high-intent leads Jay should call today
   - "Review Queue": drafted emails waiting for Jay to approve/edit/send
   - "Follow-ups Due": leads that need a follow-up email today
   - Filters: by trade/industry, by score range, by metro area, by status
   - Each lead card shows: business name, trade, score, website thumbnail (if exists), outreach status, last action date

IMPORTANT CONSTRAINTS:
- No automated texting. TCPA risk is real ($500-$1,500 per violation). Email only for automated outreach.
- Emails must be reviewable by Jay before sending. No fully automated sends.
- Scraping must be respectful: rate-limited, no aggressive crawling, respect robots.txt.
- The research agent architecture from KOS_Phase4_BuildPlan.md (5 Haiku sub-agents + Sonnet orchestrator) should be reused and extended, not rebuilt from scratch.
- The existing Phase 4 lead pipeline spec (kanban, lead detail panel, scoring, conversion flow) is still valid — the outreach engine FEEDS INTO it. Discovered leads enter the kanban at 'new' stage. The outreach engine is the top of the funnel.
- Jay already has scraped lead data and a detailed qualification rubric (see HQ reference files above). The AI scoring should align with how he already thinks about leads — read SONNET-LEAD-ANALYSIS-PROMPT.md closely.
- Konvyrt's actual pricing is in Konvyrt_Pricing.md. The email drafting AI needs to know what Jay actually charges so outreach feels real, not generic.
- The target market for outreach is home service businesses (HVAC, plumbing, electrical, pest control, lawn care, landscaping, painting, etc.) in the Twin Cities and Duluth, Minnesota metro areas. Jay may expand to other metros later.

---

### PRIORITY 2: Personal Dashboard / Command Center

This replaces the basic dashboard shell from Phase 1. It becomes the home screen of KOS — Jay's morning view.

Sections:

1. TODAY VIEW — What needs Jay's attention right now:
   - Hot leads to call (from outreach engine)
   - Emails to review and send (outreach queue)
   - Content that needs approval or scheduling (from content engine)
   - Client health alerts (no posts scheduled, onboarding stalled, etc.)
   - Follow-ups due today

2. WEEKLY PLANNING — A simple planning interface:
   - What are the 3-5 things that will actually move the business forward this week?
   - Not a task list — a priority list. Needle-movers only.
   - Jay sets these manually at the start of each week
   - KOS can suggest priorities based on: pipeline status, client health, revenue goals
   - End-of-week reflection: did you hit them? What blocked you?

3. INDUSTRY FEED — Stay sharp without doom-scrolling:
   - Curated feed from RSS/API sources: digital marketing news, AI tools and updates, home services industry trends
   - AI summarizes articles into 2-3 sentence briefs
   - "Read more" links to source
   - Refreshes daily
   - Suggested sources: Search Engine Journal, Social Media Examiner, MarketingBrew, The Verge (AI section), HVAC/plumbing/electrical trade publications, Anthropic blog, OpenAI blog

4. PRIORITY FILTER — Help Jay distinguish what matters:
   - Every task/action in KOS gets a tag: Revenue (signing clients, closing deals), Delivery (client work, content, scheduling), Admin (invoicing, organizing, emails), Growth (learning, networking, new capabilities)
   - Dashboard shows time allocation: how much of Jay's week went to each category
   - Goal: shift time toward Revenue and Growth, reduce Delivery (that's what the VA is for)

This view is Jay-only. Dylan doesn't see it. Use a profile flag or RLS to separate personal views from shared agency views.

---

### PRIORITY 3: VA Workflow Support

Jay is planning to hire a virtual assistant for creative production. The content engine (Phase 2) was built assuming Jay does everything. It needs a role layer:

- Tasks flagged as "VA" (creative production, formatting, basic edits) vs. "Jay" (strategy, approvals, scheduling, client calls)
- A VA-facing view: simplified interface showing only their assigned tasks, creative briefs, and deadlines
- Jay's view: approval queue where VA work surfaces for review
- VA gets their own login (separate Supabase user, restricted permissions via RLS)
- Status flow update: add 'va_in_progress' and 'va_complete' states to the post lifecycle before Jay's review

This is lower priority than the outreach engine and dashboard. Plan it but build it after Priorities 1 and 2.

---

### FUTURE: Website Builder Workstation

Jay already has a WebDev workstation at C:\HQ\WebDev\ with a build workflow, agent team (web-pm, web-designer, web-frontend, web-copy, web-seo, web-qa), templates, and an export protocol. The idea is to bring a version of this INTO KOS as a built-in workstation:

- Template gallery: different website styles/aesthetics Jay can browse
- One-click project scaffold from a template
- Build tracking: which phase is the build in, who's working on what
- Client delivery integration: finished site links to the client hub

Do NOT plan this in detail yet. Just note it as a future phase and consider how the architecture should accommodate it.

---

## What I Need From You

1. Read all the referenced files and understand what exists in the codebase
2. Propose a revised phase plan (Phase 4 and beyond) that incorporates these three priorities in the right order
3. For each new phase: describe the scope, list every file that will be created or modified, estimate session count, and identify dependencies
4. Specifically address:
   - How lead discovery/scraping will work technically (what APIs or scraping approach, rate limits, data storage)
   - How the email outreach system will work (sending infrastructure — Resend? SendGrid? Postmark? domain setup, tracking)
   - How the industry feed will work (RSS parsing, AI summarization, storage, refresh cadence)
   - How the VA role layer integrates with existing content engine components
   - What database migrations are needed beyond what Phase 4 already specced
5. Flag any architectural decisions or tradeoffs I need to make before building
6. Flag anything that needs a third-party service or API key I don't already have
7. State the full plan back to me in plain English
8. Do not write a single line of code until I explicitly approve the plan

---

## Rules (from CLAUDE.md — these still apply)

- 95% confidence before executing anything. Plan first, build once.
- Model routing: Haiku for sub-agents and structured output, Sonnet for orchestration, Opus for architecture
- All mutations via Server Actions with auth re-verification
- RLS on all tables
- Rate limiting on all AI routes
- Zod validation on all inputs
- Dark mode only, Linear.app aesthetic
- Desktop only, no mobile
- npm run lint && npm run build must pass before any phase is complete

---

## Jay's Working Style

- Direct and efficient. No fluff, no over-explaining.
- Home services industry background — don't over-explain that world.
- Ask clarifying questions if below 95% confidence. Don't guess and build.
- Concrete deliverables, not theory.
```
