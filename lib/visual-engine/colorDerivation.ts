import type { ColorPalette } from '@/types'

// --- HSL helpers (pure, no dependencies) ---

export function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const clean = hex.replace('#', '')
  const r = parseInt(clean.substring(0, 2), 16) / 255
  const g = parseInt(clean.substring(2, 4), 16) / 255
  const b = parseInt(clean.substring(4, 6), 16) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2

  if (max === min) {
    return { h: 0, s: 0, l }
  }

  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)

  let h: number
  switch (max) {
    case r:
      h = ((g - b) / d + (g < b ? 6 : 0)) / 6
      break
    case g:
      h = ((b - r) / d + 2) / 6
      break
    default:
      h = ((r - g) / d + 4) / 6
      break
  }

  return { h: h * 360, s, l }
}

export function hslToHex(h: number, s: number, l: number): string {
  const hNorm = ((h % 360) + 360) % 360
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((hNorm / 60) % 2) - 1))
  const m = l - c / 2

  let r: number, g: number, b: number
  if (hNorm < 60) {
    ;[r, g, b] = [c, x, 0]
  } else if (hNorm < 120) {
    ;[r, g, b] = [x, c, 0]
  } else if (hNorm < 180) {
    ;[r, g, b] = [0, c, x]
  } else if (hNorm < 240) {
    ;[r, g, b] = [0, x, c]
  } else if (hNorm < 300) {
    ;[r, g, b] = [x, 0, c]
  } else {
    ;[r, g, b] = [c, 0, x]
  }

  const toHex = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, '0')

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

export function lighten(hex: string, amount: number): string {
  const { h, s, l } = hexToHsl(hex)
  return hslToHex(h, s, Math.min(1, l + amount / 100))
}

export function darken(hex: string, amount: number): string {
  const { h, s, l } = hexToHsl(hex)
  return hslToHex(h, s, Math.max(0, l - amount / 100))
}

// --- Warm vs cool hue detection ---

function isWarmHue(hue: number): boolean {
  // Warm: 0-60 (red → yellow) and 300-360 (magenta → red)
  return hue <= 60 || hue >= 300
}

// --- Main derivation function ---

export function deriveColorPalette(primaryHex: string, accentHex?: string): ColorPalette {
  const { h, s, l } = hexToHsl(primaryHex)
  const warm = isWarmHue(h)

  const light_bg = warm ? '#FAF8F5' : '#F5F7FA'
  const dark_bg = darken(primaryHex, 30)

  // If no accent provided, derive a complementary/warm accent automatically
  const brand_accent = accentHex ?? hslToHex((h + 180) % 360, Math.min(s + 0.15, 1), Math.max(l, 0.45))

  return {
    brand_primary: primaryHex,
    brand_accent,
    brand_light: lighten(primaryHex, 20),
    brand_dark: darken(primaryHex, 30),
    light_bg,
    light_border: darken(light_bg, 5),
    dark_bg,
  }
}

// --- Gradient builder ---

export function buildBrandGradient(palette: ColorPalette): string {
  return `linear-gradient(165deg, ${palette.brand_dark} 0%, ${palette.brand_primary} 50%, ${palette.brand_light} 100%)`
}
