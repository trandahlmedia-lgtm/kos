# Content Engine Build — Session Handoff v4

Drop this into a new Cowork session to pick up where we left off.

---

## What We're Building

A visual content generation engine inside KOS that produces Instagram-ready carousel, static feed post, story sequence, and static story visuals for any client. The engine pulls brand assets (logos, colors, fonts) from the client's Brand Kit in KOS and generates on-brand content automatically.

---

## What's Done (pushed to git, live on Vercel)

### Visual Engine Foundation (from previous sessions)
| Step | What | Status |
|------|------|--------|
| Layout rebuild | Rewrote all 14 carousel layout templates from reference HTML files | Pushed |
| Two-color extraction | Engine extracts primary + accent colors from brand doc | Pushed |
| Brand asset storage | Multi-variant logo system (icon, wordmark dark/light, full) stored as JSONB on clients table | Pushed |
| Brand Kit tab | 4-slot logo upload UI + Instagram handle in client hub | Pushed |
| Logo in visuals | Engine pulls logos into IG header (icon) and slide content (hero/CTA get full logo) | Pushed |
| CSP fix | Added Supabase host to img-src so signed URLs render | Pushed |
| Logo glow | drop-shadow filter on logos for visibility on dark backgrounds | Pushed |
| Prompt rewrite | Full design system knowledge in visualPlan.ts | Pushed |
| DB migrations | 011 (brand asset columns) + 012 (brand_logos JSONB) + 013 (format constraint expanded) | Done |
| SchedulePanel preview | Generated visual shows in sidebar with "View Full Preview" + "Regenerate" buttons | Pushed |
| Modal z-index fix | VisualPreviewModal portaled to document.body | Pushed |
| Static feed post layouts | Two layout types + CTA footer bar + dedicated prompt + renderer | Pushed |
| Story sequence layouts | 10 layout types + story chrome + 420x747 renderer + dedicated prompt | Pushed |
| Visual format selector | Dropdown in New Post modal + format column on posts table | Pushed |

### Direct HTML Generation Mode (THIS SESSION — 2026-04-10)
| Step | What | Status |
|------|------|--------|
| Architecture plan | Hybrid approach: Claude generates slide HTML directly, renderer wraps in IG chrome | Designed + saved to HYBRID_VISUAL_ENGINE_PLAN.md |
| DB migration 014 | Added `slide_html` (jsonb) and `generation_mode` (text) columns to post_visuals | Pushed + migrated |
| Types update | Added `DirectSlide` interface, updated `PostVisual` type | Pushed |
| Direct-mode prompts | Three system prompts (carousel, static, story) with full design system embedded as HTML examples, component patterns, color system, typography scale | Pushed |
| Direct-mode input | `DirectVisualPlanInput` interface + `buildVisualPlanDirectUser()` with palette/fonts/logos | Pushed |
| Direct-mode renderers | `renderCarouselDirect()`, `renderStaticDirect()`, `renderStorySequenceDirect()` — wrap Claude's inner_html in IG chrome, add progress bars, swipe arrows, logos | Pushed |
| Direct-mode pipeline | `generateVisualDirectForPost()` in generateVisuals.ts — full orchestration with logo URLs in prompt, HTML parsing, backward-compat brief | Pushed |
| API route update | `mode` parameter on visual generation endpoint, defaults to 'direct' | Pushed |
| Delete visual | Server action + delete button in VisualPreviewModal + SchedulePanel with confirmation dialog | Pushed |

**Direct mode is live and generating.** Visuals are significantly better quality than the template approach. Northern Standard carousels generating with proper brand colors, typography, feature cards, CTA bars, photo placeholders.

---

## Known Bugs (fix in next session)

### 1. "Loading preview" stuck in SchedulePanel
When clicking into any post in the sidebar, the preview shows "Loading preview" indefinitely. This started after the direct mode changes. Likely the SchedulePanel isn't finding `generated_html` correctly for direct-mode visuals, or there's a data fetching issue with the new columns.

**To debug:** Read SchedulePanel.tsx and check how it fetches/reads `generated_html` from the post_visual record. The new `generation_mode` and `slide_html` columns shouldn't break the existing query, but something is off.

### 2. "Slot" status option in post status dropdown
The status dropdown in SchedulePanel shows "Slot" as an option. Selecting it makes the post disappear (probably filtered out of all views). Remove "Slot" from the dropdown options — it's not a valid user-selectable status.

**To fix:** Find the status dropdown in SchedulePanel.tsx, remove "Slot" from the options array.

### 3. Format display on post cards
Post cards show raw format values like `story_sequence` instead of human-readable labels. Should display "Story Sequence" or just "Story · Sequence".

### 4. Orange color perception issue (cosmetic, non-blocking)
The accent color `#E8732A` appears slightly different in CSS vs the logo PNG due to an embedded color profile from Figma. Fix: re-export logos from Figma with "Export as sRGB" and no embedded profile. Not blocking — cosmetic only.

---

## What's NOT Done (in priority order)

### 1. INLINE TEXT EDITING (next prompt to write)
Click on text elements in the visual preview to edit them inline. Core of the "generate → tweak → export" workflow.
- Inject editing script into iframe HTML (contentEditable on data-field elements)
- postMessage communication between iframe and parent React component
- Save edited slide_html + generated_html to DB
- Edit mode toggle button in preview modal
**Status:** Prompt designed but not yet run. Run on Sonnet.

### 2. PHOTO UPLOAD INTO SLOTS
Click a photo placeholder in the visual, upload an image, it drops in.
- Click data-photo-slot element → postMessage to parent → file picker opens
- Parent sends image URL back to iframe → replaces placeholder
- Save updated HTML to DB
**Status:** Needs prompt. Run on Sonnet.

### 3. NEW POST WIZARD (major UX overhaul — save for dedicated session)
Jay's vision for a step-by-step interactive post creation flow:

**Flow:**
1. If in "All Clients" view → first select a client. If already in a client view → skip this step.
2. Calendar view opens showing the selected client's scheduled posts only (not all clients). User can see what's already going out so content doesn't overlap.
3. Select the day for the new post.
4. Enter text for content direction / angle, OR have AI generate an angle suggestion based on other scheduled content and the brand doc.
5. AI recommends format (feed vs story, carousel vs static) based on the angle — user confirms or overrides.
6. Generate the creative visual.
7. Once creative is done, generate the caption.

**Key decisions made:**
- Calendar shows selected client only (main dashboard already shows all clients)
- AI recommends format, user confirms (not fully automatic, not fully manual)
- Step-by-step wizard UX inside a modal/popup — interactive, not a form dump

**Status:** Concept defined. Needs full design + build plan. This is a dedicated session — don't start mid-session.

### 4. STATIC STORY LAYOUT SYSTEM
Single-image 1080x1920 story visuals. Spec at `reference-stories/STATIC_STORY_DESIGN_SYSTEM.md`.
- Now should be built using direct mode (Claude generates HTML) instead of the old template approach
- Needs: new system prompt section for static stories, route in generateVisuals direct path, renderStaticStoryDirect() function
**Status:** Original prompt in v3 handoff is OUTDATED — needs rewrite for direct mode architecture.

### 5. POST FORMAT SWITCHING FROM SCHEDULE PANEL
After a post is created, allow changing its format (feed/story, carousel/static) from the SchedulePanel sidebar. When format changes, regenerate the visual.

### 6. GENERATION PROGRESS DROPDOWN + TOAST NOTIFICATIONS
When generating visuals or captions, show a progress dropdown (similar to outreach research loading state). Caption generation currently feels stuck with no feedback.

### 7. ANGLE SUGGESTION SYSTEM
When creating a post or generating a week's content, allow inputting or generating suggested angles/topics. Future consideration: research agents running weekly to produce timely, relevant marketing content.

### 8. SLIDE TWEAK/EDIT FEATURE
Edit individual carousel slides (change copy, swap layout) without regenerating the entire carousel. With direct mode, this means re-prompting Claude for just one slide's inner_html.

### 9. CROP/REFRAME TOOL
After uploading a photo into a slot, crop and reframe it to fit the design. Separate UI component — image editor overlay.

### 10. PLAYWRIGHT PNG EXPORT
Server-side export that captures each slide as a 1080x1350 PNG (or 1080x1920 for stories). Downloads as zip.

---

## Key Context for the Next Session

* **KOS repo:** `C:\Users\jaytr\HQ\Projects\kos`
* **Architecture doc:** `HYBRID_VISUAL_ENGINE_PLAN.md` in repo root — full plan for direct mode
* **Reference carousels:** `reference-carousels/` (3 HTML files + CAROUSEL_DESIGN_SYSTEM.md)
* **Reference statics:** `reference-statics/STATIC_FEED_POST_DESIGN_SYSTEM.md`
* **Reference stories:** `reference-stories/STORY_SEQUENCE_DESIGN_SYSTEM.md` + `STATIC_STORY_DESIGN_SYSTEM.md`
* **Northern Standard brand doc:** In Supabase `claude_md` field
* **Northern Standard brand_logos:** All 4 variants uploaded (icon, wordmark_dark, wordmark_light, full)
* **Primary color:** #1B3A5C (Navy)
* **Accent color:** #E8732A (Amber)
* **Fonts:** Montserrat (headings) + Open Sans (body)
* **Instagram handle:** northernstandardhvac
* **Git workflow:** Commit with specific file adds (not git add -A), then push. PowerShell — run git commands separately, not chained with &&.
* **Vercel:** Auto-deploys from main to kos-kohl.vercel.app
* **Migrations:** After any new migration file, run the SQL manually in Supabase dashboard SQL Editor.
* **Direct mode is DEFAULT** — all new visual generation goes through `generateVisualDirectForPost()` unless `mode: 'template'` is explicitly passed.

---

## Files Changed This Session (2026-04-10)

| File | What changed |
|------|-------------|
| `types/index.ts` | Added `DirectSlide` interface, updated `PostVisual` with `slide_html` and `generation_mode` |
| `supabase/migrations/014_direct_visual_mode.sql` | New columns: `slide_html` (jsonb), `generation_mode` (text) |
| `lib/ai/prompts/visualPlan.ts` | Added 3 direct-mode system prompts, `DirectVisualPlanInput`, `getVisualPlanDirectSystem()`, `buildVisualPlanDirectUser()` |
| `lib/visual-engine/slideRenderer.ts` | Added `renderCarouselDirect()`, `renderStaticDirect()`, `renderStorySequenceDirect()`, helper functions for logo rendering |
| `lib/visual-engine/index.ts` | Added exports for 3 new render functions |
| `lib/ai/generateVisuals.ts` | Added `generateVisualDirectForPost()`, `DirectBriefResponse` interface |
| `app/api/ai/visuals/route.ts` | Added `mode` parameter, routes to direct or template generation |
| `lib/actions/visuals.ts` | Created: `deleteVisualAction()` |
| `components/content/VisualPreviewModal.tsx` | Added delete button with confirmation dialog |
| `components/content/SchedulePanel.tsx` | Added delete button with confirmation dialog |
| `HYBRID_VISUAL_ENGINE_PLAN.md` | Full architecture plan for direct mode |

---

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
* Be his guide. Hold his hand. Tell him exactly what to do step by step.

---

## Recommended Next Session Order

1. **Fix bugs first** (Haiku, 15 min total):
   - "Loading preview" stuck in SchedulePanel
   - Remove "Slot" from status dropdown
   - Fix format display on post cards

2. **Inline text editing** (Sonnet, 45 min):
   - The core editing feature — click to edit text in visual preview
   - Prompt is designed, just needs to be run

3. **Photo upload into slots** (Sonnet, 45 min):
   - Click placeholder → upload image → drops into visual

4. **Static story direct mode** (Sonnet, 30 min):
   - Rewrite the static story prompt for direct HTML generation
   - Wire into the existing direct mode pipeline

5. **New Post Wizard** (Opus planning session, then Sonnet build):
   - This is a significant UX overhaul — needs its own planning session
   - Don't rush it. Plan the full flow, get Jay's approval, then build.

*Last updated: 2026-04-10. Direct HTML visual generation mode built and live. Visuals significantly improved. Delete visual working. 3 bugs logged. Inline text editing and photo upload are next. New Post Wizard concept defined — save for dedicated session.*
