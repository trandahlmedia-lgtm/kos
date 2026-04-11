# Content Engine Build — Session Handoff v2

## Drop this into a new Cowork session to pick up where we left off.

---

## What We're Building

A visual content generation engine inside KOS that produces Instagram-ready carousel, static feed post, and story visuals (HTML rendering) for any client. The engine pulls brand assets (logos, colors, fonts) from the client's Brand Kit in KOS and generates on-brand content automatically.

---

## What's Done (pushed to git, live on Vercel)

| Step | What | Status |
|------|------|--------|
| Layout rebuild | Rewrote all 14 carousel layout templates from reference HTML files | Pushed |
| Two-color extraction | Engine extracts primary + accent colors from brand doc | Pushed |
| Brand asset storage | Multi-variant logo system (icon, wordmark dark/light, full) stored as JSONB on clients table | Pushed |
| Brand Kit tab | 4-slot logo upload UI + Instagram handle in client hub | Pushed |
| Logo in visuals | Engine pulls logos into IG header (icon) and slide content (hero/CTA get full logo) | Pushed |
| CSP fix | Added Supabase host to img-src so signed URLs render | Pushed |
| Logo glow | drop-shadow filter on logos for visibility on dark backgrounds | Pushed |
| Prompt rewrite | Full design system knowledge in visualPlan.ts — narrative arc, copy rules, logo placement, background alternation | Pushed |
| DB migrations | 011 (brand asset columns) + 012 (brand_logos JSONB, dropped logo_url) — both run on Supabase | Done |

**Carousel generation is working well.** Logos render, real pricing/phone numbers pulled from brand doc, good visual quality. Northern Standard has all 4 logo variants uploaded.

---

## What's NOT Done (in priority order)

### 1. NEXT: Show visual preview in SchedulePanel
The SchedulePanel sidebar (right panel when you click a post in Content) still shows just the upload dropzone even when a visual has been generated. It should show the generated visual preview with a "View Full Preview" button.

**Prompt is ready — see "Next Prompt to Run" section below.**

### 2. Static feed post layout system
Static posts currently render as a single carousel slide — wrong. They need their own layout system: photo-dominant, CTA footer bar, gradient overlay. The design system doc is saved at `reference-statics/STATIC_FEED_POST_DESIGN_SYSTEM.md` in the repo. This needs to be ported into the KOS engine (new layout types, updated prompt for static format, CTA footer component).

### 3. Story layout system
Jay has instructions for story format too (1080x1920). Not yet saved to repo. Handle after static posts are working.

### 4. Static story layout system
Jay also has instructions for static stories. Handle after story sequences.

### 5. Slide tweak/edit feature
Currently it's all-or-nothing regeneration. Jay wants to be able to edit individual slides (change copy, swap layout) without regenerating the entire carousel.

### 6. Delete visual button
Add ability to delete a generated visual from the preview modal and SchedulePanel.

### 7. Generation progress indicator
When clicking "Generate Visual," there's no loading feedback. Jay wants a dropdown/progress indicator similar to the outreach generation loading state.

### 8. Phase B1 — Photo drop zones
Photo placeholder slots in the preview modal where you can drag-and-drop real images into labeled positions.

### 9. Phase B2 — Playwright PNG export
Server-side export that captures each slide as a 1080x1350 PNG. Downloads as zip.

### 10. LATER: SchedulePanel "island" redesign
Jay wants it more like a floating modal. Future session.

### 11. LATER: Karpathy LLM Wiki
Persistent compounding knowledge base per client replacing static claude_md. Future phase.

---

## Next Prompt to Run in Claude Code

This is the FIRST thing to do. Paste into Claude Code at `C:\Users\jaytr\HQ\Projects\kos`:

```
ultrathink

Read CLAUDE.md. Read these files:
- components/content/SchedulePanel.tsx
- components/content/VisualPreviewModal.tsx (to understand how the visual HTML is currently displayed)
- lib/actions/visuals.ts (to see what visual data is available)

## Task: Show generated visual preview in SchedulePanel

When a post has a generated visual, the Creative section of the SchedulePanel should show the visual instead of just the upload dropzone.

### What to build:

1. In SchedulePanel.tsx, check if the post has a generated visual (post.visual or however the visual data is attached — read the code to find out).

2. When a visual exists, show in the Creative section:
   - A scaled-down preview of the carousel/static (use an iframe with the visual HTML, scaled to fit the panel width ~280px using CSS transform: scale() with an overflow:hidden wrapper)
   - Below the preview: a "View Full Preview" button that opens the VisualPreviewModal
   - A small "Regenerate" button
   - The existing CreativeUploader should still show BELOW the visual preview for uploading additional photos

3. When no visual exists, show the CreativeUploader as it works today (no changes to current behavior).

4. The visual HTML is stored in the post_visuals table. You may need to fetch it — check how VisualPreviewModal gets the HTML and follow the same pattern.

### Design:
- Match KOS dark mode design system
- The scaled iframe preview should have a subtle border (#2a2a2a) and rounded corners
- "View Full Preview" button: accent color outline style
- "Regenerate" button: subtle/ghost style
- Keep it clean and compact — this is a sidebar panel, not a full page

### Rules:
- Don't modify VisualPreviewModal.tsx
- Don't modify any visual engine files
- Don't break existing SchedulePanel functionality (caption editing, scheduling, etc.)

Run npm run lint && npm run build and fix any errors before presenting work as complete.
```

**After that builds clean, commit and push:**
```
git add -A
git commit -m "feat: show visual preview in SchedulePanel sidebar"
git push
```

---

## Remaining Prompts After SchedulePanel Fix

### Static feed post layout system
```
ultrathink

Read CLAUDE.md. Read reference-statics/STATIC_FEED_POST_DESIGN_SYSTEM.md completely — this is the quality bar and exact spec for static posts.

Also read:
- lib/ai/prompts/visualPlan.ts (current prompt)
- lib/visual-engine/layoutRegistry.ts (current layouts)
- lib/visual-engine/slideRenderer.ts (current renderer)
- lib/ai/generateVisuals.ts (orchestrator)

## Task: Add static feed post layout system

The current engine treats static posts as a single carousel slide. Static posts need their own layout system: photo-dominant, CTA footer bar, gradient bridge/overlay, logo placement top-right.

### What to build:

1. Add two new layout types to layoutRegistry.ts:
   - `static_photo_top` — Photo zone top ~62%, gradient bridge, content zone (deep primary bg), CTA footer bar (accent bg with CTA text + phone number)
   - `static_full_bleed` — Full-bleed photo with multi-stop gradient overlay, content at bottom, CTA footer bar
   - Both include: logo lockup top-right with glow, tag label, headline, body text
   - Photo zone uses the same dashed-border placeholder system as carousel photo slots

2. Update visualPlan.ts — when format is 'static', the prompt should:
   - Tell Claude to use ONLY static_photo_top or static_full_bleed layouts (not carousel layouts)
   - Generate a single slide with: tag_label, heading, body, photo_slots (1 main photo), cta (text + phone), logo_placement: "full"
   - Copy rules: headline max 6 words, body max 20 words, CTA must include phone number
   - Instruct Claude to choose Layout 1 vs Layout 2 based on content type

3. Update slideRenderer.ts — when format is 'static':
   - Don't render carousel track/swipe JS
   - Don't render progress bar or swipe arrow
   - Render a single 420x525 frame with the static layout
   - The CTA footer is part of the layout, not a separate component

4. Update the static layout render functions to accept logoUrls and render the full logo top-right (not centered like carousel hero slides)

### Rules:
- Don't modify carousel layouts or carousel rendering — everything carousel must still work exactly as before
- Follow the design system doc exactly — same CSS values, same spacing, same gradient stops
- The CTA footer bar is full-width, accent color background, 48px tall

Run npm run lint && npm run build and fix any errors before presenting work as complete.
```

### Delete visual button
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

---

## Key Context for the Next Session

- **KOS repo:** `C:\Users\jaytr\HQ\Projects\kos`
- **Reference carousels:** `reference-carousels/` in repo root (3 HTML files + CAROUSEL_DESIGN_SYSTEM.md)
- **Reference statics:** `reference-statics/STATIC_FEED_POST_DESIGN_SYSTEM.md` in repo root
- **Northern Standard brand doc:** In Supabase claude_md field
- **Northern Standard brand_logos:** All 4 variants uploaded (icon, wordmark_dark, wordmark_light, full) — paths in Supabase brand_logos JSONB
- **Primary color:** #1B3A5C (Navy)
- **Accent color:** #E8732A (Amber)
- **Fonts:** Montserrat (headings) + Open Sans (body)
- **Instagram handle:** northernstandardhvac
- **Git workflow:** Commit after each step, then push. Use specific file adds (not git add -A).
- **Vercel:** Auto-deploys from main to kos-kohl.vercel.app
- **Migrations:** After any new migration file, read it and run the SQL manually in Supabase dashboard SQL Editor.

---

## Jay's Preferences Reminder
- Direct and efficient. No fluff.
- Concrete next steps, not theory.
- Walk him through step by step — one prompt at a time.
- He pastes prompts into Claude Code terminal.
- Cowork's job: write the prompts, track progress, pressure-test plans.
- Don't change things he didn't ask to change. No regressions.
- Model note: Opus for planning/architecture, Sonnet for standard builds, Haiku for simple lookups. Jay is on Opus in Cowork.

---

*Last updated: 2026-04-10. Carousel generation working well with logos and brand assets. Static/story layouts not yet implemented. SchedulePanel preview is the immediate next task. 9 remaining items before the engine is production-ready.*
