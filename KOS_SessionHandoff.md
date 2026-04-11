# KOS Content Engine — Session Handoff v7

Drop this into a new Cowork session to pick up where we left off.

## What We're Building

KOS — internal tool for Konvyrt Marketing. The **New Post Wizard** is the core content creation flow: a 7-step full-screen modal that walks through client selection, date picking, content type selection, AI angle suggestion, format/platform selection, creative upload, and AI caption generation.

## What's Done (this session)

| Step | What | Status |
|------|------|--------|
| Strategic decision: remove AI visual generation | Researched AI ad creative landscape. Decided KOS should NOT generate visuals — it's the brain (strategy, captions, scheduling), not the designer. Creatives come from Canva or external tools. | Done |
| StepUpload replaces StepVisual | Stripped out all HTML/CSS visual generation, iframe rendering, and inline editing. Replaced with a clean drag-and-drop upload component (143 lines). Upload → preview → replace flow. | Pushed |
| Wizard reorder: Content Type before Angle | Content type (education, differentiator, seasonal, etc.) moved to step 3, before Angle (step 4). This lets the AI shape angle suggestions based on content type. | Pushed |
| New StepContentType component | 8 content type cards with auto-advance on selection. 57 lines. | Pushed |
| Content type removed from StepFormat | StepFormat now only handles format, placement, and platform. No more content type picker in it. | Pushed |
| Angle AI uses content type | `suggest-angle` API route and prompt builder now accept contentType and inject type-specific guidance (e.g., "education" → suggest angles that teach). | Pushed |
| Full wizard context passed to caption AI | Caption generation now receives angle, contentType, format, platform, and optional specificContext. Captions correlate with the rest of the wizard decisions. | Pushed |
| "Anything specific to mention?" field | Optional text input added to StepCaption. User can add hyper-specific instructions (e.g., "mention the spring discount"). Passed to caption API as specificContext. | Pushed |
| Save error fix attempted | `updatePostStatusAction` updated to use adminClient for the write to bypass RLS WITH CHECK restriction. **Fix did not fully resolve the issue — error persists.** | Needs Fix |
| Build passes clean | `npm run lint` and `npm run build` both pass after all changes. | Confirmed |

## Known Bugs

1. **Save error at wizard completion (BLOCKING)** — Clicking "Finish" on step 7 still throws:
   ```
   Failed to update status. Please try again.
   at updatePostStatusAction (lib/actions/posts.ts:216:11)
   ```
   The first fix attempt (switching to adminClient for the write) didn't resolve it. The root cause needs deeper investigation — trace the full data flow: what status is the post currently in, what does the RLS policy expect, is the post record complete enough (all required fields), does the status transition from current → 'ready' make sense given the DB constraints. Read `lib/actions/posts.ts` around line 200-220, check the Supabase `posts` table RLS policies, and check if there's a `CHECK` constraint on the status column.

2. **Orange color perception issue** (cosmetic, non-blocking) — `#E8732A` appears slightly different in CSS vs logo PNG due to embedded Figma color profile. Fix: re-export logos from Figma with "Export as sRGB."

## What's NOT Done (in priority order)

1. **Fix the save error** — This is the #1 blocker. The wizard works end-to-end but can't save the finished post. Needs a Sonnet session focused on debugging `updatePostStatusAction` and the underlying Supabase query/RLS. Do NOT suppress the error — find and fix the root cause.

2. **Multi-platform caption generation** — Jay wants to select multiple platforms (e.g., Facebook + Instagram) and get platform-specific captions for each. The Post type already has `cross_post_platforms: Platform[]`. Plan:
   - Multi-select platforms in StepFormat
   - Store selected platforms in `cross_post_platforms`
   - StepCaption generates one caption per platform, tuned to each platform's audience (Facebook = older, Instagram = younger)
   - Tab or section view to review/tweak each platform's caption independently

3. **Visual prompt quality tuning** — No longer blocking (since we removed visual generation from wizard), but the reference HTML files in `reference-carousels/`, `reference-statics/`, `reference-stories/` still exist. Could be useful if AI image generation is added later via Flux/Ideogram API.

4. **Nano Banana AI photo generation** — Deferred. Was going to use Nano Banana API for auto-filling photo slots. No longer relevant with the upload-based approach. Revisit if we add an "AI Assist" option to generate starting images.

5. **Date-aware angle suggestions** — Feed upcoming holidays, seasonal events, industry dates into the angle suggestion AI. Static calendar of US holidays + home services seasonal triggers.

6. **Playwright PNG export** — Server-side capture of slides as downloadable PNGs. Lower priority now.

## Key Context for Next Session

* **KOS repo:** `C:\Users\jaytr\HQ\Projects\kos`
* **Build plan:** `KOS_NewPostWizard_BuildPlan.md` in repo root
* **Wizard flow (7 steps):** Client → Date → Content Type → Angle → Format → Creative (upload) → Caption
* **Wizard files:**
  - `components/content/NewPostWizard.tsx` — main wizard shell, state, navigation
  - `components/content/wizard/StepClient.tsx` — client picker cards
  - `components/content/wizard/StepCalendar.tsx` — month calendar, date selection
  - `components/content/wizard/StepContentType.tsx` — NEW: content type cards (8 types)
  - `components/content/wizard/StepAngle.tsx` — text input + AI suggest (now uses contentType)
  - `components/content/wizard/StepFormat.tsx` — format, placement, platform (content type removed)
  - `components/content/wizard/StepUpload.tsx` — NEW: drag-and-drop creative upload + preview
  - `components/content/wizard/StepCaption.tsx` — AI caption generation + tweak + specific context field
* **Save error location:** `lib/actions/posts.ts` line ~216, `updatePostStatusAction`
* **The old StepVisual.tsx is dead code** — can be deleted if it still exists
* **MODEL.fast** exists in `lib/ai/claude.ts` — Haiku used for angle suggestion, format recommendation, and caption tweaking
* **Git:** All changes committed and pushed to main
* **Vercel:** Auto-deploys from main to kos-kohl.vercel.app
* **Migrations:** After any new migration file, run SQL manually in Supabase dashboard SQL Editor
* **Strategic decision this session:** KOS does NOT generate creatives. It's the brain — strategy, angles, captions, scheduling. Creatives come from Canva or external AI tools (Flux, Ideogram if added later). Upload-based workflow.

## Ideas Captured

* **Multi-platform captions** — Different captions per platform from one post. Facebook (older audience) vs Instagram (younger). Architecture supports it via `cross_post_platforms` field.
* **Flux API integration** — $0.03/image, most photorealistic AI image generator with official API. Could add as optional "AI Assist" button in upload step later.
* **Ideogram API** — Best at rendering readable text in images. Good for promo graphics, seasonal offers. $0.01-0.08/image.
* **Canva + Make.com automation** — Batch-fill Canva templates from post data. No-code, ~$10/month. Alternative to building image generation into KOS.
* **AdCreative.ai** — Full ad creative generation platform. $39-249/month. Could be used alongside KOS for static ad generation.

## Recommended Next Steps

1. **Fix the save error** (Sonnet, 15-30 min) — Debug `updatePostStatusAction`. Trace the Supabase query, check RLS policies, check status constraints. This unblocks the entire wizard.
2. **Multi-platform captions** (Sonnet, 45-60 min) — Multi-select platforms, per-platform caption generation with audience tuning.
3. **Clean up dead code** (Haiku, 5 min) — Delete old `StepVisual.tsx` and any unused visual generation imports if they still exist.

## Jay's Preferences Reminder

* Direct and efficient. No fluff.
* Concrete next steps, not theory.
* Walk him through step by step — one prompt at a time.
* He pastes prompts into Claude Code terminal.
* Cowork's job: write the prompts, track progress, pressure-test plans.
* Don't change things he didn't ask to change. No regressions.
* Model note: Opus for planning/architecture, Sonnet for standard builds, Haiku for simple lookups.
* Help Jay use the right model for each task — don't burn credits on overkill.
* Keep responses structured: what to do now, what's next, why.
* Save every idea he mentions — don't let anything get lost.
* Never assume he knows terminal/git commands — write exact copy-paste instructions.
* One step at a time. Don't give him a list of 5 things. Give step 1, wait for confirmation, then step 2.
* Before executing anything, be 95% confident you understand the ask. If not, ask.
* When fixing something, actually fix it — never hide the problem.

Last updated: 2026-04-11. Wizard rebuilt to 7 steps. AI visual generation removed. Upload-based creative flow. Content type shapes angle suggestions. Full context flows into caption generation. Save error still open.
