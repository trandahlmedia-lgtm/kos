# KOS AI Workflow: Client Intake Assistant

## Workflow Number: 9 (add to existing 8 workflows in Phase 3)

---

## PURPOSE

When Jay or Dylan adds a new client, they should only need to enter two things: **company name** and **website URL**. The Client Intake Assistant handles the rest — researching the business, pre-filling the client profile, recommending a tier and pricing, and generating the onboarding checklist.

---

## TRIGGER

User clicks "Add Client" and enters:
1. Company name
2. Website URL

Then clicks "Run Intake" (or similar CTA).

---

## WHAT THE AI DOES

### Step 1: Website Analysis
- Fetches and parses the client's website (using server-side fetch, not browser)
- Extracts: business name, services offered, service area, phone number, email, logo URL, any existing social links
- Identifies industry vertical (HVAC, plumbing, electrical, roofing, etc.)

### Step 2: Social Media Discovery
- Searches for existing Facebook page, Instagram profile, Google Business Profile
- Notes follower counts and last post date if findable
- Flags platforms that don't exist yet (opportunity for the agency)

### Step 3: Tier Recommendation
- Based on what it finds, recommends a tier:
  - **Starter ($X/mo):** New to social, no existing presence, needs foundation
  - **Growth ($X/mo):** Has some presence but inconsistent, needs strategy and volume
  - **Full Service ($X/mo):** Wants the full package — content, filming, ads readiness
- Provides a 2-3 sentence reasoning for the recommendation

### Step 4: Pre-fill Client Profile
- Auto-fills these fields in the new client form:
  - Company name (confirmed/cleaned up)
  - Industry vertical
  - Service area
  - Phone / email (if found)
  - Website URL
  - Social platform links (if found)
  - Recommended tier
  - Recommended monthly price
  - Primary producer (defaults to whoever is creating the client)

### Step 5: Generate Onboarding Checklist
- Based on the recommended tier (or whichever tier Jay/Dylan selects), auto-generates the correct onboarding checklist for that tier

---

## USER FLOW

1. Jay clicks "Add Client"
2. Enters company name + website URL
3. Clicks "Run Intake"
4. Loading state: "Researching [Company Name]..."
5. Results appear as a pre-filled form with AI's recommendations highlighted in accent color
6. Jay reviews, adjusts anything that's wrong, confirms
7. Client is created with all fields populated + onboarding checklist generated

---

## AI MODEL

- **Default:** claude-sonnet-4-6 (fast, cheap, good enough for web analysis)
- **Fallback:** If the website is complex or the AI isn't confident, surface a note: "Low confidence — review these fields manually"

---

## TECHNICAL NOTES

- Website fetching should be server-side (Next.js API route) to avoid CORS issues
- Cache the fetched website content so the AI isn't re-fetching on every retry
- If the website is unreachable, skip to manual entry: "Couldn't reach website — fill in manually"
- Social media discovery can use basic URL pattern matching — doesn't need a paid API
- Tier pricing should pull from a config table in Supabase, not be hardcoded, so Jay can update pricing without a code change

---

## PHASE

**Build in Phase 3** alongside the other 8 AI workflows. The client creation form from Phase 1 should be updated to include the "Run Intake" button and pre-fill flow.

---

## EDGE CASES

- **No website:** Skip web analysis, go straight to manual entry
- **Website is a template/placeholder:** Flag "This looks like a template site — recommendations may be less accurate"
- **Client already exists:** Check for duplicate by name or URL before creating
- **Social profiles found but unconfirmed:** Flag "Found an Instagram @[name] — confirm this belongs to the client before linking"

---

*Add this as Workflow #9 in KOS_MasterBuildPlan.md under Phase 3.*