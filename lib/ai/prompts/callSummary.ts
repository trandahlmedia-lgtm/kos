// ---------------------------------------------------------------------------
// Call Summary Prompt — structures raw call notes or pasted transcript
// Uses MODEL.fast (Haiku) — pattern-following structured extraction
// ---------------------------------------------------------------------------

export const CALL_SUMMARY_SYSTEM = `You are a sales assistant for Konvyrt Marketing, a digital marketing agency for home service companies.
Extract structured information from raw call notes or a call transcript.
Be concise and specific. Only include information that was actually mentioned — don't invent details.`

export function buildCallSummaryPrompt(rawNotes: string): string {
  return `Extract structured information from these call notes / transcript.

---
${rawNotes}
---

Return ONLY this JSON, no other text:
{
  "what_they_want": "<one sentence — what the business owner said they want or need>",
  "pain_points": ["<specific pain point mentioned>", ...],
  "current_situation": "<1-2 sentences — where they are today with marketing>",
  "objections": ["<objection raised>", ...],
  "next_steps": "<what was agreed as the next action>",
  "pricing_discussed": "<what pricing was mentioned, or null if not discussed>",
  "decision_timeline": "<when they said they'd decide, or null if not mentioned>",
  "overall_sentiment": "<hot|warm|cold>",
  "recommended_follow_up": "<specific recommended follow-up action for Jay/Dylan>"
}`
}
