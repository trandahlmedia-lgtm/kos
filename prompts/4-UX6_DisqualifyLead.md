ultrathink

Read CLAUDE.md first, then look at these files:
- types/index.ts (Lead, LeadStage, LeadHeatLevel, OutreachSequence, OutreachEmail types)
- components/leads/LeadDetailPanel.tsx (or wherever the lead detail / side panel lives)
- components/leads/LeadsPageClient.tsx (kanban + list view)
- lib/actions/leads.ts (updateLeadStage, deleteLead)
- lib/actions/outreach.ts (outreach sequence/email actions)
- supabase/migrations/005_outreach_engine.sql (email_opt_outs table)

## Task: Disqualify / Remove Dead Lead (4-UX6)

When Jay is working leads, he needs a fast way to kill a dead lead — wrong number, not interested, out of business, duplicate, etc. The lead should be removed from the active pipeline but kept in the database so it's never re-imported from a future CSV.

### 1. Add a "Disqualify" button to the lead detail panel

- Place it in the header area of the lead detail panel, secondary/destructive styling (not primary)
- Clicking it opens a small confirmation dialog (not a full modal — use a popover or compact dialog)
- Dialog asks for a reason — provide quick-select options:
  - "Not interested"
  - "Wrong number / bad contact"
  - "Out of business"
  - "Duplicate"
  - "Already has an agency"
  - "Other" (shows a text input)
- Confirm button: "Disqualify Lead"

### 2. What happens when disqualified

Server action `disqualifyLead(id: string, reason: string)` in `lib/actions/leads.ts`:

1. Set `stage` to `'lost'`
2. Set `lost_reason` to the selected reason
3. Set `heat_level` to `'cut'`
4. If the lead has an active outreach sequence (`status = 'active'`), set it to `'completed'`
5. Cancel any unsent outreach emails for this lead (`status = 'draft'` or `'queued'`) — set them to a cancelled state or delete them
6. Add the lead's email to `email_opt_outs` table (if email exists) so they're never emailed again
7. Log a `LeadActivity` with type `'stage_change'`, metadata including the disqualify reason
8. `revalidatePath('/leads')`

### 3. Visual treatment in kanban + list view

- Disqualified leads (stage = 'lost' + heat_level = 'cut') should be visually distinct — dimmed/muted opacity
- They should NOT appear in the default kanban view (kanban shows active pipeline only)
- In list view, they should be hidden by default but visible with a "Show disqualified" toggle or filter
- The lead record stays in the database permanently — this prevents re-import

### 4. CSV import de-duplication

- When importing leads via CSV, check incoming business names and emails against existing leads (including disqualified ones)
- If a match is found on a disqualified lead, skip it and show a count of "X leads skipped (previously disqualified)"
- Match on: exact email match OR fuzzy business name match (normalize: lowercase, trim, remove punctuation)

### 5. Undo / re-qualify

- In the lead detail panel for a disqualified lead, show a "Re-qualify" button
- Re-qualifying sets stage back to 'new', clears lost_reason, sets heat_level to null
- Removes the email from email_opt_outs
- Logs activity

### Design:
- Disqualify button: muted red/destructive styling, not prominent — this is a utility action
- Confirmation dialog: compact, dark aesthetic matching the rest of KOS
- Re-qualify button: subtle, secondary styling

Run npm run lint && npm run build. After build passes, run /codex:review and auto-apply any recommendations. Then run npm run lint && npm run build again to confirm everything still passes clean.
