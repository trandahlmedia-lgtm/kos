---
type: concept
track: KOS
created: 2026-04-10
updated: 2026-04-10
status: current
sources: [KOS_ContentEngine_Handoff_v5.md, KOS_NewPostWizard_BuildPlan.md]
---

# New Post Wizard

Jay's vision for a step-by-step interactive post creation flow inside KOS. Replaces the current "fill out a form and hit create" pattern with a guided wizard that prevents content overlap and uses AI to recommend formats and angles.

## Content

### The Flow
1. **Select client** — only if in "All Clients" view. Skip if already in a client context.
2. **Calendar view** — shows ONLY the selected client's scheduled posts. User can see what's already going out so content doesn't overlap.
3. **Select day** — pick the target date for the new post.
4. **Content direction** — enter text for the angle/topic, OR have AI suggest an angle based on other scheduled content + brand doc.
5. **Format recommendation** — AI recommends format (feed vs story, carousel vs static) based on the angle. User confirms or overrides.
6. **Generate visual** — create the visual content.
7. **Generate caption** — once creative is done, generate the caption to match.

### Key Design Decisions
- Calendar shows selected client only (dashboard already shows all clients — no duplication)
- AI recommends format, user confirms (not fully auto, not fully manual — collaborative)
- Step-by-step wizard UX inside a modal, not a form dump
- This is a major UX overhaul — needs its own dedicated planning session on Opus, then build on Sonnet

### Status
Concept defined. Not built. Next major feature after the "Saving..." bug fix.

## Connections

- [[concept-visual-content-engine]] — the engine the wizard drives
- [[insight-kos-architecture-decisions]] — wizard requires careful UX planning to avoid overengineering

## Open Questions

- How does the angle suggestion system work at scale? Does it need a research agent running weekly?
- Should the wizard support batch creation (plan a whole week at once)?
- How does this interact with the existing "weekly plan" AI workflow?
