# Content Engine Build — Session Handoff

## Drop this into a new Cowork session to pick up where we left off.

---

## What We're Building

A visual content generation engine inside KOS that produces Instagram-ready carousel and static post visuals (HTML → PNG export) for any client. Full spec: `KOS_ContentEngine_BuildPlan.md`

---

## What's Done (pushed to git, live on Vercel)

| Step | What | Status |
|------|------|--------|
| A1 | Database migration (format, placement on posts + post_visuals table) + TypeScript types + weekly plan updated to output format/placement | ✅ Pushed |
| A2 | Color derivation system (6-token palette from brand primary) + Google Fonts loader | ✅ Pushed |
| A3 | Slide layout registry — 14 layout type HTML templates | ✅ Pushed |
| A4 | HTML renderer (assembles slides into full carousel doc) + Instagram frame wrapper | ✅ Pushed |
| A5 | Claude API prompt for visual generation + orchestrator + server actions + API route | ✅ Pushed |
| A6 | Generate Visual button on post cards + full-screen preview modal (iframe with blob URL) | ✅ Pushed |
| Fix | CSP updated to allow blob: URLs in iframes | ✅ Pushed |
| Fix | Post card shows first slide thumbnail, queue flow updated for generated visuals | ✅ Pushed |
| Fix | Two-color brand palette extraction (primary + accent) | ✅ Pushed |

**Phase A is functionally complete** — you can generate carousels and see them in a preview modal. But the visual quality doesn't match the reference carousels yet.

---

## What's NOT Done (in priority order)

### 1. CRITICAL: Rebuild layout templates from reference carousels
**This is the #1 priority.** The current templates look generic. They were built from text descriptions, not from actually studying the reference HTML files. Claude Code needs to READ the 3 reference carousel files and rebuild `lib/visual-engine/layoutRegistry.ts` to match that quality level.

**Reference files location:** `C:\Users\jaytr\HQ\Instagram Carousels\Northern Standard Easter\`
- carousel_1_the_offer.html
- carousel_2_the_dirty_truth.html
- carousel_3_before_after.html

**The prompt for this is ready** — see "Next Prompt to Run" section below.

Also needs fixes in:
- `lib/visual-engine/slideRenderer.ts` (HTML doc structure must match references)
- `lib/visual-engine/frameWrapper.ts` (IG frame must match references)
- `lib/visual-engine/colorDerivation.ts` (verify amber accent is applied correctly)
- `lib/ai/prompts/visualPlan.ts` (prompt should produce punchy, brand-specific copy)
- `lib/ai/generateVisuals.ts` (verify color extraction works for Northern Standard)

### 2. Delete generation button
Add ability to delete a generated visual from both:
- The preview modal (button alongside Regenerate/Export/Close)
- The SchedulePanel sidebar (when clicking into a post)

### 3. Show visual preview in SchedulePanel
When clicking into a post that has a generated visual, the SchedulePanel sidebar should show the visual preview in the Creative section (instead of just the upload dropzone).

### 4. Phase B — Photo drop zones (Step B1)
Photo placeholder slots in the preview modal where Jay can drag-and-drop images into labeled positions. Each slot shows what type of photo goes there. Photos get base64 encoded into the HTML.

### 5. Phase B — Playwright PNG export (Step B2)
Server-side Playwright export that captures each carousel slide as a 1080×1350 PNG (feed) or 1080×1920 (story). Downloads as a zip with organized naming: `{client-slug}_{format}-{placement}_{date}_slide-{n}.png`

### 6. LATER: SchedulePanel "island" redesign
Jay doesn't love the sidebar style — wants it more like a floating island/modal. This is a UX overhaul, NOT part of this engine build. Save for a future session.

### 7. LATER: Karpathy LLM Wiki integration
Jay wants to implement Andrej Karpathy's LLM Wiki pattern — a persistent, compounding knowledge base per client that replaces the static claude_md. The wiki would be maintained by AI, accumulating knowledge from every content generation, client call, research task, etc. Architecture this as a future phase after the content engine is fully working.

---

## Next Prompt to Run in Claude Code

This is the FIRST thing to do in the next session. Paste into Claude Code at `C:\Users\jaytr\HQ\Projects\kos`:

```
ultrathink

Read CLAUDE.md, then read KOS_ContentEngine_BuildPlan.md.

## CRITICAL: Read these 3 reference carousel HTML files FIRST, line by line, before doing anything else:

- C:\Users\jaytr\HQ\Instagram Carousels\Northern Standard Easter\carousel_1_the_offer.html
- C:\Users\jaytr\HQ\Instagram Carousels\Northern Standard Easter\carousel_2_the_dirty_truth.html
- C:\Users\jaytr\HQ\Instagram Carousels\Northern Standard Easter\carousel_3_before_after.html

If those paths don't work, try finding them — they're HTML carousel files for Northern Standard somewhere in C:\Users\jaytr\HQ\

Study every detail: the exact CSS, spacing, font sizes, opacity values, box shadows, padding, border-radius, background colors, how text hierarchy works, how cards are styled, how the progress bar and arrows look. These files are the quality bar. Everything the visual engine produces must look THIS good.

## Task: Rebuild the layout templates to match the reference carousel quality

### Problem:
The current layout templates in lib/visual-engine/layoutRegistry.ts produce carousels that look generic and low-quality compared to the reference files. The reference carousels use:
- Semi-transparent overlay boxes: rgba(255,255,255,0.04) with rgba(255,255,255,0.06) borders on dark slides
- Very specific typography: Montserrat 800 for heroes at 26-34px with tight letter-spacing (-0.5px to -3px), Open Sans 300-400 for body at 13-15px
- Tag labels: 10-11px, uppercase, letter-spacing 2px, using brand accent or brand light color
- Cards with 12px border-radius, subtle borders (#E2E4E8 on light, rgba(255,255,255,0.06) on dark)
- Pull quotes with thin decorative bars (2px height, 40px wide, brand accent color) above and below
- Photo placeholders as dashed-border boxes: 2px dashed rgba(0,0,0,0.1) on light, rgba(255,255,255,0.1) on dark, with emoji + label centered
- Content padding: varies by slide type but typically 36px horizontal, 48-52px bottom (clearing progress bar)
- Hero slides with justify-content: center, content slides with flex-start
- Feature grid cards with emoji icons, not generic text
- The overall feel is polished, minimal, and professional — NOT generic template-looking

### What to do:

1. Read all 3 reference files completely. Understand the exact CSS patterns.

2. Read the current lib/visual-engine/layoutRegistry.ts.

3. REWRITE layoutRegistry.ts from scratch, making every layout template match the reference carousel quality. Copy the exact CSS patterns — don't paraphrase them. If the reference uses rgba(255,255,255,0.04) for a card background, use that exact value. If it uses padding:36px 36px 52px, use that exact padding.

4. Also read and fix lib/visual-engine/colorDerivation.ts — make sure:
   - brand_accent (amber #E8732A) is being set correctly
   - The palette derivation for Northern Standard specifically should produce: dark_bg close to #0F2640, light_bg close to #F2F4F7, brand_accent = #E8732A

5. Read and fix lib/visual-engine/slideRenderer.ts — make sure:
   - The HTML document structure matches the reference files exactly (same CSS reset, same body styles, same ig-frame structure)
   - The carousel JavaScript matches the reference files (same pointer event handling, same goTo function, same transition)
   - Google Fonts are loaded with the correct weights

6. Read and fix lib/visual-engine/frameWrapper.ts — make sure:
   - The Instagram header, dots, actions, and caption match the reference files exactly
   - SVG icons are identical to the reference files
   - The ig-frame is exactly 420px wide with the correct styling

7. Read lib/ai/prompts/visualPlan.ts — make sure:
   - The prompt tells Claude to write concise, punchy copy that matches Northern Standard's voice
   - The prompt tells Claude to use specific stats, prices, and details from the brand doc (not generic filler)
   - The prompt references real layout patterns from the reference files

8. Read lib/ai/generateVisuals.ts — make sure:
   - Both primary (#1B3A5C) and accent (#E8732A) colors are being extracted correctly from Northern Standard's claude_md
   - The font pair extraction finds Montserrat + Open Sans
   - Both colors are passed to deriveColorPalette

This is the most important fix in the entire build. The visual quality is what makes this tool worth using. Take your time and get it right.

Run npm run lint && npm run build and fix any errors before presenting work as complete.
```

**After that builds clean, push:**
```
git add -A
git commit -m "feat: rebuild layout templates from reference carousels for production quality"
git push
```

**Then test:** Generate a new visual for a Northern Standard post and compare to the reference carousels.

---

## Remaining Prompts After the Quality Fix

### Delete generation button
```
ultrathink

Read CLAUDE.md. Read:
- components/content/VisualPreviewModal.tsx
- components/content/SchedulePanel.tsx
- lib/actions/visuals.ts

## Task: Add delete visual functionality

1. Add a deleteVisualAction(postId: string) server action in lib/actions/visuals.ts that:
   - Auth check
   - Deletes the post_visual record for that post
   - Resets the post status back to 'in_production' if it was 'ready'

2. Add a "Delete Visual" button (red/destructive style) in VisualPreviewModal.tsx alongside the existing Regenerate/Export/Close buttons. Confirm before deleting ("Are you sure? This can't be undone").

3. Add a "Delete Visual" option in SchedulePanel.tsx when a post has a generated visual. Small trash icon button near the visual preview area.

4. After deletion, close the modal and refresh the post data.

Run npm run lint && npm run build and fix any errors before presenting work as complete.
```

### Show visual in SchedulePanel
```
ultrathink

Read CLAUDE.md. Read:
- components/content/SchedulePanel.tsx
- components/content/CreativeUploader.tsx
- lib/actions/visuals.ts

## Task: Show generated visual preview in SchedulePanel

When a post has a generated visual (post.visual exists), update the Creative section of the SchedulePanel to show:
- A small iframe preview of the carousel (scaled down to fit the panel width, ~280px wide, using CSS transform: scale() with overflow:hidden wrapper)
- Below it: visual status badge, slide count, "View Full Preview" button that opens the modal
- The existing CreativeUploader should still show below for uploading additional media/photos
- If no visual exists, show only the CreativeUploader (current behavior)

Run npm run lint && npm run build and fix any errors before presenting work as complete.
```

### Phase B1: Photo drop zones
See the full prompt in KOS_ContentEngine_BuildPlan.md under "Step B1: Photo Drop Zones"

### Phase B2: Playwright export
See the full prompt in KOS_ContentEngine_BuildPlan.md under "Step B2: Playwright Export"

---

## Key Context for the Next Session

- **KOS repo:** `C:\Users\jaytr\HQ\Projects\kos`
- **Reference carousels:** `C:\Users\jaytr\HQ\Instagram Carousels\Northern Standard Easter\`
- **Northern Standard brand doc:** Already in Supabase claude_md field — comprehensive (colors, fonts, services, pricing, voice, pillars, everything)
- **Primary color:** #1B3A5C (Navy) — dominant, dark backgrounds
- **Accent color:** #E8732A (Amber) — CTAs, highlights, action elements
- **Fonts:** Montserrat (headings) + Open Sans (body)
- **Codex review:** Jay maxed out for this session. End prompts with `Run npm run lint && npm run build and fix any errors before presenting work as complete.` instead of the full codex chain.
- **Git workflow:** Push after each step: `git add -A` then `git commit -m "feat: [description]"` then `git push` (3 separate PowerShell commands)
- **Vercel:** Auto-deploys from main to kos-kohl.vercel.app

---

## Jay's Preferences Reminder
- Direct and efficient. No fluff.
- Concrete next steps, not theory.
- Walk him through step by step — one prompt at a time.
- He pastes prompts into Claude Code terminal (uses ultrathink/ultraplan).
- Cowork's job: write the prompts, track progress, pressure-test plans.
- Don't change things he didn't ask to change. No regressions.

---

*Last updated: 2026-04-09. Phase A complete but visual quality needs rebuild from reference files. Phase B (photo drop zones + export) not started. 5 remaining tasks before the engine is production-ready.*
