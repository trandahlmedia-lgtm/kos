---
type: concept
track: KOS
created: 2026-04-10
updated: 2026-04-10
status: current
sources: [HYBRID_VISUAL_ENGINE_PLAN.md, KOS_ContentEngine_Handoff_v5.md]
---

# Direct HTML Generation Mode

The architecture decision to have Claude generate slide HTML directly instead of using pre-built layout templates. This was the single biggest quality leap in KOS's visual engine.

## Content

### The Problem with Templates
KOS originally used 14 pre-built carousel layout templates. Claude would generate a "visual plan" (JSON describing which template to use, what text goes where), and a renderer would fill in the template. This worked but was rigid — every carousel looked like a variation of the same 14 patterns. The output felt formulaic because it was.

### The Direct Mode Solution
Instead of picking from templates, Claude now generates the inner HTML for each slide directly. The renderer wraps Claude's HTML in Instagram chrome (progress bars, swipe arrows, logo placement, profile header), but the actual content layout is Claude's creative decision.

Three separate system prompts exist — one each for carousel, static feed, and story formats. Each prompt embeds the full design system (color palette, typography scale, component patterns, layout examples) as HTML examples that Claude can riff on. This gives Claude design system constraints without template rigidity.

### How It Works
1. `buildVisualPlanDirectUser()` constructs the prompt input — brand palette, fonts, logo URLs, post content
2. Claude generates an array of `{inner_html, speaker_notes}` objects (one per slide)
3. `renderCarouselDirect()` / `renderStaticDirect()` / `renderStorySequenceDirect()` / `renderStaticStoryDirect()` wraps each slide in format-specific chrome
4. Stored as `slide_html` JSONB on `post_visuals` table alongside `generated_html` (the full rendered output)

### Why This Matters
Template mode is now dead code. All 4 visual formats (carousel, static_feed, story_sequence, static_story) route through direct mode. The generate → tweak → save workflow is functional with inline text editing and photo upload.

## Connections

- [[concept-visual-content-engine]] — the broader system this lives inside
- [[hub:entity-claude-code]] — the AI doing the generation
- [[insight-kos-architecture-decisions]] — this was a pivotal architecture call

## Open Questions

- Should template mode be fully removed from the codebase, or kept as a fallback?
- How does direct mode perform with brands that have complex multi-color palettes?
- Could the design system prompts be auto-generated from a client's brand kit instead of being hardcoded?
