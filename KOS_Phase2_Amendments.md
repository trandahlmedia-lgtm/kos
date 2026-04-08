# KOS — Phase 2 Amendments

## Drop this into the kos project folder. Claude Code should read this AFTER reading CLAUDE.md and KOS_MasterBuildPlan.md, BEFORE executing Phase 2.

---

## SUPABASE SCHEMA STATUS

Schema is confirmed ready for Phase 2. No migrations needed. Key tables in play:

- `posts` — main post records
- `media` — creative files linked to posts (separate table, not a column on posts)
- `captions` — caption options linked to posts (separate table; `selected_caption_id` on posts references the chosen one)

**Do not create duplicate columns for creative_url or caption_options on the posts table.** Use the existing `media` and `captions` tables.

---

## AMENDMENT 1: "WHAT'S NEXT" QUEUE AS DEFAULT VIEW

**Replaces:** Weekly calendar as the primary content entry point.

**New default view:** A task-style queue organized by client, showing posts grouped by what action they need:

1. **Needs Caption** — posts with no caption written yet
2. **Needs Creative** — posts with no media attached
3. **Ready to Publish** — posts with caption + creative + approved, ready to push to Meta (button disabled until Meta integration is built)
4. **Published This Week** — posts marked as published in the last 7 days (momentum tracker)

Each section shows post cards (compact — platform icon, content type, client name, scheduled date). Clicking a card opens the same slide-in side panel.

**Client filter dropdown** sits at the top: "All Clients" or select a specific client.

**Calendar toggle:** A tab or toggle at the top of the content page — "Queue" (default) | "Calendar". Calendar view remains as originally specced (weekly grid, colored status pills). Both views share the same data and side panel.

---

## AMENDMENT 2: CREATIVE UPLOAD — PHASE 2 SCOPE

**Replaces:** Creative upload + AI auto-match.

**Phase 2 behavior:** Manual upload only. User drags and drops (or clicks to upload) a file directly onto a specific post — either from the post card or from within the slide-in side panel. File uploads to the Supabase `kos-media` storage bucket. A row is created in the `media` table linking the file to that post. `has_creative` on the post is set to `true`.

**No AI auto-matching in Phase 2.** No suggestions for which post a creative belongs to. That becomes a Phase 3 AI workflow.

---

## AMENDMENT 3: CAPTION SELECTOR — PHASE 2 SCOPE

**Replaces:** 3 AI caption options + manual.

**Phase 2 behavior:** Manual caption entry only. The side panel shows a text area where Jay or Dylan types the caption directly. This writes to the `captions` table (creating one row) and sets `selected_caption_id` on the post.

**UI placeholder:** Above the manual text area, show 3 grayed-out cards labeled "AI Caption Option 1", "AI Caption Option 2", "AI Caption Option 3" with a subtle label: "AI captions — coming soon." These cards will become functional in Phase 3 when the AI caption workflow is built.

---

## AMENDMENT 4: "PUSH TO META" BUTTON — UI ONLY

**Add to the slide-in side panel:** A "Push to Meta" button positioned below the "Mark as Scheduled" action.

**Phase 2 behavior:** Button is visible but disabled (grayed out) with a tooltip: "Meta publishing — coming soon." No API integration in Phase 2.

**Future phase:** Meta Graph API integration will be built as an add-on after Phase 3. The Meta developer app and business verification process should be started independently in parallel (not part of any build phase — Jay handles this manually).

**When the integration is built, the button will:**
- Publish the post directly to the selected platform (Facebook page or Instagram) via Meta's Graph API
- Require `pages_manage_posts` and `instagram_content_publish` permissions
- Update the post status to "published" and set `published_at` timestamp
- The slide-in panel should be structured so this button can be wired up later without layout changes

---

## AMENDMENT 5: PHASE 1 BUG FIXES AND UX FIXES (APPLY BEFORE BUILDING PHASE 2)

These are fixes to existing Phase 1 functionality. **Apply ALL of these first before starting any Phase 2 components.**

### Client Creation 500 Error (CRITICAL — FIX FIRST)
POST to `/clients` returns a 500 Internal Server Error. The form submits but the server crashes. Error originates at `clients.ts:94`. Root cause: the `profiles` table RLS policy (`FOR SELECT USING (auth.uid() = id)`) means the page query only returns the current user's own profile — and if the `handle_new_user` trigger never fired for that user (created before migrations ran), there are zero profile rows, causing the `created_by: user.id` FK constraint to fail on insert. Fix: use `adminClient` to bypass RLS when querying and upserting profiles. **Test that client creation works end-to-end before proceeding.**

### Phone Number Auto-Formatting
All phone number input fields (client creation, lead forms, anywhere a phone number is entered) should auto-format as the user types. Raw input `6125551234` should display as `(612) 555-1234`. Store the raw digits in the database, format on display only. Use an input mask or formatter — do not require the user to type parentheses or dashes.

### Website URL Auto-Correction
The website URL field should not require `https://` from the user. If the user enters `northernstandardhvac.com` or `www.northernstandardhvac.com`, the app should automatically prepend `https://` before saving. Validation should only reject truly invalid input (empty string, gibberish), not a missing protocol. Display the cleaned URL back to the user after saving.

### Tier Selector Does Not Auto-Fill MRR (NEW)
When a tier is selected in the new client form, the Monthly MRR field should automatically populate with the default price for that tier. Confirmed Konvyrt pricing:
- Basic: $750/mo
- Starter Bundle: $1,750/mo
- Growth Bundle: $3,250/mo (field stays editable — range is $3,000–$3,500)
- Full Service: $3,000/mo (field stays editable — range is $2,500–$3,500)
- Website: no auto-fill
- Full Stack: blank, placeholder reads "Custom — quote per client"

The MRR field must remain fully editable after auto-fill — the auto-fill is a starting point, not a lock.

### Primary Producer Dropdown Has No Options (NEW)
The primary producer dropdown in the new client and edit client forms shows no options. Root cause: `supabase.from('profiles')` uses the anon key + user session, and the RLS policy restricts SELECT to the user's own profile only. Fix: use `adminClient` to fetch all profiles in server page components so both Jay and Dylan appear as options.

---

## AMENDMENT 6: CLIENT INTAKE ASSISTANT — PHASE 3 ADDITION

A new AI workflow (#9) has been specced separately. See `KOS_AIWorkflow_ClientIntakeAssistant.md` in the project folder. This does not affect Phase 2 — it is built in Phase 3 alongside the other AI workflows.

---

## UPDATED PHASE 2 BUILD CHECKLIST

For Claude Code reference — this is what Phase 2 now includes:

1. Post card component (platform, content type, status, creative thumbnail, caption preview, assigned-to, scheduled date)
2. "What's Next" queue view (default) — grouped by action needed, filtered by client
3. Weekly calendar grid view (secondary toggle) — 7 columns, colored status pills
4. Day view — full post cards in time order
5. Schedule side panel (slide-in) — creative preview, manual caption entry, copy caption button, copy hashtags button, "Mark as Scheduled" button, disabled "Push to Meta" button
6. Creative upload — manual drag-and-drop to specific post, uploads to Supabase storage, links in media table
7. Caption entry — manual text field with grayed-out AI placeholder cards
8. Client filter dropdown — single client or all clients
9. Queue/Calendar view toggle

---

*Created: April 2026. Applies to Phase 2 build only. Read alongside CLAUDE.md and KOS_MasterBuildPlan.md.*