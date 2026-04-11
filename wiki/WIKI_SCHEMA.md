# KOS Wiki — Sub-Wiki Schema

**Parent:** Jay's Brain (central hub at `C:\HQ\Jay's Brain\`)
**Location:** `C:\HQ\Projects\kos\wiki\`
**Track name:** KOS

---

## Purpose

Persistent knowledge base for the KOS (Konvyrt Operating System) project. Captures architecture decisions, feature designs, build lessons, bug post-mortems, UX patterns, and competitive insights — anything a future session needs to understand *why* something was built a certain way.

This is NOT a replacement for handoff docs or build plans. Those are disposable session artifacts. This wiki captures the lasting knowledge that compounds across sessions.

---

## What Belongs Here

- Architecture decisions and their reasoning
- Feature designs that explain intent, not just implementation
- Bug post-mortems — what broke, why, how it was fixed, what to watch for
- UX patterns discovered or adopted (from competitive research, user feedback, etc.)
- Competitive insights that directly shaped KOS features
- Build lessons — things that went wrong, things that saved time, patterns to reuse
- Integration notes — how KOS connects to Supabase, Vercel, Claude API, etc.

## What Does NOT Belong Here

- Code documentation (that lives in comments and the codebase)
- Temporary debugging notes
- Session-specific handoff state (that's what `KOS_ContentEngine_Handoff_v5.md` is for)
- Content that's already in the KOS `CLAUDE.md` (don't duplicate the file index, tech stack, etc.)

---

## Page Types, Format, and Operations

Follow the same conventions as the parent wiki (Jay's Brain). See `C:\HQ\Jay's Brain\CLAUDE.md` for:
- Page types: source, concept, entity, insight
- Page format: YAML frontmatter + Content + Connections + Open Questions
- Operations: INGEST, QUERY, LINT

The only difference: all pages here use `track: KOS` in frontmatter.

---

## Cross-Referencing

- KOS wiki pages can reference Jay's Brain hub pages: `[[hub:concept-agent-teams]]`
- Hub pages can reference KOS wiki pages: `[[kos:concept-direct-html-generation]]`
- When a KOS insight has broader implications (e.g., an architecture pattern Jay could reuse), create the page here AND add a cross-reference from the hub.
