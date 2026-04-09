# KOS Content Generation Engine — Build Plan

## Overview

A visual content generation engine inside KOS that produces Instagram-ready carousel and static post visuals (HTML → PNG export) for any client. Reads the client's brand kit (`claude_md`), derives colors, picks unique layout combinations, generates slide content via Claude API, renders HTML with the design system rules baked in, and exports via Playwright.

**End state:** Click "Generate" on a post card → full carousel preview appears in a modal → drag photos into labeled slots → export Instagram-ready PNGs → post.

---

## Architecture Summary

### Two-layer system

**Layer 1 — Design System (deterministic, coded in KOS):**
Progress bars, swipe arrows, color derivation from brand primary, font loading, aspect ratios, the Instagram frame wrapper, all slide layout type HTML/CSS templates, photo placeholder slots. This layer guarantees every export looks professional and consistent. Claude never touches this layer.

**Layer 2 — Creative Decisions (Claude API):**
Which slide layout types to use per carousel, what order, headlines, body copy, stats, CTAs, photo descriptions, light/dark alternation pattern. This layer ensures variety across posts. Claude gets the client's brand doc + post angle + list of recently-used layout combos and returns a structured JSON creative brief.

### Generation flow
1. User clicks "Generate" on a post card, optionally adds notes
2. KOS reads client's `claude_md` + post metadata (angle, content_type, format, placement)
3. KOS queries `post_visuals` for that client's recent layout recipes (anti-repetition)
4. KOS calls Claude API with visual generation prompt → gets structured JSON back
5. KOS renders JSON into full HTML using the design system templates
6. HTML stored in `post_visuals` table
7. User sees Instagram-style preview in a full-screen modal
8. User drags photos into labeled placeholder slots
9. Photos get base64-encoded into the HTML
10. User clicks "Export" → Playwright captures each slide as PNG at correct dimensions
11. PNGs download with organized naming: `{client-slug}_{format}-{placement}_{date}_slide-{n}.png`

---

## Database Changes

### New columns on `posts` table

```sql
-- Migration: add_visual_fields_to_posts
ALTER TABLE posts
  ADD COLUMN format text DEFAULT 'static',          -- 'carousel' | 'static'
  ADD COLUMN placement text DEFAULT 'feed';          -- 'feed' | 'story'

-- Add check constraints
ALTER TABLE posts
  ADD CONSTRAINT posts_format_check CHECK (format IN ('carousel', 'static')),
  ADD CONSTRAINT posts_placement_check CHECK (placement IN ('feed', 'story'));
```

### New `post_visuals` table

```sql
-- Migration: create_post_visuals_table
CREATE TABLE post_visuals (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id         uuid REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  client_id       uuid REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  generated_html  text,                              -- Full self-contained HTML
  creative_brief  jsonb,                             -- Claude's structured JSON response
  layout_recipe   jsonb,                             -- Array of slide layout types used, e.g. ["hero_stat", "problem_photo", "pull_quote", "feature_grid", "cta"]
  slide_count     integer,
  color_palette   jsonb,                             -- Derived 6-token palette stored for reference
  photo_slots     jsonb,                             -- Array of { slot_id, label, description, has_photo, base64_data }
  font_pair       jsonb,                             -- { heading: "Montserrat", body: "Open Sans" }
  export_status   text DEFAULT 'pending',            -- 'pending' | 'photos_needed' | 'ready_to_export' | 'exported'
  exported_at     timestamptz,
  notes           text,                              -- User notes passed to Claude before generation
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now(),

  UNIQUE(post_id)                                    -- One visual per post
);

-- RLS
ALTER TABLE post_visuals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own post visuals"
  ON post_visuals FOR ALL
  USING (
    client_id IN (SELECT id FROM clients WHERE assigned_to = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid())
  );

-- Index for anti-repetition queries
CREATE INDEX idx_post_visuals_client_id ON post_visuals(client_id);
CREATE INDEX idx_post_visuals_created_at ON post_visuals(created_at DESC);
```

### TypeScript types (add to `types/index.ts`)

```typescript
export type PostFormat = 'carousel' | 'static';
export type PostPlacement = 'feed' | 'story';
export type VisualExportStatus = 'pending' | 'photos_needed' | 'ready_to_export' | 'exported';

export interface PhotoSlot {
  slot_id: string;
  label: string;           // e.g. "Dusty AC unit close-up"
  description: string;     // Longer description for the user
  has_photo: boolean;
  base64_data?: string;    // Filled when user drops a photo
  mime_type?: string;      // image/jpeg or image/png
}

export interface ColorPalette {
  brand_primary: string;
  brand_light: string;
  brand_dark: string;
  light_bg: string;
  light_border: string;
  dark_bg: string;
}

export interface FontPair {
  heading: string;         // Google Font name
  body: string;            // Google Font name
}

export interface SlideContent {
  index: number;
  layout_type: string;     // e.g. "hero_stat", "problem_photo", "pull_quote"
  background: 'light' | 'dark' | 'gradient';
  tag_label?: string;      // Small uppercase label above heading
  heading: string;
  body?: string;
  stat?: { number: string; label: string };
  features?: Array<{ icon: string; label: string; description: string }>;
  steps?: Array<{ number: string; title: string; description: string }>;
  quote?: string;
  comparison?: { left: { label: string; items: string[] }; right: { label: string; items: string[] } };
  photo_slots?: PhotoSlot[];
  cta?: { text: string; subtitle?: string };
  has_arrow: boolean;      // false on last slide
}

export interface CreativeBrief {
  slides: SlideContent[];
  caption: string;
  hashtags: string;
  cta_text: string;
}

export interface PostVisual {
  id: string;
  post_id: string;
  client_id: string;
  generated_html: string | null;
  creative_brief: CreativeBrief | null;
  layout_recipe: string[];     // Array of layout type strings
  slide_count: number;
  color_palette: ColorPalette;
  photo_slots: PhotoSlot[];
  font_pair: FontPair;
  export_status: VisualExportStatus;
  exported_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// Update existing Post type
export interface Post {
  // ... existing fields ...
  format: PostFormat;
  placement: PostPlacement;
  visual?: PostVisual;       // Joined from post_visuals
}
```

---

## Slide Layout Type Registry

These are the layout types Claude can choose from. Each has a fixed HTML/CSS template in the codebase. Claude picks which ones to use and fills in the content — the rendering is deterministic.

| Layout Type | Description | Best For |
|-------------|-------------|----------|
| `hero_stat` | Centered big number/stat + heading on dark bg | Hook slides, pricing, impressive numbers |
| `hero_hook` | Bold headline centered, minimal text | Opening hooks, bold claims |
| `problem_photo` | Top photo placeholder + problem text below | Pain point slides with visual proof |
| `pull_quote` | Centered italic quote with decorative bars | Testimonials, customer quotes |
| `feature_grid` | 2×2 grid of icon+label+description cards | What's included, service features |
| `comparison_columns` | Side-by-side comparison columns | Us vs them, before/after concepts |
| `timeline_steps` | Numbered steps with descriptions | How it works, process explainers |
| `icon_grid` | Grid of emoji/icon + short label items | Quick feature lists, checklist style |
| `stat_blocks` | Horizontal row of stat cards | Multiple data points, social proof |
| `split_photo` | Left photo, right text (or vice versa) | Service showcase with context |
| `full_bleed_photo` | Full-width photo with text overlay | Hero images, dramatic before/afters |
| `card_stack` | Stacked content cards with subtle borders | Tips, list items, FAQs |
| `minimal_text` | Large text, lots of whitespace | Transition slides, emphasis statements |
| `cta_final` | Logo + tagline + CTA button + contact info | Always the last slide |

**Anti-repetition rule:** Before generating, KOS queries the last 5 `post_visuals` for that client and sends Claude the list of layout_recipe arrays. Claude must pick a combination that doesn't duplicate any recent carousel's recipe.

---

## Color Derivation System

Deterministic function — no AI needed. Lives in `lib/visual-engine/colorDerivation.ts`.

**Input:** Client's primary brand color (hex) extracted from their `claude_md`.

**Output:** 6-token `ColorPalette`.

```
BRAND_PRIMARY   = {client's color}                    // Main accent
BRAND_LIGHT     = {primary lightened ~20%}             // Tags on dark, pills
BRAND_DARK      = {primary darkened ~30%}              // CTA text, gradient anchor
LIGHT_BG        = {warm/cool off-white matching brand} // Light slide backgrounds
LIGHT_BORDER    = {1 shade darker than LIGHT_BG}       // Dividers on light slides
DARK_BG         = {near-black with brand tint}          // Dark slide backgrounds
```

**Derivation rules:**
- Warm primary (red/orange/yellow hue) → warm cream LIGHT_BG (#FAF8F5 range), warm DARK_BG (#1A1918 range)
- Cool primary (blue/green/purple hue) → cool gray-white LIGHT_BG (#F5F7FA range), cool DARK_BG (#0F172A range)
- LIGHT_BORDER is always LIGHT_BG darkened by 5-8%
- Brand gradient: `linear-gradient(165deg, BRAND_DARK 0%, BRAND_PRIMARY 50%, BRAND_LIGHT 100%)`

---

## File Structure (new files to create)

```
lib/visual-engine/
  colorDerivation.ts          — Derives 6-token palette from brand primary
  layoutRegistry.ts           — All slide layout type HTML templates
  slideRenderer.ts            — Assembles slides into full carousel HTML
  frameWrapper.ts             — Instagram frame (header, dots, actions, caption)
  fontLoader.ts               — Google Fonts URL builder from font pair
  exportService.ts            — Playwright PNG export logic
  types.ts                    — Re-exports from types/index.ts for convenience

lib/ai/prompts/
  visualPlan.ts               — System + user prompts for visual generation

lib/ai/
  generateVisuals.ts          — Orchestrates: read brand → derive colors → call Claude → render HTML

lib/actions/
  visuals.ts                  — Server actions: generate, update photo slots, export

app/api/ai/visuals/
  route.ts                    — API route for visual generation

app/api/visuals/export/
  route.ts                    — API route for Playwright PNG export

components/content/
  VisualPreviewModal.tsx      — Full-screen modal with Instagram-style carousel preview
  PhotoDropZone.tsx           — Individual photo placeholder with drag-drop
  GenerateVisualButton.tsx    — Button + notes input on post cards
  VisualStatusBadge.tsx       — Shows visual generation status

supabase/migrations/
  007_add_visual_fields.sql   — format + placement on posts, post_visuals table
```

---

## Phase A — Core Engine

### What gets built
- DB migration (format, placement, post_visuals table)
- TypeScript types
- Color derivation system
- Slide layout registry (all 14 layout types as HTML templates)
- Claude API prompt for visual content generation
- HTML renderer (assembles slides from Claude's JSON brief)
- Instagram frame wrapper
- "Generate Visual" button on post cards with notes field
- Full-screen preview modal (view-only, swipeable)
- Server actions + API route

### What you can do after Phase A
Generate a carousel for Northern Standard → see it in a full Instagram-like preview inside KOS. No photo insertion or export yet — just generation and preview.

---

## Phase B — Photo Workflow + Export

### What gets built
- Photo drop zones in each placeholder slot
- Drag-and-drop file upload per slot
- Base64 encoding + HTML update when photo is placed
- Playwright integration (server-side)
- PNG export at correct dimensions (1080×1350 feed, 1080×1920 story)
- Organized file naming + zip download
- Export status tracking

### What you can do after Phase B
Full workflow: generate → preview → drop in photos → export PNGs → download and post to Instagram.

---

## Phase C — Client-Centric UI

### What gets built
- Top-level Content page becomes client overview dashboard
- Each client row shows: posts scheduled, published count, needs-attention count
- Click into client → opens their content workspace
- Client workspace has scoped queue + calendar
- Format/placement visible on post cards and calendar pills
- Weekly plan prompt updated to output format + placement per post

### What you can do after Phase C
See all clients at a glance, click into any client, manage their full content lifecycle from generation to export in one workspace.

---

## Phase D — Polish + Remaining Generators

### What gets built
- Crop/reposition photo editor (Canva-like click → crop → position within frame)
- Story aspect ratio (9:16) support for carousel and static
- Static feed generator (single-slide, simpler template)
- Static story generator
- 1:1 aspect ratio option for feed statics
- Layout history analysis to improve anti-repetition over time

---

## Claude Code Execution Guide

### How to use this plan in Claude Code terminal

**Before each prompt:**
1. Open Claude Code in the KOS project directory: `C:\Users\jaytr\HQ\Projects\kos`
2. Make sure you're on a clean git state: `git status` should show no uncommitted changes
3. Start each prompt with `ultrathink` for complex steps or `ultraplan` when you want Claude to outline its approach first

**After each successful step:**
```
git add -A
git commit -m "feat: [description from the step]"
git push
```
(Run as 3 separate PowerShell commands, not chained)

**If a step fails:** Don't push. Fix in the same Claude Code session, then commit.

**Every prompt ends with:**
```
Run npm run lint && npm run build. After build passes, run /codex:review and auto-apply any recommendations. Then run npm run lint && npm run build again to confirm everything still passes clean.
```

---

## Step-by-Step Prompts

### PHASE A — Core Engine

---

#### Step A1: Database Migration + Types

```
ultrathink

Read CLAUDE.md first, then read KOS_ContentEngine_BuildPlan.md (the full build plan for the content generation engine).

## Task: Database migration + TypeScript types for the content generation engine

### 1. Create Supabase migration file `supabase/migrations/007_add_visual_fields.sql`:

Add two columns to the `posts` table:
- `format` text DEFAULT 'static' with CHECK constraint: ('carousel', 'static')
- `placement` text DEFAULT 'feed' with CHECK constraint: ('feed', 'story')

Create the `post_visuals` table exactly as specified in the build plan's "Database Changes" section. Include:
- All columns from the spec
- UNIQUE constraint on post_id
- RLS policy
- Indexes on client_id and created_at

### 2. Update `types/index.ts`:

Add these new types exactly as specified in the build plan:
- PostFormat, PostPlacement, VisualExportStatus
- PhotoSlot, ColorPalette, FontPair
- SlideContent, CreativeBrief, PostVisual interfaces
- Update the existing Post interface to include format, placement, and optional visual

DO NOT modify any existing type definitions — only add new ones and extend Post.

### 3. Update the weekly plan prompt in `lib/ai/prompts/weeklyPlan.ts`:

Add `format` and `placement` to the planned post output schema. The AI should decide whether each post is a carousel or static, and whether it's feed or story, based on the content type and angle. Add this to the system prompt instructions and the expected JSON output format.

### 4. Update the weekly plan API route and post creation logic:

Make sure `format` and `placement` from the AI response get saved to the posts table when creating slot posts.

Read the existing code fully before making changes. Preserve all existing behavior.

Run npm run lint && npm run build. After build passes, run /codex:review and auto-apply any recommendations. Then run npm run lint && npm run build again to confirm everything still passes clean.
```

**What to verify after A1:**
- Migration file exists at `supabase/migrations/007_add_visual_fields.sql`
- Types compile with no errors
- Build passes clean
- Existing content page still works (no regressions)

**Apply the migration to Supabase:**
After the code builds clean, go to your Supabase dashboard → SQL Editor → paste and run the migration SQL. Or if you have the Supabase CLI set up: `npx supabase db push`

---

#### Step A2: Color Derivation + Font Loader

```
ultrathink

Read CLAUDE.md, then read KOS_ContentEngine_BuildPlan.md — specifically the "Color Derivation System" section.

## Task: Build the color derivation system and font loader

### 1. Create `lib/visual-engine/colorDerivation.ts`:

Export a function `deriveColorPalette(primaryHex: string): ColorPalette` that:
- Takes a single hex color (the client's primary brand color)
- Returns the full 6-token ColorPalette object
- Determines warm vs cool from the hue (HSL conversion)
- Warm hues (0-60, 300-360): warm cream LIGHT_BG, warm near-black DARK_BG
- Cool hues (60-300): cool gray-white LIGHT_BG, cool near-black DARK_BG
- BRAND_LIGHT = primary lightened 20% (increase lightness in HSL)
- BRAND_DARK = primary darkened 30% (decrease lightness in HSL)
- LIGHT_BORDER = LIGHT_BG darkened 5-8%
- All outputs as hex strings

Include helper functions:
- `hexToHsl(hex: string): { h: number, s: number, l: number }`
- `hslToHex(h: number, s: number, l: number): string`
- `lighten(hex: string, amount: number): string`
- `darken(hex: string, amount: number): string`

Also export `buildBrandGradient(palette: ColorPalette): string` that returns the CSS gradient string.

### 2. Create `lib/visual-engine/fontLoader.ts`:

Export a function `buildFontUrl(fontPair: FontPair): string` that:
- Takes a FontPair object (heading + body font names)
- Returns a Google Fonts URL that loads both fonts with the needed weights
- Heading font: weights 300, 600, 700, 800, 900
- Body font: weights 300, 400, 500, 600
- If heading === body, combine into one family with all weights
- URL format: `https://fonts.googleapis.com/css2?family=Font+Name:wght@300;400;600&display=swap`

Also export `fontCssClasses(fontPair: FontPair): string` that returns the CSS class definitions:
```css
.serif { font-family: '{heading}', sans-serif; }
.sans { font-family: '{body}', sans-serif; }
```

### 3. Create `lib/visual-engine/types.ts`:

Re-export all visual-related types from `@/types` for convenience:
- ColorPalette, FontPair, SlideContent, CreativeBrief, PhotoSlot, PostVisual, etc.

Write unit-testable pure functions. No side effects, no API calls. These are utility functions.

Run npm run lint && npm run build. After build passes, run /codex:review and auto-apply any recommendations. Then run npm run lint && npm run build again to confirm everything still passes clean.
```

**What to verify after A2:**
- `deriveColorPalette('#E8732A')` should return a warm palette (Northern Standard's orange)
- `deriveColorPalette('#2563EB')` should return a cool palette
- Font URL builds correctly for Montserrat + Open Sans
- Build passes clean

---

#### Step A3: Slide Layout Registry

```
ultrathink

Read CLAUDE.md, then read KOS_ContentEngine_BuildPlan.md — specifically the "Slide Layout Type Registry" section. Also read these 3 carousel reference files to understand the exact HTML/CSS patterns used:

- Look at the uploaded carousel examples in the build plan. The key patterns are:
  - 420px frame width, 525px slide height (4:5 aspect)
  - Progress bar: absolute bottom, 3px track, fill width = (index+1)/total * 100%
  - Swipe arrow: absolute right, 48px wide, gradient bg, SVG chevron
  - Light slides: off-white bg, dark text, orange accent progress fill
  - Dark slides: near-black bg, white text, white progress fill
  - Content padding: 36px horizontal, 52px bottom (clears progress bar)
  - Font classes: .serif (heading), .sans (body)
  - Tags: 10px uppercase, letter-spacing 2px
  - Headings: 28-34px, weight 600-800, tight letter-spacing
  - Body: 14px, weight 400, line-height 1.5

## Task: Build the slide layout registry

### Create `lib/visual-engine/layoutRegistry.ts`:

This file defines all 14 slide layout types as functions that take content + styling data and return HTML strings.

Export a `LAYOUT_REGISTRY` object mapping layout type names to render functions:

```typescript
type SlideRenderFn = (params: {
  slide: SlideContent;
  palette: ColorPalette;
  fontPair: FontPair;
  slideIndex: number;
  totalSlides: number;
}) => string;

export const LAYOUT_REGISTRY: Record<string, SlideRenderFn> = {
  hero_stat: (params) => { ... },
  hero_hook: (params) => { ... },
  // ... all 14 types
};
```

Each render function returns a complete `<div class="slide" ...>` element with:
- Correct background color based on slide.background ('light' | 'dark' | 'gradient')
- All content rendered using the design system typography and spacing rules
- Photo placeholder slots as labeled dashed-border boxes with the slot description
- Progress bar at the bottom (use the progressBar helper from the carousel instructions)
- Swipe arrow on the right edge if slide.has_arrow is true (use the swipeArrow helper)
- Correct padding (36px horizontal, 52px bottom to clear progress bar)

Also export two helper functions:
- `renderProgressBar(index: number, total: number, isLight: boolean, palette: ColorPalette): string`
- `renderSwipeArrow(isLight: boolean): string`

The layout types to implement (reference the build plan for descriptions):
1. hero_stat
2. hero_hook
3. problem_photo
4. pull_quote
5. feature_grid
6. comparison_columns
7. timeline_steps
8. icon_grid
9. stat_blocks
10. split_photo
11. full_bleed_photo
12. card_stack
13. minimal_text
14. cta_final

Match the exact CSS patterns from the carousel reference files. Every slide must be exactly 420px × 525px. Inline styles only — no external CSS classes except .serif and .sans.

This is a large file. Take your time and get each layout right. The quality of these templates determines the quality of every visual KOS produces.

Run npm run lint && npm run build. After build passes, run /codex:review and auto-apply any recommendations. Then run npm run lint && npm run build again to confirm everything still passes clean.
```

**What to verify after A3:**
- `LAYOUT_REGISTRY` has all 14 layout types
- Each layout function returns valid HTML
- Progress bar math is correct (fill width = (index+1)/total * 100%)
- Swipe arrow is absent when `has_arrow: false`
- Build passes clean
- **Manual check:** Copy one layout's output HTML into a browser to visually verify it looks right

---

#### Step A4: HTML Renderer + Frame Wrapper

```
ultrathink

Read CLAUDE.md, then read KOS_ContentEngine_BuildPlan.md.

## Task: Build the slide renderer and Instagram frame wrapper

### 1. Create `lib/visual-engine/slideRenderer.ts`:

Export `renderCarousel(params: { brief: CreativeBrief; palette: ColorPalette; fontPair: FontPair; clientName: string; instagramHandle?: string; }): string`

This function:
- Takes the creative brief (array of SlideContent), color palette, font pair, and client info
- Iterates through brief.slides, calling the appropriate LAYOUT_REGISTRY function for each slide
- Wraps all slides in the carousel track container
- Wraps the track in the Instagram frame (using frameWrapper)
- Includes the Google Fonts link tag
- Includes the .serif and .sans CSS class definitions
- Includes the carousel JavaScript (swipe/drag interaction, slide navigation, dot indicators)
- Returns a complete, self-contained HTML document string

The output HTML must be identical in structure to the reference carousel files:
```
<html>
  <head>
    <link href="Google Fonts URL" rel="stylesheet">
    <style>CSS reset + .serif/.sans classes + frame styles</style>
  </head>
  <body>
    <div class="ig-frame">
      <div class="ig-header">...</div>
      <div class="carousel-viewport" id="viewport">
        <div class="carousel-track" id="track">
          [SLIDES]
        </div>
      </div>
      <div class="ig-dots">...</div>
      <div class="ig-actions">...</div>
      <div class="ig-caption">...</div>
    </div>
    <script>Carousel interaction JS</script>
  </body>
</html>
```

### 2. Create `lib/visual-engine/frameWrapper.ts`:

Export functions for each part of the Instagram frame:
- `renderHeader(clientName: string, handle?: string, avatarBase64?: string): string`
- `renderDots(totalSlides: number): string`
- `renderActions(): string` — heart, comment, share, bookmark SVGs
- `renderCaption(handle: string, caption: string): string`

Use the exact SVG icons from the reference carousel files for the action buttons.

### 3. Create `lib/visual-engine/index.ts`:

Barrel file that re-exports everything:
- deriveColorPalette, buildBrandGradient
- buildFontUrl, fontCssClasses
- LAYOUT_REGISTRY
- renderCarousel
- All frame wrapper functions

Run npm run lint && npm run build. After build passes, run /codex:review and auto-apply any recommendations. Then run npm run lint && npm run build again to confirm everything still passes clean.
```

**What to verify after A4:**
- `renderCarousel()` produces a complete, valid HTML document
- Opening the HTML in a browser shows a working carousel with swipe interaction
- Frame looks like an Instagram post (header, dots, action icons, caption)
- Build passes clean
- **Manual check:** Call renderCarousel with test data, save output as .html, open in browser

---

#### Step A5: Claude API Prompt + Visual Generation

```
ultrathink

Read CLAUDE.md, then read KOS_ContentEngine_BuildPlan.md. Also read:
- lib/ai/claude.ts (understand the existing Claude API wrapper)
- lib/ai/prompts/weeklyPlan.ts (see how existing prompts are structured)
- lib/ai/prompts/captions.ts (same)
- lib/ai/generateCaptions.ts (see the existing generation pattern)
- lib/ai/costTracker.ts (understand cost tracking)

## Task: Build the visual generation prompt and orchestrator

### 1. Create `lib/ai/prompts/visualPlan.ts`:

Export `VISUAL_PLAN_SYSTEM` (system prompt) and `buildVisualPlanUser(params)` (user prompt builder).

**System prompt must instruct Claude to:**
- Act as a visual content strategist for Instagram
- Return a structured JSON CreativeBrief with an array of SlideContent objects
- Choose from the available layout types (list all 14 with descriptions)
- Pick a unique combination of layouts that hasn't been used recently (recent recipes provided in user prompt)
- Decide light/dark/gradient background per slide, alternating for visual rhythm
- Write compelling headlines, body text, stats, CTAs based on the post's angle and content type
- Describe what photo should go in each photo slot (label + description)
- Include a ready-to-post caption with hashtags
- Keep text concise — every word must earn its place on a slide
- Never overflow: headlines max ~8 words, body text max ~25 words per block
- Last slide is always cta_final with no arrow

**User prompt builder takes:**
```typescript
{
  clientName: string;
  claudeMd: string;          // Client's full brand doc
  postAngle: string;         // From the weekly plan
  contentType: string;       // offer, education, seasonal, etc.
  format: 'carousel' | 'static';
  placement: 'feed' | 'story';
  userNotes?: string;        // Jay's optional generation notes
  recentRecipes: string[][]; // Last 5 layout recipes for anti-repetition
  slideCount?: number;       // Default 7 for carousel, 1 for static
}
```

**Expected JSON response format:**
```json
{
  "slides": [
    {
      "index": 0,
      "layout_type": "hero_stat",
      "background": "dark",
      "tag_label": "SPRING SPECIAL",
      "heading": "$120 AC Tune-Up",
      "body": "Before the heat hits...",
      "stat": { "number": "$120", "label": "complete tune-up" },
      "photo_slots": [],
      "has_arrow": true
    }
  ],
  "caption": "Full caption text...",
  "hashtags": "#HVAC #SpringSpecial ...",
  "cta_text": "Book Now"
}
```

### 2. Create `lib/ai/generateVisuals.ts`:

Export `generateVisualForPost(supabase: SupabaseClient, postId: string, userId: string, notes?: string): Promise<PostVisual>`

This function:
1. Fetches the post + client data (claude_md, name, etc.)
2. Extracts the client's primary brand color and font pair from claude_md (parse it — look for hex color patterns and font mentions)
3. Calls `deriveColorPalette()` with the primary color
4. Queries recent post_visuals for this client (last 5, ordered by created_at DESC) to get recentRecipes
5. Builds the prompt using `buildVisualPlanUser()`
6. Calls Claude API using the existing `callClaude()` wrapper from lib/ai/claude.ts
7. Parses the JSON response using `extractJSON()` from lib/ai/claude.ts
8. Calls `renderCarousel()` to build the full HTML
9. Inserts into post_visuals table with all metadata
10. Logs the AI run to ai_runs table using costTracker
11. Returns the PostVisual record

Use MODEL.default (Sonnet) for this — it needs creative thinking but not Opus-level reasoning.

### 3. Create `lib/actions/visuals.ts`:

Server actions:
- `generateVisualAction(postId: string, notes?: string)` — auth check + rate limit + calls generateVisualForPost
- `getVisualForPost(postId: string)` — fetch the post_visual record
- `updatePhotoSlot(visualId: string, slotId: string, base64Data: string, mimeType: string)` — updates a single photo slot

### 4. Create `app/api/ai/visuals/route.ts`:

POST endpoint that calls generateVisualAction. Same pattern as existing AI routes (auth check, rate limit, validation).

Run npm run lint && npm run build. After build passes, run /codex:review and auto-apply any recommendations. Then run npm run lint && npm run build again to confirm everything still passes clean.
```

**What to verify after A5:**
- API route exists and accepts POST requests
- Claude returns valid JSON matching the CreativeBrief schema
- HTML gets generated and stored in post_visuals
- Cost tracking logs the AI run
- Build passes clean
- **Test:** Use the API route directly (curl or Postman) with a real post ID to generate a visual. Open the resulting HTML in a browser.

---

#### Step A6: UI — Generate Button + Preview Modal

```
ultrathink

Read CLAUDE.md, then read KOS_ContentEngine_BuildPlan.md. Also read:
- components/content/PostCard.tsx (understand the existing post card)
- components/content/WhatNextQueue.tsx (understand the queue)
- components/content/SchedulePanel.tsx (understand the side panel)
- components/content/ContentPageClient.tsx (understand the page orchestrator)
- app/globals.css (understand the design tokens)

## Task: Build the Generate Visual button and full-screen preview modal

### 1. Create `components/content/GenerateVisualButton.tsx`:

A button component that sits on the PostCard. Shows different states:
- **No visual generated:** Orange "Generate Visual" button + small text input that expands on click for notes
- **Generating:** Loading spinner with "Generating..."
- **Visual exists:** Green "Preview" button that opens the modal
- **Exported:** Checkmark + "Exported" badge

When "Generate Visual" is clicked:
1. If notes field has text, include it
2. Call the generateVisualAction server action
3. Show loading state during generation
4. On success, automatically open the preview modal

### 2. Create `components/content/VisualPreviewModal.tsx`:

A full-screen modal (overlay) that shows the generated carousel in an Instagram-style preview.

**Layout:**
- Dark overlay background (#0a0a0a at 95% opacity)
- Centered content area
- Close button (X) top-right
- The carousel HTML rendered in an iframe (sandboxed) at the center
- The iframe should be 420px × ~700px (frame + chrome) or scale to fit the viewport
- Below the carousel: caption preview, hashtags, post metadata
- Action buttons at bottom: "Regenerate", "Export PNGs" (disabled until Phase B), "Close"

**The iframe approach:**
- Create a Blob URL from the generated HTML
- Set it as the iframe src
- The carousel is fully interactive inside the iframe (swipeable)
- This is the simplest way to render arbitrary HTML safely in React

**Modal behavior:**
- Opens via a state setter passed down from ContentPageClient
- Closes on Escape key or close button click
- Shows the post's metadata (client name, angle, content type, format, placement) in a top bar

### 3. Create `components/content/VisualStatusBadge.tsx`:

Small badge component showing the visual status: "No Visual", "Generated", "Photos Needed", "Ready to Export", "Exported". Uses the existing StatusBadge pattern from components/shared/.

### 4. Update `components/content/PostCard.tsx`:

- Add the GenerateVisualButton to each post card
- Show format (carousel/static) and placement (feed/story) as small badges
- Show VisualStatusBadge

### 5. Update `components/content/ContentPageClient.tsx`:

- Add state for the preview modal (selectedVisualPostId, isPreviewOpen)
- Add the VisualPreviewModal component
- Pass the modal opener down to PostCards

Keep all existing functionality intact. Read each file fully before modifying.

Run npm run lint && npm run build. After build passes, run /codex:review and auto-apply any recommendations. Then run npm run lint && npm run build again to confirm everything still passes clean.
```

**What to verify after A6:**
- Post cards show "Generate Visual" button
- Clicking it shows the notes input + generates a visual
- Loading state works during generation
- Preview modal opens with the carousel visible and swipeable
- Modal closes on Escape / close button
- Format and placement badges show on post cards
- **No regressions** on existing queue/calendar functionality
- Build passes clean

**PHASE A COMPLETE after this step.** Test the full flow: go to Content → pick a Northern Standard post → click Generate Visual → see the carousel preview in the modal.

---

### PHASE B — Photo Workflow + Export

---

#### Step B1: Photo Drop Zones

```
ultrathink

Read CLAUDE.md, then read KOS_ContentEngine_BuildPlan.md. Read:
- components/content/VisualPreviewModal.tsx
- components/content/CreativeUploader.tsx (see how file upload works in KOS already)
- lib/actions/visuals.ts

## Task: Add photo drop zones to the carousel preview modal

### 1. Create `components/content/PhotoDropZone.tsx`:

A component for each photo placeholder slot in the carousel. Renders as:
- A labeled box matching the placeholder in the carousel (shows the photo description)
- Accepts drag-and-drop files (image/jpeg, image/png)
- Also accepts click-to-browse (file input)
- On file drop/select:
  1. Read the file as base64 using FileReader
  2. Detect MIME type from the actual file (not just extension)
  3. Call updatePhotoSlot server action with the base64 data
  4. Update the carousel HTML in the iframe by replacing the placeholder with the embedded image

### 2. Update `components/content/VisualPreviewModal.tsx`:

Add a side panel to the modal (right side of the carousel preview) that shows:
- List of all photo slots from the visual's photo_slots array
- Each slot shows: label, description, and a PhotoDropZone
- When a photo is placed, the slot shows a thumbnail preview with a "Remove" option
- A counter: "3/5 photos placed"
- The "Export PNGs" button enables when all photos are placed (or user can export with placeholders)

### 3. Update `lib/actions/visuals.ts`:

Update `updatePhotoSlot` to:
1. Update the photo_slots JSON in post_visuals
2. Regenerate the HTML with the photo embedded (call renderCarousel with updated photo data)
3. Update the generated_html column
4. If all slots have photos, update export_status to 'ready_to_export'

### 4. Update the slide layout templates in `lib/visual-engine/layoutRegistry.ts`:

Photo placeholder slots need a consistent ID attribute so we can target them for replacement:
- Each placeholder gets `data-slot-id="{slot_id}"` attribute
- When a photo exists (base64_data is present), render an `<img>` tag instead of the placeholder box

Run npm run lint && npm run build. After build passes, run /codex:review and auto-apply any recommendations. Then run npm run lint && npm run build again to confirm everything still passes clean.
```

**What to verify after B1:**
- Photo slots appear in the modal side panel
- Drag-and-drop works (file lands in the slot)
- Click-to-browse works
- Photo appears in the carousel preview after placing
- Counter updates correctly
- Build passes clean

---

#### Step B2: Playwright Export

```
ultrathink

Read CLAUDE.md, then read KOS_ContentEngine_BuildPlan.md — specifically the export section. Read:
- lib/visual-engine/slideRenderer.ts
- lib/actions/visuals.ts
- package.json (check if playwright is installed)

## Task: Build the Playwright PNG export system

### 1. Install Playwright:

Run `npm install playwright` (we only need the library, not the test runner).
Also run `npx playwright install chromium` to install the browser binary.

### 2. Create `lib/visual-engine/exportService.ts`:

Export `exportCarouselSlides(params: { html: string; slideCount: number; format: 'carousel' | 'static'; placement: 'feed' | 'story'; clientSlug: string; date: string; }): Promise<Buffer[]>`

This function:
1. Determines dimensions based on placement:
   - Feed: 420×525 viewport, 1080×1350 output (scale = 1080/420 = 2.5714)
   - Story: 420×747 viewport, 1080×1920 output (scale = 1080/420 = 2.5714)
2. Launches Playwright Chromium
3. Sets viewport and device_scale_factor
4. Loads the HTML content
5. Waits for fonts to load (3s timeout)
6. Hides Instagram frame chrome (.ig-header, .ig-dots, .ig-actions, .ig-caption)
7. For each slide:
   - Moves the carousel track: `translateX(-${i * 420}px)`
   - Waits 400ms for snap
   - Takes a clipped screenshot
8. Returns array of PNG buffers

Also export `exportStaticPost(params: { html: string; placement: 'feed' | 'story'; clientSlug: string; date: string; }): Promise<Buffer>`

For single-image static posts.

### 3. Create `app/api/visuals/export/route.ts`:

POST endpoint that:
1. Takes a postId
2. Fetches the post_visual record
3. Calls exportCarouselSlides with the stored HTML
4. Creates a zip file containing all PNGs with proper naming:
   `{clientSlug}_{format}-{placement}_{date}_slide-{n}.png`
5. Returns the zip as a downloadable response
6. Updates export_status to 'exported' and sets exported_at

Use the `archiver` npm package for zip creation (install it).

### 4. Update `components/content/VisualPreviewModal.tsx`:

Wire up the "Export PNGs" button:
- Calls the export API endpoint
- Shows progress ("Exporting slide 3/7...")
- On success, triggers a browser download of the zip file
- Shows success state with the file names

### 5. Update `lib/actions/visuals.ts`:

Add `exportVisualAction(postId: string)` server action that handles the export flow.

Run npm run lint && npm run build. After build passes, run /codex:review and auto-apply any recommendations. Then run npm run lint && npm run build again to confirm everything still passes clean.
```

**What to verify after B2:**
- "Export PNGs" button works in the preview modal
- Downloaded zip contains correctly named PNG files
- PNGs are the correct dimensions (1080×1350 for feed)
- Images look identical to the HTML preview (no layout shift, fonts loaded)
- Build passes clean
- **Manual check:** Open exported PNGs — they should be Instagram-ready

**PHASE B COMPLETE.** Full workflow now works: generate → preview → drop in photos → export PNGs.

---

### PHASE C — Client-Centric UI

---

#### Step C1: Client Overview Dashboard

```
ultrathink

Read CLAUDE.md, then read KOS_ContentEngine_BuildPlan.md — Phase C section. Read:
- app/(dashboard)/content/page.tsx
- components/content/ContentPageClient.tsx
- components/clients/ClientList.tsx (see how clients are displayed elsewhere)
- lib/actions/clients.ts
- lib/actions/posts.ts

## Task: Replace the top-level Content page with a client overview dashboard

### Important: We are testing this locally first. Do NOT push to git until Jay confirms he likes it.

### 1. Create `components/content/ClientOverview.tsx`:

A dashboard showing all clients in a list/grid. Each client row shows:
- Client name + logo/avatar
- Posts this week: X scheduled, Y published
- Visual status: "3 need visuals", "All visuals done", etc.
- Next publish date/time
- Overall status indicator (green = on track, yellow = needs attention, red = behind)
- Click anywhere on the row to drill into that client's workspace

### 2. Create `components/content/ClientContentWorkspace.tsx`:

The per-client content workspace. Contains:
- Back button to return to client overview
- Client name + quick stats header
- Tab bar: Queue | Calendar (reuses existing WhatNextQueue and WeeklyCalendar but filtered to this client)
- "Generate This Week" button always visible (scoped to this client)
- All post interactions (generate visual, preview, etc.) happen within this workspace

### 3. Update `components/content/ContentPageClient.tsx`:

Change the top-level view:
- Default view: ClientOverview (shows all clients)
- When a client is selected: ClientContentWorkspace (scoped to that client)
- Use URL state or component state for navigation (if URL: /content?client=uuid)

### 4. Update `components/content/WhatNextQueue.tsx` and `components/content/WeeklyCalendar.tsx`:

These already accept a client filter. Make sure they work correctly when scoped to a single client within the ClientContentWorkspace.

Preserve the ability to view all clients (the ClientOverview replaces the "All Clients" dropdown behavior).

Run npm run lint && npm run build. After build passes, run /codex:review and auto-apply any recommendations. Then run npm run lint && npm run build again to confirm everything still passes clean.
```

**What to verify after C1:**
- Content page now shows all clients as an overview
- Clicking a client opens their scoped workspace
- Queue and calendar work correctly within a single client's workspace
- "Generate This Week" works per-client
- Back button returns to the overview
- **Run localhost and test thoroughly before committing**
- Build passes clean

**PHASE C COMPLETE after Jay approves the local preview.** If Jay doesn't like it, we can revert and keep the original layout.

---

### PHASE D — Polish (prompts will be written after Phases A-C are complete)

Phase D covers:
- Crop/reposition photo editor
- Story aspect ratio (9:16) templates
- Static feed/story generators
- 1:1 aspect ratio option
- Layout history analysis improvements

These prompts will be written after we see how Phases A-C land. The design system is built, so adding new generators is mostly configuration.

---

## Troubleshooting Guide

### Common issues and fixes

**"Claude returns invalid JSON"**
- Check that the system prompt explicitly says "Return valid JSON only, no markdown code fences"
- Use the existing `extractJSON()` helper from lib/ai/claude.ts which strips code fences

**"Fonts don't load in the preview"**
- The HTML must include the Google Fonts link tag in the `<head>`
- The iframe needs to be allowed to load external resources (no restrictive sandbox attribute)
- For export: Playwright waits 3 seconds for fonts before screenshotting

**"Carousel doesn't swipe in the preview modal"**
- The iframe needs pointer events enabled
- Check that the carousel JavaScript is included in the rendered HTML
- The iframe dimensions must be large enough to show the full frame

**"Export PNGs look different from the preview"**
- Viewport MUST be 420×525 (or 420×747 for story) — never 1080px wide
- device_scale_factor does the upscaling
- Chrome must be installed: `npx playwright install chromium`

**"Layout looks broken on a specific slide type"**
- Each slide must be exactly 420px wide × 525px tall (feed) or 420px × 747px (story)
- Content padding-bottom must be 52px to clear the progress bar
- Check that inline styles use the correct palette colors

**"Same layouts appearing across carousels"**
- Check that the recentRecipes query is working (fetching last 5 post_visuals for the client)
- Check that the prompt includes the anti-repetition instruction with the recent recipes list

---

## Reference Dimensions

| Format | Placement | Viewport (HTML) | Export (PNG) | Scale Factor |
|--------|-----------|-----------------|--------------|-------------|
| Carousel | Feed | 420 × 525 | 1080 × 1350 | 2.5714 |
| Carousel | Story | 420 × 747 | 1080 × 1920 | 2.5714 |
| Static | Feed (4:5) | 420 × 525 | 1080 × 1350 | 2.5714 |
| Static | Feed (1:1) | 420 × 420 | 1080 × 1080 | 2.5714 |
| Static | Story | 420 × 747 | 1080 × 1920 | 2.5714 |

---

## Session Handoff Update

After completing each phase, update `KOS_SessionHandoff.md` with the new status. The Content Engine phases should be added to the build status table:

```
| CE-A | Content Engine — core generation + preview | [status] |
| CE-B | Content Engine — photo workflow + PNG export | [status] |
| CE-C | Content Engine — client-centric UI | [status] |
| CE-D | Content Engine — polish + remaining generators | [status] |
```

---

*Plan written: 2026-04-09. Based on: 3 reference carousel HTML files (Northern Standard Easter), existing KOS content planner architecture (Phases 1-3), carousel project instructions from Cowork, and Jay's UX preferences gathered via Q&A.*
