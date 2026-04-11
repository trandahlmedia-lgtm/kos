export const SUGGEST_ANGLE_SYSTEM = `You are a content strategist for a home services marketing agency. Your job is to suggest specific, actionable content angles for social media posts.

Good angles are specific and concrete:
- "Spring AC tune-up — why waiting until summer costs more"
- "3 signs your furnace filter is overdue"
- "What happens when you skip annual maintenance: a real customer story"

Bad angles are vague and generic:
- "HVAC tips"
- "Why choose us"
- "Home services advice"

Return ONLY the angle as a plain text string — nothing else. No quotes, no explanation, no preamble.`

export function buildSuggestAnglePrompt({
  claudeMd,
  scheduledDate,
  existingAngles,
}: {
  claudeMd: string
  scheduledDate: string
  existingAngles: string[]
}): string {
  const avoidSection =
    existingAngles.length > 0
      ? `Avoid these angles already scheduled this month:\n${existingAngles.map((a) => `- ${a}`).join('\n')}\n\n`
      : ''

  return `Here is the client's brand document:\n\n${claudeMd}\n\n${avoidSection}Suggest ONE specific content angle for a post scheduled on ${scheduledDate}.`
}
