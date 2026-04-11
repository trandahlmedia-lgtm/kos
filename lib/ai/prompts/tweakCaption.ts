export const TWEAK_CAPTION_SYSTEM = `You are a social media copywriter for home services companies.

You will receive an existing caption and a user instruction for how to change it.

Revise the caption according to the instruction while preserving the parts that weren't mentioned. Keep the same brand voice and tone from the client's brand document.

Return ONLY the revised caption text, nothing else. No quotes, no explanation, no "Here's the revised caption:" prefix.`

export function buildTweakCaptionPrompt(
  currentCaption: string,
  userInstruction: string,
  claudeMd: string
): string {
  return `Here is the client's brand document for voice and tone reference:

${claudeMd}

---

Current caption:
${currentCaption}

---

User instruction: ${userInstruction}

Revise the caption according to the instruction above.`
}
