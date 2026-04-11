---
type: insight
track: KOS
created: 2026-04-10
updated: 2026-04-10
status: current
sources: [KOS_ContentEngine_Handoff_v5.md]
---

# KOS Known Bugs & Patterns

Active bugs and recurring patterns that cause issues. Updated as bugs are found and fixed. When a bug is fixed, don't delete — move to a "Resolved" section with the fix description so the pattern is remembered.

## Content

### Active Bugs

**1. New Post modal stuck on "Saving..."**
- **Symptom:** After creating a post, closing the modal, and clicking "New Post" again, the button shows "Saving..." instead of "Create New Post." Requires page reload.
- **Root cause (suspected):** Modal form state (isSubmitting/isSaving) not resetting on close.
- **Fix approach:** Find New Post modal component, ensure all form state resets when modal closes.
- **Priority:** High — blocks basic workflow.
- **Estimated effort:** Haiku, 5 min.

**2. Orange color perception issue (cosmetic)**
- **Symptom:** Accent color `#E8732A` appears slightly different in CSS vs logo PNG.
- **Root cause:** Embedded color profile from Figma export. PNG has a non-sRGB profile.
- **Fix approach:** Re-export logos from Figma with "Export as sRGB" and no embedded profile.
- **Priority:** Low — cosmetic only, non-blocking.

### Patterns to Watch For

**Select `*` on tables with JSONB columns**
The SchedulePanel preview broke because a `SELECT *` was pulling the heavy `slide_html` JSONB column, which blocked the lighter `generated_html` from rendering. Fix was explicit column selection. **Rule: always explicitly select columns when a table has large JSONB fields.**

**Status dropdown values must match DB constraints**
The "Slot" option in SchedulePanel's status dropdown didn't match any valid DB value, causing posts to vanish. **Rule: dropdown options should be derived from the type definition or DB constraint, not hardcoded independently.**

**Modal state persistence across open/close**
React modals that use local state for form submission can retain stale state across open/close cycles. **Rule: reset ALL form state (including loading/submitting flags) in the modal's onClose handler or via a key prop that forces remount.**

## Connections

- [[concept-visual-content-engine]] — most bugs are in the visual pipeline
- [[insight-kos-architecture-decisions]] — the SELECT * pattern is an architecture lesson

## Open Questions

- Should KOS implement a global error boundary pattern with Sonner toasts for consistent error handling?
- Is there a way to auto-derive dropdown options from TypeScript types to prevent the status mismatch pattern?
