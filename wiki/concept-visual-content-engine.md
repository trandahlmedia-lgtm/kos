---
type: concept
track: KOS
created: 2026-04-10
updated: 2026-04-10
status: current
sources: [KOS_ContentEngine_Handoff_v5.md, KOS_ContentEngine_BuildPlan.md]
---

# Visual Content Engine

The system inside KOS that generates Instagram-ready visuals — carousels, static feed posts, story sequences, and static stories — automatically from a client's brand kit and post content.

## Content

### What It Does
Takes a post's content direction + a client's brand assets (colors, fonts, logos, IG handle) and produces ready-to-post visual content. The output is HTML rendered in an iframe, editable inline, with photo upload slots.

### Four Visual Formats
1. **Carousel** — Multi-slide (typically 5-10 slides), 1080x1350. Hero → content slides → CTA. Most common format.
2. **Static feed post** — Single image, 1080x1350. Two layout types + CTA footer bar.
3. **Story sequence** — Multi-slide, 1080x1920 (9:16). 10 layout types with story chrome.
4. **Static story** — Single image, 1080x1920. 6 layout patterns.

### Brand Kit Integration
- Multi-variant logo system: icon, wordmark dark, wordmark light, full — stored as JSONB on clients table
- Two-color extraction: primary + accent from brand doc
- Fonts pulled from brand kit (e.g., Montserrat headings + Open Sans body for Northern Standard)
- Instagram handle displayed in profile header

### User Workflow
1. Create post → select format (dropdown in New Post modal)
2. Generate visual (AI creates the content)
3. Preview in VisualPreviewModal (portaled to document.body for z-index)
4. Edit inline — toggle edit mode, click text to change it, click photo slots to upload
5. Save edits (postMessage sync between iframe and parent, saved to DB)
6. Regenerate if needed

### Key Technical Decisions
- Moved from template-based to direct HTML generation (see [[concept-direct-html-generation]])
- SchedulePanel explicitly selects columns to avoid fetching heavy `slide_html` JSONB
- DB migrations 011-014 added brand asset columns, brand_logos JSONB, format constraint, slide_html + generation_mode

## Connections

- [[concept-direct-html-generation]] — the generation architecture
- [[concept-new-post-wizard]] — the planned UX overhaul for post creation
- [[insight-kos-known-bugs]] — active issues in the visual engine

## Open Questions

- Playwright PNG export for downloadable assets — prioritized but not built
- Crop/reframe tool for uploaded photos — needed for photo-heavy posts
- Per-slide editing (change one carousel slide without regenerating all) — unlocked by direct mode but not yet implemented
