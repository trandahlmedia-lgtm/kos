# Hybrid Visual Engine — Implementation Plan

## Architecture Overview

**Current:** Claude → JSON CreativeBrief → layoutRegistry.ts (24 templates) → slideRenderer.ts wraps in IG chrome → HTML
**New:** Claude → HTML for each slide's content zone (with data attributes for editability) → slideRenderer.ts wraps in IG chrome → HTML

The key change: Claude generates the INNER HTML of each slide directly, instead of returning structured JSON that gets mapped through rigid layout templates. The IG chrome (frame, header, dots, actions, caption, progress bars, swipe arrows, swipe JS) stays in `slideRenderer.ts` exactly as-is.

---

## What Changes

### 1. `lib/ai/prompts/visualPlan.ts` — REWRITE

**Current:** Tells Claude to return a `CreativeBrief` JSON with `layout_type`, `heading`, `body`, `features[]`, etc.
**New:** Tells Claude to return an array of slide objects where each slide contains:
- `inner_html` — the complete HTML for the slide's content zone (420×525 or 420×747)
- `background` — "dark" | "light" | "gradient" (still needed so the renderer knows how to style chrome)
- `has_arrow` — boolean (still needed for swipe arrow rendering)
- `logo_placement` — "full" | "icon" | "none" (still needed for logo injection)
- `photo_slots` — array of slot IDs referenced in the HTML (still needed for photo upload tracking)
- `caption` — Instagram caption text
- `hashtags` — hashtag string

**The prompt includes:**
- The full design system docs (CAROUSEL_DESIGN_SYSTEM.md content) as system instructions
- Brand color palette (derived hex values, not just primary/accent)
- Font pair + Google Fonts URL
- Logo signed URLs (so Claude can reference them as `<img>` tags)
- Brand doc (claude_md) for copy/content
- Recent visual descriptions for anti-repetition
- Rules for data attributes:
  - Every editable text element: `data-field="heading|body|tag|cta|stat|quote" data-slide="N"`
  - Every photo placeholder: `data-photo-slot="slide-N-photo-M"` with `data-label="description"`
  - Progress bar and swipe arrow: NOT included in Claude's output — renderer adds them

**Claude's output format:**
```json
{
  "slides": [
    {
      "index": 0,
      "inner_html": "<div style=\"padding:36px 36px 52px;...\">...</div>",
      "background": "dark",
      "has_arrow": true,
      "logo_placement": "full",
      "photo_slots": ["slide-0-photo-0"]
    }
  ],
  "caption": "Full Instagram caption",
  "hashtags": "#tag1 #tag2",
  "cta_text": "Call (612) 655-3370"
}
```

### 2. `lib/ai/generateVisuals.ts` — MODIFY

**Changes:**
- Add a `generationMode` concept: `'template'` (current) vs `'direct'` (new)
- For `'direct'` mode:
  - Build the new prompt (from updated visualPlan.ts)
  - Pass logo signed URLs to the prompt (already generated at step 8)
  - Parse Claude's response — extract `inner_html` from each slide
  - Pass the slide array to a new renderer function
  - Store `inner_html` per slide in the DB alongside `generated_html` (for future editing)
- Keep the existing `'template'` path untouched for now (no regressions)
- Default new posts to `'direct'` mode
- Use **Sonnet** for direct HTML generation (needs creative reasoning, not just slot-filling)

**New DB column needed:** `slide_html` (JSONB array) on `post_visuals` — stores each slide's inner_html separately so inline editing can update individual slides without re-parsing the full document.

### 3. `lib/visual-engine/slideRenderer.ts` — ADD NEW FUNCTIONS

**Add:** `renderCarouselDirect()`, `renderStaticDirect()`, `renderStorySequenceDirect()`

These functions:
- Take an array of `{ inner_html, background, has_arrow, logo_placement, photo_slots }` objects
- Wrap each slide's `inner_html` in the `.slide` div with proper background color
- Add progress bar (from layoutRegistry's `renderProgressBar`)
- Add swipe arrow (from layoutRegistry's `renderSwipeArrow`) if `has_arrow: true`
- Inject logo HTML if `logo_placement !== "none"` (top-right position, glow filter)
- Wrap all slides in the same IG frame (header, carousel track, dots, actions, caption)
- Reuse ALL existing chrome functions from `frameWrapper.ts` — no changes needed there

**The existing `renderCarousel()`, `renderStatic()`, `renderStorySequence()` stay untouched.**

### 4. `lib/visual-engine/layoutRegistry.ts` — NO CHANGES

The layout registry stays as-is. It continues to power the `'template'` mode. No regressions. Over time, once `'direct'` mode is proven, the registry becomes legacy code.

### 5. Database Migration (013 or next number)

```sql
ALTER TABLE post_visuals ADD COLUMN IF NOT EXISTS slide_html jsonb;
ALTER TABLE post_visuals ADD COLUMN IF NOT EXISTS generation_mode text DEFAULT 'template';
```

`slide_html` stores: `[{ "index": 0, "inner_html": "...", "background": "dark", ... }, ...]`
`generation_mode` tracks which pipeline produced the visual.

### 6. Preview Modal — INLINE TEXT EDITING (future step)

After the generation pipeline is working:
- The iframe already renders the HTML
- Use `postMessage` to communicate between the parent (React) and the iframe
- Inject a small script into the generated HTML that:
  - Makes all `[data-field]` elements `contentEditable` on click
  - Sends `postMessage({ type: 'text-edit', slide: N, field: 'heading', value: 'new text' })` on blur
  - Parent receives the message, updates the `slide_html` array, saves to DB
- Visual indicator: slight outline/highlight on hover over editable elements

### 7. Photo Upload into Slots (future step)

- Click a `[data-photo-slot]` element in the iframe → `postMessage` to parent
- Parent opens file picker / media library
- On selection, parent sends `postMessage` back to iframe with the image URL
- Iframe replaces the placeholder div with an `<img>` tag
- Parent updates `slide_html` with the modified HTML

---

## File Change Summary

| File | Action | Risk |
|------|--------|------|
| `lib/ai/prompts/visualPlan.ts` | Add new prompt functions (keep old ones) | LOW — additive |
| `lib/ai/generateVisuals.ts` | Add direct mode path (keep template path) | LOW — additive |
| `lib/visual-engine/slideRenderer.ts` | Add 3 new render functions | LOW — additive |
| `lib/visual-engine/index.ts` | Export new functions | LOW — additive |
| `supabase/migrations/014_*.sql` | Add 2 columns | LOW — non-destructive |
| `lib/visual-engine/layoutRegistry.ts` | NO CHANGES | ZERO |
| `lib/visual-engine/frameWrapper.ts` | NO CHANGES | ZERO |
| `components/content/VisualPreviewModal.tsx` | NO CHANGES (phase 1) | ZERO |
| `components/content/SchedulePanel.tsx` | NO CHANGES (phase 1) | ZERO |

---

## Build Order (prompts for Claude Code)

### Prompt 1: Database migration + types
- Add migration file for `slide_html` and `generation_mode` columns
- Update `PostVisual` type in `types/index.ts`
- Add `DirectSlide` type

### Prompt 2: New prompt system in visualPlan.ts
- Add `VISUAL_PLAN_DIRECT_SYSTEM` — the big prompt with full design system
- Add `buildVisualPlanDirectUser()` — user message builder with brand palette, fonts, logos
- Add `getVisualPlanSystem()` update to support direct mode
- Keep all existing prompt functions untouched

### Prompt 3: New render functions in slideRenderer.ts
- Add `renderCarouselDirect()` — wraps Claude's inner_html in carousel chrome
- Add `renderStaticDirect()` — wraps in static post chrome
- Add `renderStorySequenceDirect()` — wraps in story chrome
- Export from index.ts

### Prompt 4: Wire it up in generateVisuals.ts
- Add direct mode generation path
- Parse Claude's HTML response
- Route to new render functions
- Save slide_html to DB
- Keep template mode as fallback

### Prompt 5: Test end-to-end
- Generate a carousel for Northern Standard in direct mode
- Compare output quality to template mode
- Verify preview modal renders correctly
- Fix any issues

---

## Design System Prompt Strategy

The key to quality: the system prompt for direct mode embeds the ENTIRE design system as instructions, not just layout type names. Claude gets:

1. **Color palette with exact CSS values** — not just "use dark backgrounds" but `background: #0F2640`, `color: rgba(255,255,255,0.6)` for body text on dark, etc.
2. **Typography scale** — exact font sizes, weights, letter-spacing for headings, body, tags, stats
3. **Component patterns** — how to build feature cards, comparison columns, stat displays, CTA buttons, photo placeholders, tag pills (with actual HTML examples)
4. **Spacing rules** — padding values, gap sizes, margin patterns
5. **Narrative arc** — same 7-slide storytelling structure
6. **Copy rules** — same brevity/specificity requirements
7. **Data attribute requirements** — exactly how to tag elements for editability

This is essentially giving Claude the same reference material you use when generating manually — just formatted as system instructions.

---

## Anti-Repetition in Direct Mode

Template mode uses `layout_recipe` (array of layout_type strings) to avoid repeats.

Direct mode shifts to: include descriptions of the last 3 visuals' content approach in the prompt. Example:
> "Recent visuals for this client: (1) Easter special pricing carousel with comparison columns, (2) Trust-building carousel with team photo + warranty features, (3) Seasonal urgency with countdown + booking CTA. Make this one visually and narratively distinct."

This gives Claude creative context without constraining it to template names.

---

## Model Choice

Direct HTML generation uses **Sonnet** (not Haiku). Reasons:
- Claude needs to write coherent, visually-aware HTML with proper inline styles
- It needs to make design decisions (spacing, proportions, emphasis)
- It needs to follow the design system while being creative
- Haiku would produce generic, repetitive HTML
- Opus is overkill — Sonnet hits the sweet spot

Template mode can stay on whatever model it's currently using.
