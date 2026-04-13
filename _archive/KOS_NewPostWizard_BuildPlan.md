# New Post Wizard — Build Plan

**Status:** Approved by Jay 2026-04-10
**Model routing:** Sonnet for all build steps unless noted otherwise

---

## Overview

Full-screen, step-by-step modal that replaces PostDialog for creating new posts. User walks through each decision one at a time. When the wizard closes, the post is fully ready (visual + caption).

---

## The Flow (6 Steps)

### Step 1 — Pick a Client
- Only shows if user is in "All Clients" view
- If already inside a specific client's content page, skip to Step 2 with that client pre-selected
- Active clients displayed as clickable cards (name + logo if available)

### Step 2 — Pick a Date (Month Calendar)
- Full month calendar view
- Shows ONLY the selected client's scheduled posts (not all clients)
- Posts appear as small colored dots/pills on their scheduled dates
- Navigate between months with left/right arrows
- Click a day to select it
- Selected day highlighted with accent color

### Step 3 — Content Direction (Angle)
- Text input for the user to type what the post is about
- Examples: "Spring AC tune-up special", "Why your furnace filter matters"
- "Suggest an Angle" button:
  - AI reads client's `claude_md` + existing scheduled posts for the month
  - Returns one angle suggestion that doesn't overlap existing content
  - "Suggest Again" button for a new suggestion
- User can edit the AI suggestion or type their own

### Step 4 — Format Recommendation
- AI recommends format (carousel, static_feed, story_sequence, static_story) based on the angle
- Shows recommendation with short reasoning (e.g., "Educational topic — carousel breaks it into digestible slides")
- User can accept or override with dropdown
- Content type selector (offer, education, trust, differentiator, social_proof, bts, before_after, seasonal) — AI pre-selects, user can change
- Platform selector (defaults to Instagram)

### Step 5 — Visual Generation
- Kicks off `generateVisualDirectForPost()` pipeline
- Loading state while Claude generates
- Visual preview renders in iframe once done
- Available actions:
  - "Regenerate" button
  - Inline text editing (contentEditable on data-field elements, same as VisualPreviewModal)
  - Photo upload into slots (click data-photo-slot → file picker → upload → inject)
- Reuses VisualPreviewModal's editing logic, extracted into shared utilities

### Step 6 — Caption
- AI generates caption via existing `/api/ai/captions` endpoint
- Caption displayed in editable textarea
- Below textarea: prompt input for tweaks (e.g., "make it shorter", "add urgency")
  - Hits new `/api/ai/tweak-caption` endpoint
  - Returns revised caption preserving the parts not mentioned
- User can also just manually edit the text
- "Finish" button saves everything and sets post status to `ready`

---

## Component Architecture

### New Files

```
components/content/NewPostWizard.tsx          — Main full-screen modal + step navigation + state management
components/content/wizard/StepClient.tsx      — Client picker cards
components/content/wizard/StepCalendar.tsx    — Month calendar with client's posts
components/content/wizard/StepAngle.tsx       — Angle input + AI suggest
components/content/wizard/StepFormat.tsx      — Format recommendation + content type + platform
components/content/wizard/StepVisual.tsx      — Visual generation + inline editing
components/content/wizard/StepCaption.tsx     — Caption generation + tweak prompt
```

### New API Routes

```
app/api/ai/suggest-angle/route.ts      — Input: client_id, scheduled_posts context → Output: one angle string
app/api/ai/recommend-format/route.ts   — Input: angle, content_type → Output: { format, placement, reasoning }
app/api/ai/tweak-caption/route.ts      — Input: current caption, user prompt, client claude_md → Output: revised caption
```

### New Prompt Templates

```
lib/ai/prompts/suggestAngle.ts         — System + user prompt for angle suggestion
lib/ai/prompts/recommendFormat.ts      — System + user prompt for format recommendation
lib/ai/prompts/tweakCaption.ts         — System + user prompt for caption tweaking
```

### Existing Code Reused (NOT duplicated)

- `generateVisualDirectForPost()` — visual generation pipeline
- `/api/ai/captions` endpoint — caption generation
- `updateVisualHtmlAction()` — saving inline edits
- `generateVisualAction()` — triggering generation from server action
- Photo upload flow (extract from VisualPreviewModal into shared hook: `usePhotoSlotUpload`)
- Inline text editing (extract from VisualPreviewModal into shared hook: `useInlineTextEdit`)
- Brand color/font extraction utilities
- `createPostAction()` — post creation
- `updatePostAction()` — post updates
- `updatePostStatusAction()` — status transitions

---

## Data Flow

1. **Step 1-2:** Wizard collects `client_id` and `scheduled_date`. Post record created via `createPostAction()` with status `slot`.
2. **Step 3:** `angle` saved to post via `updatePostAction()`.
3. **Step 4:** `format`, `placement`, `content_type`, `platform` saved to post via `updatePostAction()`.
4. **Step 5:** Visual generated via `generateVisualAction()`. PostVisual record created automatically.
5. **Step 6:** Caption generated via `/api/ai/captions`. Caption + CTA + hashtags saved to post.
6. **Finish:** Post status transitioned to `ready` via `updatePostStatusAction()`.

If user closes wizard mid-way, post exists as `slot` and can be completed later from SchedulePanel.

---

## UI/UX Details

### Layout
- Full-screen overlay (z-50, bg-[#0a0a0a])
- Step indicator bar at top (Step 1 of 6, with dots or numbered pills)
- Current step content centered in the viewport
- "Back" button (left) and "Next"/"Continue" button (right) at bottom
- "X" close button top-right (with confirmation if post is partially created)

### Transitions
- Smooth horizontal slide between steps (or simple fade)
- Step indicator updates as user progresses

### Design System
- Same dark mode palette (#0a0a0a bg, #111111 surfaces, #E8732A accent)
- Cards for client selection: #111111 bg, #2a2a2a border, hover with accent border
- Calendar: custom month grid, #111111 cells, accent highlight on selected day
- All buttons use existing shadcn/ui components

---

## What Changes in Existing UI

- "New Post" button in `ContentPageClient` opens `NewPostWizard` instead of `PostDialog`
- `PostDialog` remains for quick-editing existing post metadata
- All other components untouched (SchedulePanel, PostCard, WeeklyCalendar, etc.)

---

## What This Does NOT Include (Future Backlog)

- Post format switching from SchedulePanel (separate task)
- Generation progress dropdown/toasts (can layer onto Steps 5-6 later)
- Playwright PNG export (separate task)
- Crop/reframe tool (separate task)
- Slide-level editing (separate task)
- **Date-aware angle suggestions** — Feed upcoming holidays, seasonal events, and industry-relevant dates (National Home Improvement Month, first frost timing, Memorial Day, etc.) into the angle suggestion AI. Static calendar of US holidays + home services seasonal triggers, plus optional web search for timely events. Layer onto StepAngle after wizard ships.
- **Nano Banana AI photo generation** — Use Nano Banana API (Gemini-based, ~$0.02/image) to auto-generate photos for visual photo slots instead of manual upload. "Generate Photos" button in StepVisual sends each slot's description to the API, returns images, auto-fills slots. User can re-generate individual slots or upload their own to override. Needs: API key in .env, server-side utility for API calls, prompt logic using slot descriptions + client brand context. ~30-45 min build.
- **Visual prompt quality tuning** — Current direct-mode prompts produce visuals that don't match the quality of the reference HTML files in reference-carousels/, reference-statics/, reference-stories/. Dedicated Opus session needed: compare reference HTML output against generated output, identify gaps in the system prompts (layout precision, typography, spacing, color usage), and rewrite prompts until generated visuals match reference quality. This is a prompt engineering session, not a code session.

---

## Build Order

1. **NewPostWizard shell** — Full-screen modal, step navigation, state management, wire to "New Post" button
2. **StepClient** — Client picker cards
3. **StepCalendar** — Month calendar with client post dots
4. **StepAngle** — Text input + suggest-angle API route + prompt
5. **StepFormat** — Recommend-format API route + prompt + override UI
6. **StepVisual** — Extract editing hooks from VisualPreviewModal, wire generation, embed preview
7. **StepCaption** — Caption generation + tweak-caption API route + prompt + edit UI
8. **Polish** — Transitions, loading states, error handling, edge cases
9. **Test** — Full flow end-to-end, verify post lands in content engine correctly

Each step = one Claude Code session prompt. Build sequentially — each step depends on the previous.
