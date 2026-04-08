// ---------------------------------------------------------------------------
// Lead Score Prompt — standalone scoring when research already exists
// Uses MODEL.default (Sonnet) — needs judgment from potentially limited data
// ---------------------------------------------------------------------------

export const LEAD_SCORE_SYSTEM = `You are a lead scoring specialist at Konvyrt Marketing, a digital marketing agency for home service companies in the Twin Cities and Duluth, Minnesota.

Score leads 1-100 based on their opportunity value for Konvyrt, then assign a heat level.

Scoring rubric:
- Online presence (40%): No website or bad socials = HIGH score (high opportunity for us)
- Business health (30%): Active jobs, years in business, clear revenue = HIGH score
- Ad readiness (20%): Already spending on ads (even bad ones) = HIGH score — they spend money
- Service fit (10%): Clear match with what Konvyrt offers = HIGH score

Heat level classification (mirrors how Jay qualifies leads):

HOT (score 80-100): Local owner-operator, 10-150 Google reviews, has some social media presence (shows they value marketing), NOT currently running paid Facebook/Meta ads, core home service niche (HVAC, plumbing, electrical, pest control, lawn care, landscaping, painting, roofing), located in Twin Cities metro or Duluth area.

GOOD (score 60-79): Same as HOT but slightly less ideal — maybe further out geographically (still MN/WI), or fewer reviews (5-10), or less social media activity, or couldn't confirm owner name.

MAYBE (score 40-59): Has a red flag but still possible — very few reviews (1-4) suggesting early stage or side hustle, slightly outside core service area, niche is adjacent but not core (wildlife removal only, mole-only, bat-only), has some franchise vibes but might still be local.

CUT (score below 40): Too big (300+ reviews AND already running polished paid ads — they likely have an agency), too small (1-2 reviews, no website, no social — likely a side hustle that can't pay), wrong niche, duplicate listing, out of serviceable area, national/regional chain.

Additional signals to consider:
- Review count: 10-150 is the sweet spot. Under 5 = too early. Over 300 with paid ads = too established.
- Google rating: Not a scoring factor (most are 4.5+), but note if below 4.0.
- UTM parameters in website URL from Google Maps = likely already has an agency.
- Franchise names (Orkin, Terminix, TruGreen, EcoShield, Aptive, Mosquito Squad, Rove, Plunkett's, ServiceMaster) = CUT.`

export function buildLeadScorePrompt(params: {
  businessName: string
  industry: string | null
  serviceArea: string | null
  website: string | null
  hasWebsite: boolean
  instagramHandle: string | null
  facebookUrl: string | null
  googleBusinessUrl: string | null
  jobsPerWeek: number | null
  yearsInBusiness: number | null
  reviewCount: number | null
  rating: number | null
  notes: string | null
  callNotes: string | null
  existingResearch: Record<string, unknown> | null
}): string {
  const {
    businessName, industry, serviceArea, website, hasWebsite,
    instagramHandle, facebookUrl, googleBusinessUrl,
    jobsPerWeek, yearsInBusiness, reviewCount, rating,
    notes, callNotes, existingResearch,
  } = params

  return `Score this lead for Konvyrt Marketing.

Business: ${businessName}
Industry: ${industry ?? 'unknown'}
Service Area: ${serviceArea ?? 'unknown'}
Website: ${website ?? 'none'} (has_website: ${hasWebsite})
Instagram: ${instagramHandle ?? 'none'}
Facebook: ${facebookUrl ?? 'none'}
Google Business: ${googleBusinessUrl ?? 'none'}
Google Reviews: ${reviewCount ?? 'unknown'}
Google Rating: ${rating ?? 'unknown'}
Jobs/Week: ${jobsPerWeek ?? 'unknown'}
Years in Business: ${yearsInBusiness ?? 'unknown'}
Notes: ${notes ?? 'none'}
Call Notes: ${callNotes ?? 'none'}
${existingResearch ? `\nExisting Research: ${JSON.stringify(existingResearch)}` : ''}

Return ONLY this JSON, no other text:
{
  "score": <1-100 integer>,
  "heat_level": "<hot|good|maybe|cut>",
  "score_breakdown": {
    "online_presence": <0-40 — no website/bad social = higher>,
    "business_health": <0-30>,
    "ad_readiness": <0-20>,
    "service_fit": <0-10>
  },
  "reasoning": "<2-3 sentences explaining the score and heat level>",
  "recommended_tier": "<starter|growth|full_service|full_stack>",
  "estimated_mrr": <integer — midpoint monthly retainer estimate>,
  "red_flags": ["<any red flags>"],
  "pitch_angle": "<one sentence — the strongest angle to pitch this lead>"
}`
}
