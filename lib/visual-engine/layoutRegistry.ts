import { buildBrandGradient, hexToRgbStr } from './colorDerivation'
import type { ColorPalette, FontPair, SlideContent, BrandLogos } from '@/types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SlideRenderFn = (params: {
  slide: SlideContent
  palette: ColorPalette
  fontPair: FontPair
  slideIndex: number
  totalSlides: number
  logoUrls?: BrandLogos
}) => string

// ---------------------------------------------------------------------------
// Shared helpers — match reference carousel CSS exactly
// ---------------------------------------------------------------------------

function isLightSlide(bg: SlideContent['background']): boolean {
  return bg === 'light'
}

function slideBg(bg: SlideContent['background'], palette: ColorPalette): string {
  if (bg === 'gradient') return buildBrandGradient(palette)
  return bg === 'light' ? palette.light_bg : palette.dark_bg
}

/** Primary heading text color — brand_dark on light, white on dark/gradient */
function textColor(bg: SlideContent['background'], palette: ColorPalette): string {
  return isLightSlide(bg) ? palette.dark_bg : '#FFFFFF'
}

/** Body text color — #666 on light, rgba white 0.6 on dark */
function secondaryText(bg: SlideContent['background']): string {
  return isLightSlide(bg) ? '#666666' : 'rgba(255,255,255,0.6)'
}

/** Escape HTML entities in user-provided content */
function esc(str: string | undefined): string {
  if (!str) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** Escape and convert newlines to <br/> for multi-line text blocks */
function formatText(str: string | undefined): string {
  return esc(str).replace(/\n/g, '<br/>')
}

// ---------------------------------------------------------------------------
// Progress bar — exact reference styling
// ---------------------------------------------------------------------------

export function renderProgressBar(
  index: number,
  total: number,
  isLight: boolean,
  palette: ColorPalette
): string {
  const safeTotal = Math.max(1, total)
  const safeIndex = Math.max(0, Math.min(index, safeTotal - 1))
  const pct = ((safeIndex + 1) / safeTotal) * 100
  const trackBg = isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.12)'
  const fillBg = isLight ? palette.brand_accent : '#ffffff'
  const counterColor = isLight ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.4)'

  return `<div style="position:absolute;bottom:0;left:0;right:0;padding:16px 28px 20px;z-index:10;display:flex;align-items:center;gap:10px;"><div style="flex:1;height:3px;background:${trackBg};border-radius:2px;overflow:hidden;"><div style="height:100%;width:${pct.toFixed(1)}%;background:${fillBg};border-radius:2px;"></div></div><span class="sans" style="font-size:11px;color:${counterColor};font-weight:500;">${safeIndex + 1}/${safeTotal}</span></div>`
}

// ---------------------------------------------------------------------------
// Swipe arrow — exact reference styling
// ---------------------------------------------------------------------------

export function renderSwipeArrow(isLight: boolean): string {
  const gradBg = isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)'
  const strokeColor = isLight ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.35)'

  return `<div style="position:absolute;right:0;top:0;bottom:0;width:48px;z-index:9;display:flex;align-items:center;justify-content:center;background:linear-gradient(to right,transparent,${gradBg});"><svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6" stroke="${strokeColor}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg></div>`
}

// ---------------------------------------------------------------------------
// Slide wrapper — uses .slide class defined in document CSS
// ---------------------------------------------------------------------------

function wrapSlide(
  innerHtml: string,
  params: {
    slide: SlideContent
    palette: ColorPalette
    slideIndex: number
    totalSlides: number
  }
): string {
  const { slide, palette, slideIndex, totalSlides } = params
  const light = isLightSlide(slide.background)
  const bgValue = slideBg(slide.background, palette)
  const bgProp = slide.background === 'gradient' ? 'background' : 'background'

  return `<div class="slide" style="${bgProp}:${bgValue};">
  ${innerHtml}
  ${slide.has_arrow ? renderSwipeArrow(light) : ''}
  ${renderProgressBar(slideIndex, totalSlides, light, palette)}
</div>`
}

// ---------------------------------------------------------------------------
// Static slide wrapper — no progress bar, no swipe arrow
// ---------------------------------------------------------------------------

function wrapStaticSlide(innerHtml: string, palette: ColorPalette): string {
  return `<div class="slide" style="background:${palette.dark_bg};">${innerHtml}</div>`
}

// ---------------------------------------------------------------------------
// Tag label — accent on light, accent_light on dark/gradient
// ---------------------------------------------------------------------------

function renderTag(
  label: string | undefined,
  bg: SlideContent['background'],
  palette: ColorPalette
): string {
  if (!label) return ''
  const tagColor = isLightSlide(bg) ? palette.brand_accent : palette.accent_light
  return `<span class="sans" style="display:inline-block;font-size:10px;font-weight:600;letter-spacing:2px;color:${tagColor};margin-bottom:14px;">${esc(label)}</span>`
}

/** Tag for gradient slides — uses rgba white */
function renderGradientTag(label: string | undefined): string {
  if (!label) return ''
  return `<span class="sans" style="display:inline-block;font-size:10px;font-weight:600;letter-spacing:2px;color:rgba(255,255,255,0.6);margin-bottom:14px;">${esc(label)}</span>`
}

// ---------------------------------------------------------------------------
// Logo rendering helpers
// ---------------------------------------------------------------------------

/** Pick the best logo URL for the given background */
function pickLogoUrl(
  placement: SlideContent['logo_placement'],
  bg: SlideContent['background'],
  logoUrls?: BrandLogos
): string | undefined {
  if (!placement || placement === 'none' || !logoUrls) return undefined

  if (placement === 'icon') return logoUrls.icon
  if (placement === 'wordmark') {
    return isLightSlide(bg) ? (logoUrls.wordmark_dark ?? logoUrls.full) : (logoUrls.wordmark_light ?? logoUrls.full)
  }
  // "full" — prefer full, fall back to wordmark variant
  if (logoUrls.full) return logoUrls.full
  return isLightSlide(bg) ? logoUrls.wordmark_dark : logoUrls.wordmark_light
}

/** Render a full/wordmark logo centered above content */
function renderLogo(
  placement: SlideContent['logo_placement'],
  bg: SlideContent['background'],
  logoUrls: BrandLogos | undefined,
  maxHeight: number,
  maxWidth: number
): string {
  const url = pickLogoUrl(placement, bg, logoUrls)
  if (!url) return ''
  return `<div style="display:flex;justify-content:center;margin-bottom:18px;"><img src="${esc(url)}" style="max-height:${maxHeight}px;max-width:${maxWidth}px;object-fit:contain;filter:drop-shadow(0 2px 12px rgba(255,255,255,0.15)) drop-shadow(0 0 20px rgba(255,255,255,0.08));" alt=""></div>`
}

/** Render an icon watermark (very low opacity, centered, behind content) */
function renderIconWatermark(
  placement: SlideContent['logo_placement'],
  logoUrls: BrandLogos | undefined
): string {
  if (placement !== 'icon' || !logoUrls?.icon) return ''
  return `<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);opacity:0.05;z-index:0;pointer-events:none;"><img src="${esc(logoUrls.icon)}" style="max-height:200px;max-width:200px;object-fit:contain;" alt=""></div>`
}

// ---------------------------------------------------------------------------
// Static post helpers — logo top-right, CTA footer bar, full-zone photo slot
// ---------------------------------------------------------------------------

/** Logo lockup top-right with glow — for static post layouts */
function renderLogoTopRight(logoUrls: BrandLogos | undefined): string {
  const url = logoUrls?.full ?? logoUrls?.wordmark_light
  if (!url) return ''
  return `<img src="${esc(url)}" style="position:absolute;top:16px;right:16px;height:44px;max-width:140px;object-fit:contain;z-index:10;filter:drop-shadow(0 0 8px rgba(255,255,255,0.5)) drop-shadow(0 0 16px rgba(255,255,255,0.25));" alt="">`
}

/** CTA footer bar — full-width, 48px, accent bg, cta text left + phone number right */
function renderCtaFooter(
  cta: SlideContent['cta'],
  palette: ColorPalette
): string {
  const ctaText = cta?.text ?? 'Call Today'
  const phone = cta?.subtitle ?? ''
  return `<div style="height:48px;background:${palette.brand_accent};display:flex;justify-content:space-between;align-items:center;padding:0 28px;flex-shrink:0;"><span class="sans" style="font-size:11px;font-weight:700;color:#FFFFFF;letter-spacing:0.5px;text-transform:uppercase;">${esc(ctaText)}</span>${phone ? `<span class="sans" style="font-size:13px;font-weight:700;color:#FFFFFF;">${esc(phone)}</span>` : ''}</div>`
}

/** Full-zone photo placeholder for static layouts — fills its positioned container, no border-radius */
function renderStaticPhotoZone(slot: { slot_id: string; label: string }): string {
  return `<div data-slot-id="${esc(slot.slot_id)}" style="position:absolute;inset:0;background:rgba(255,255,255,0.04);border:2px dashed rgba(255,255,255,0.12);display:flex;align-items:center;justify-content:center;"><span class="sans" style="font-size:11px;color:rgba(255,255,255,0.25);letter-spacing:0.5px;text-align:center;padding:0 20px;">📷 ${esc(slot.label).toUpperCase()}</span></div>`
}

// ---------------------------------------------------------------------------
// Photo placeholder — matches reference exactly
// ---------------------------------------------------------------------------

function renderPhotoSlot(
  slot: { slot_id: string; label: string },
  width: string,
  height: string,
  bg: SlideContent['background']
): string {
  const light = isLightSlide(bg)
  const borderColor = light ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.12)'
  const labelColor = light ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.25)'
  const bgColor = light ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.04)'

  return `<div data-slot-id="${esc(slot.slot_id)}" style="width:${width};height:${height};background:${bgColor};border:2px dashed ${borderColor};border-radius:12px;display:flex;align-items:center;justify-content:center;"><span class="sans" style="font-size:11px;color:${labelColor};letter-spacing:0.5px;text-align:center;padding:0 20px;">📷 ${esc(slot.label).toUpperCase()}</span></div>`
}

// ---------------------------------------------------------------------------
// 1. hero_stat — big stat number + heading (reference carousel 1 slide 1)
// ---------------------------------------------------------------------------

const heroStat: SlideRenderFn = ({ slide, palette, slideIndex, totalSlides, logoUrls }) => {
  const light = isLightSlide(slide.background)
  const heading = textColor(slide.background, palette)
  const statNum = slide.stat?.number ?? ''
  const statLabel = slide.stat?.label ?? ''
  const statColor = palette.brand_accent

  const inner = `<div style="padding:36px 36px 52px;display:flex;flex-direction:column;justify-content:center;align-items:center;height:100%;text-align:center;position:relative;">
    ${renderIconWatermark(slide.logo_placement, logoUrls)}
    ${renderLogo(slide.logo_placement === 'full' ? 'full' : undefined, slide.background, logoUrls, 60, 200)}
    ${slide.background === 'gradient' ? renderGradientTag(slide.tag_label) : renderTag(slide.tag_label, slide.background, palette)}
    <div class="serif" style="font-size:80px;font-weight:900;color:${statColor};line-height:0.9;letter-spacing:-3px;">${esc(statNum)}</div>
    ${statLabel ? `<div class="sans" style="font-size:15px;color:${light ? '#aaaaaa' : 'rgba(255,255,255,0.35)'};text-decoration:line-through;margin:8px 0 20px;">${esc(statLabel)}</div>` : ''}
    <h1 class="serif" style="font-size:22px;font-weight:700;color:${heading};line-height:1.15;letter-spacing:-0.3px;">${esc(slide.heading)}</h1>
    ${slide.body ? `<p class="sans" style="font-size:13px;color:${light ? '#888' : 'rgba(255,255,255,0.45)'};margin-top:8px;">${formatText(slide.body)}</p>` : ''}
  </div>`

  return wrapSlide(inner, { slide, palette, slideIndex, totalSlides })
}

// ---------------------------------------------------------------------------
// 2. hero_hook — bold headline with tag (reference carousel 2 slide 1)
// ---------------------------------------------------------------------------

const heroHook: SlideRenderFn = ({ slide, palette, slideIndex, totalSlides, logoUrls }) => {
  const heading = textColor(slide.background, palette)

  const inner = `<div style="padding:48px 36px 52px;display:flex;flex-direction:column;justify-content:flex-start;height:100%;position:relative;">
    ${renderIconWatermark(slide.logo_placement, logoUrls)}
    ${renderLogo(slide.logo_placement === 'full' ? 'full' : undefined, slide.background, logoUrls, 60, 200)}
    ${slide.background === 'gradient' ? renderGradientTag(slide.tag_label) : renderTag(slide.tag_label, slide.background, palette)}
    <h1 class="serif" style="font-size:34px;font-weight:900;color:${heading};line-height:1.05;letter-spacing:-0.5px;">${esc(slide.heading)}</h1>
    ${slide.body ? `<div style="margin-top:auto;padding-bottom:20px;"><p class="sans" style="font-size:13px;color:${isLightSlide(slide.background) ? '#888' : 'rgba(255,255,255,0.4)'};">${formatText(slide.body)}</p></div>` : ''}
  </div>`

  return wrapSlide(inner, { slide, palette, slideIndex, totalSlides })
}

// ---------------------------------------------------------------------------
// 3. problem_photo — photo top, text bottom (reference carousel 1 slide 2)
// ---------------------------------------------------------------------------

const problemPhoto: SlideRenderFn = ({ slide, palette, slideIndex, totalSlides, logoUrls }) => {
  const light = isLightSlide(slide.background)
  const heading = textColor(slide.background, palette)
  const body = light ? '#666666' : 'rgba(255,255,255,0.6)'
  const slot = slide.photo_slots?.[0] ?? { slot_id: 'photo-0', label: 'Photo' }

  const inner = `<div style="height:100%;display:flex;flex-direction:column;position:relative;">
    ${renderIconWatermark(slide.logo_placement, logoUrls)}
    <div style="flex:1;padding:24px 36px 0;display:flex;align-items:center;justify-content:center;">
      ${renderPhotoSlot(slot, '100%', '200px', slide.background)}
    </div>
    <div style="padding:20px 36px 52px;">
      ${slide.background === 'gradient' ? renderGradientTag(slide.tag_label) : renderTag(slide.tag_label, slide.background, palette)}
      <h2 class="serif" style="font-size:22px;font-weight:800;color:${heading};line-height:1.1;margin-bottom:10px;">${esc(slide.heading)}</h2>
      ${slide.body ? `<p class="sans" style="font-size:13px;color:${body};line-height:1.5;">${formatText(slide.body)}</p>` : ''}
    </div>
  </div>`

  return wrapSlide(inner, { slide, palette, slideIndex, totalSlides })
}

// ---------------------------------------------------------------------------
// 4. pull_quote — centered italic quote with accent bars (reference carousel 1 slide 3)
// ---------------------------------------------------------------------------

const pullQuote: SlideRenderFn = ({ slide, palette, slideIndex, totalSlides, logoUrls }) => {
  const quoteText = slide.quote ?? slide.heading
  const barColor = palette.brand_accent

  const inner = `<div style="padding:36px 44px 52px;display:flex;flex-direction:column;justify-content:center;align-items:center;height:100%;text-align:center;position:relative;">
    ${renderIconWatermark(slide.logo_placement, logoUrls)}
    <div style="width:40px;height:3px;background:${barColor};border-radius:2px;margin-bottom:28px;"></div>
    <p class="sans" style="font-size:20px;font-style:italic;color:#FFFFFF;line-height:1.45;font-weight:300;">&ldquo;${esc(quoteText)}&rdquo;</p>
    <div style="width:40px;height:3px;background:${barColor};border-radius:2px;margin-top:28px;"></div>
  </div>`

  return wrapSlide(inner, { slide, palette, slideIndex, totalSlides })
}

// ---------------------------------------------------------------------------
// 5. feature_grid — 2×2 card grid (reference carousel 1 slide 4)
// ---------------------------------------------------------------------------

const featureGrid: SlideRenderFn = ({ slide, palette, slideIndex, totalSlides, logoUrls }) => {
  const light = isLightSlide(slide.background)
  const heading = textColor(slide.background, palette)
  const features = slide.features ?? []

  // Card styling varies by background
  const cardBg = light ? '#FFFFFF' : 'rgba(255,255,255,0.04)'
  const cardBorder = light ? palette.light_border : 'rgba(255,255,255,0.06)'
  const cardHeadingColor = light ? palette.dark_bg : '#FFFFFF'
  const cardDescColor = light ? '#888888' : 'rgba(255,255,255,0.5)'

  const cards = features.slice(0, 4).map((f) =>
    `<div style="background:${cardBg};border-radius:12px;padding:16px 14px;border:1px solid ${cardBorder};">
        <div style="font-size:22px;margin-bottom:8px;">${esc(f.icon)}</div>
        <div class="serif" style="font-size:12px;font-weight:700;color:${cardHeadingColor};margin-bottom:4px;">${esc(f.label)}</div>
        <div class="sans" style="font-size:11px;color:${cardDescColor};line-height:1.4;">${esc(f.description)}</div>
      </div>`
  ).join('')

  const inner = `<div style="padding:32px 28px 52px;display:flex;flex-direction:column;justify-content:center;height:100%;position:relative;">
    ${renderIconWatermark(slide.logo_placement, logoUrls)}
    ${slide.background === 'gradient' ? renderGradientTag(slide.tag_label) : renderTag(slide.tag_label, slide.background, palette)}
    <h2 class="serif" style="font-size:22px;font-weight:800;color:${heading};line-height:1.1;margin-bottom:18px;">${esc(slide.heading)}</h2>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
      ${cards}
    </div>
  </div>`

  return wrapSlide(inner, { slide, palette, slideIndex, totalSlides })
}

// ---------------------------------------------------------------------------
// 6. comparison_columns — side-by-side comparison cards (reference carousel 1 slide 5)
// ---------------------------------------------------------------------------

const comparisonColumns: SlideRenderFn = ({ slide, palette, slideIndex, totalSlides, logoUrls }) => {
  const left = slide.comparison?.left ?? { label: 'Before', items: [] }
  const right = slide.comparison?.right ?? { label: 'After', items: [] }
  const heading = textColor(slide.background, palette)
  const light = isLightSlide(slide.background)

  // Left column — neutral/dimmed
  const leftBg = light ? '#FFFFFF' : 'rgba(255,255,255,0.04)'
  const leftBorder = light ? palette.light_border : 'rgba(255,255,255,0.06)'
  const leftHeaderColor = light ? '#888888' : 'rgba(255,255,255,0.3)'
  const leftItemColor = light ? '#888888' : 'rgba(255,255,255,0.35)'

  // Right column — accent-tinted
  const rightBg = light ? `rgba(232,115,42,0.06)` : `rgba(232,115,42,0.08)`
  const rightBorder = light ? `rgba(232,115,42,0.15)` : `rgba(232,115,42,0.2)`
  const rightHeaderColor = palette.brand_accent
  const rightItemColor = light ? '#666666' : 'rgba(255,255,255,0.7)'

  function renderItems(items: string[], color: string): string {
    return items.map((item) =>
      `<div class="sans" style="font-size:11px;color:${color};padding:4px 0;">${esc(item)}</div>`
    ).join('')
  }

  const leftHtml = `<div style="flex:1;background:${leftBg};border-radius:12px;padding:18px 14px;border:1px solid ${leftBorder};">
      <div class="serif" style="font-size:10px;font-weight:700;letter-spacing:1.5px;color:${leftHeaderColor};margin-bottom:14px;">${esc(left.label).toUpperCase()}</div>
      <div style="display:flex;flex-direction:column;gap:8px;">${renderItems(left.items, leftItemColor)}</div>
    </div>`

  const rightHtml = `<div style="flex:1;background:${rightBg};border-radius:12px;padding:18px 14px;border:1px solid ${rightBorder};">
      <div class="serif" style="font-size:10px;font-weight:700;letter-spacing:1.5px;color:${rightHeaderColor};margin-bottom:14px;">${esc(right.label).toUpperCase()}</div>
      <div style="display:flex;flex-direction:column;gap:8px;">${renderItems(right.items, rightItemColor)}</div>
    </div>`

  const inner = `<div style="padding:32px 28px 52px;display:flex;flex-direction:column;justify-content:center;height:100%;position:relative;">
    ${renderIconWatermark(slide.logo_placement, logoUrls)}
    ${slide.background === 'gradient' ? renderGradientTag(slide.tag_label) : renderTag(slide.tag_label, slide.background, palette)}
    <h2 class="serif" style="font-size:22px;font-weight:800;color:${heading};line-height:1.1;margin-bottom:24px;">${esc(slide.heading)}</h2>
    <div style="display:flex;gap:12px;margin-top:4px;">
      ${leftHtml}${rightHtml}
    </div>
  </div>`

  return wrapSlide(inner, { slide, palette, slideIndex, totalSlides })
}

// ---------------------------------------------------------------------------
// 7. timeline_steps — vertical timeline with dots (reference carousel 3 slide 4)
// ---------------------------------------------------------------------------

const timelineSteps: SlideRenderFn = ({ slide, palette, slideIndex, totalSlides, logoUrls }) => {
  const light = isLightSlide(slide.background)
  const heading = textColor(slide.background, palette)
  const stepTitleColor = light ? palette.dark_bg : '#FFFFFF'
  const stepDescColor = light ? '#888888' : 'rgba(255,255,255,0.5)'
  const lineColor = light ? palette.light_border : 'rgba(255,255,255,0.1)'
  const dotColor = palette.brand_accent
  const dotBorderColor = light ? palette.light_bg : palette.dark_bg
  const steps = slide.steps ?? []

  const stepsHtml = steps.map((step, i) => {
    const isLast = i === steps.length - 1
    return `<div style="position:relative;${isLast ? '' : 'margin-bottom:20px;'}">
        <div style="position:absolute;left:-24px;top:4px;width:16px;height:16px;border-radius:50%;background:${dotColor};border:3px solid ${dotBorderColor};"></div>
        <div class="serif" style="font-size:13px;font-weight:700;color:${stepTitleColor};margin-bottom:2px;">${esc(step.title)}</div>
        <div class="sans" style="font-size:12px;color:${stepDescColor};line-height:1.4;">${esc(step.description)}</div>
      </div>`
  }).join('')

  const inner = `<div style="padding:32px 36px 52px;display:flex;flex-direction:column;justify-content:center;height:100%;position:relative;">
    ${renderIconWatermark(slide.logo_placement, logoUrls)}
    ${slide.background === 'gradient' ? renderGradientTag(slide.tag_label) : renderTag(slide.tag_label, slide.background, palette)}
    <h2 class="serif" style="font-size:22px;font-weight:800;color:${heading};line-height:1.1;margin-bottom:24px;">${esc(slide.heading)}</h2>
    <div style="position:relative;padding-left:28px;">
      <div style="position:absolute;left:7px;top:8px;bottom:8px;width:2px;background:${lineColor};"></div>
      ${stepsHtml}
    </div>
  </div>`

  return wrapSlide(inner, { slide, palette, slideIndex, totalSlides })
}

// ---------------------------------------------------------------------------
// 8. icon_grid — icon boxes in a grid (reference carousel 2 slide 4 gradient)
// ---------------------------------------------------------------------------

const iconGrid: SlideRenderFn = ({ slide, palette, slideIndex, totalSlides, logoUrls }) => {
  const heading = textColor(slide.background, palette)
  const light = isLightSlide(slide.background)
  const features = slide.features ?? []

  const iconBg = light ? '#FFFFFF' : 'rgba(255,255,255,0.1)'
  const labelColor = light ? palette.dark_bg : '#FFFFFF'
  const descColor = light ? '#888888' : 'rgba(255,255,255,0.5)'

  const items = features.slice(0, 4).map((f) =>
    `<div style="text-align:center;">
        <div style="width:44px;height:44px;background:${iconBg};border-radius:12px;display:flex;align-items:center;justify-content:center;margin:0 auto 8px;font-size:20px;">${esc(f.icon)}</div>
        <div class="serif" style="font-size:11px;font-weight:700;color:${labelColor};">${esc(f.label)}</div>
        ${f.description ? `<div class="sans" style="font-size:10px;color:${descColor};">${esc(f.description)}</div>` : ''}
      </div>`
  ).join('')

  const inner = `<div style="padding:36px 32px 52px;display:flex;flex-direction:column;justify-content:center;height:100%;position:relative;">
    ${renderIconWatermark(slide.logo_placement, logoUrls)}
    ${slide.background === 'gradient' ? renderGradientTag(slide.tag_label) : renderTag(slide.tag_label, slide.background, palette)}
    <h2 class="serif" style="font-size:26px;font-weight:800;color:${heading};line-height:1.1;margin-bottom:28px;">${esc(slide.heading)}</h2>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px 12px;">
      ${items}
    </div>
    ${slide.body ? `<p class="sans" style="font-size:12px;color:${light ? '#888' : 'rgba(255,255,255,0.4)'};margin-top:24px;text-align:center;font-style:italic;">${formatText(slide.body)}</p>` : ''}
  </div>`

  return wrapSlide(inner, { slide, palette, slideIndex, totalSlides })
}

// ---------------------------------------------------------------------------
// 9. stat_blocks — horizontal stat cards (reference carousel 2 slide 3)
// ---------------------------------------------------------------------------

const statBlocks: SlideRenderFn = ({ slide, palette, slideIndex, totalSlides, logoUrls }) => {
  const heading = textColor(slide.background, palette)
  const light = isLightSlide(slide.background)
  const features = slide.features ?? []

  const cardBg = light ? '#FFFFFF' : 'rgba(255,255,255,0.04)'
  const cardBorder = light ? palette.light_border : 'rgba(255,255,255,0.06)'
  const statColor = palette.brand_accent
  const titleColor = light ? palette.dark_bg : '#FFFFFF'
  const descColor = light ? '#888888' : 'rgba(255,255,255,0.45)'

  const cards = features.slice(0, 4).map((f) =>
    `<div style="display:flex;align-items:center;gap:16px;background:${cardBg};border-radius:12px;padding:16px;border:1px solid ${cardBorder};">
        <div class="serif" style="font-size:28px;font-weight:900;color:${statColor};min-width:72px;text-align:center;">${esc(f.icon)}</div>
        <div>
          <div class="serif" style="font-size:13px;font-weight:700;color:${titleColor};">${esc(f.label)}</div>
          <div class="sans" style="font-size:11px;color:${descColor};line-height:1.4;">${esc(f.description)}</div>
        </div>
      </div>`
  ).join('')

  const inner = `<div style="padding:36px 28px 52px;display:flex;flex-direction:column;justify-content:center;height:100%;position:relative;">
    ${renderIconWatermark(slide.logo_placement, logoUrls)}
    ${slide.background === 'gradient' ? renderGradientTag(slide.tag_label) : renderTag(slide.tag_label, slide.background, palette)}
    <h2 class="serif" style="font-size:22px;font-weight:800;color:${heading};line-height:1.1;margin-bottom:24px;">${esc(slide.heading)}</h2>
    <div style="display:flex;flex-direction:column;gap:12px;">
      ${cards}
    </div>
  </div>`

  return wrapSlide(inner, { slide, palette, slideIndex, totalSlides })
}

// ---------------------------------------------------------------------------
// 10. split_photo — side-by-side photo + text
// ---------------------------------------------------------------------------

const splitPhoto: SlideRenderFn = ({ slide, palette, slideIndex, totalSlides, logoUrls }) => {
  const heading = textColor(slide.background, palette)
  const body = secondaryText(slide.background)
  const slot = slide.photo_slots?.[0] ?? { slot_id: 'photo-0', label: 'Photo' }

  const inner = `<div style="display:flex;height:100%;padding-bottom:40px;position:relative;">
    ${renderIconWatermark(slide.logo_placement, logoUrls)}
    <div style="flex:1;display:flex;align-items:center;justify-content:center;padding:16px;">
      ${renderPhotoSlot(slot, '100%', '100%', slide.background)}
    </div>
    <div style="flex:1;display:flex;flex-direction:column;justify-content:center;padding:24px 20px;gap:10px;">
      ${slide.background === 'gradient' ? renderGradientTag(slide.tag_label) : renderTag(slide.tag_label, slide.background, palette)}
      <div class="serif" style="font-size:24px;font-weight:700;letter-spacing:-0.3px;color:${heading};line-height:1.2;">${esc(slide.heading)}</div>
      ${slide.body ? `<div class="sans" style="font-size:13px;font-weight:400;line-height:1.5;color:${body};">${formatText(slide.body)}</div>` : ''}
    </div>
  </div>`

  return wrapSlide(inner, { slide, palette, slideIndex, totalSlides })
}

// ---------------------------------------------------------------------------
// 11. full_bleed_photo — full photo with text overlay
// ---------------------------------------------------------------------------

const fullBleedPhoto: SlideRenderFn = ({ slide, palette, slideIndex, totalSlides, logoUrls }) => {
  const slot = slide.photo_slots?.[0] ?? { slot_id: 'photo-0', label: 'Photo' }

  const inner = `<div style="position:relative;width:100%;height:100%;">
    ${renderIconWatermark(slide.logo_placement, logoUrls)}
    <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;">
      ${renderPhotoSlot(slot, '100%', '100%', 'dark')}
    </div>
    <div style="position:absolute;bottom:0;left:0;right:0;background:linear-gradient(to top,rgba(0,0,0,0.85) 0%,rgba(0,0,0,0.4) 50%,transparent 100%);padding:36px 36px 52px;display:flex;flex-direction:column;gap:8px;justify-content:flex-end;min-height:40%;">
      ${slide.tag_label ? renderTag(slide.tag_label, 'dark', palette) : ''}
      <div class="serif" style="font-size:28px;font-weight:700;letter-spacing:-0.3px;color:#ffffff;line-height:1.2;">${esc(slide.heading)}</div>
      ${slide.body ? `<div class="sans" style="font-size:14px;font-weight:400;line-height:1.5;color:rgba(255,255,255,0.8);">${formatText(slide.body)}</div>` : ''}
    </div>
  </div>`

  return wrapSlide(inner, { slide, palette, slideIndex, totalSlides })
}

// ---------------------------------------------------------------------------
// 12. card_stack — vertical list of feature cards
// ---------------------------------------------------------------------------

const cardStack: SlideRenderFn = ({ slide, palette, slideIndex, totalSlides, logoUrls }) => {
  const heading = textColor(slide.background, palette)
  const light = isLightSlide(slide.background)
  const features = slide.features ?? []

  const cardBg = light ? '#FFFFFF' : 'rgba(255,255,255,0.04)'
  const cardBorder = light ? palette.light_border : 'rgba(255,255,255,0.06)'
  const labelColor = light ? palette.dark_bg : '#FFFFFF'
  const descColor = light ? '#888888' : 'rgba(255,255,255,0.45)'

  const cards = features.map((f) =>
    `<div style="background:${cardBg};border:1px solid ${cardBorder};border-radius:12px;padding:14px 16px;display:flex;align-items:flex-start;gap:12px;">
        <span style="font-size:18px;line-height:1;flex-shrink:0;">${esc(f.icon)}</span>
        <div style="display:flex;flex-direction:column;gap:2px;">
          <div class="serif" style="font-size:13px;font-weight:700;color:${labelColor};line-height:1.3;">${esc(f.label)}</div>
          <div class="sans" style="font-size:11px;font-weight:400;line-height:1.4;color:${descColor};">${esc(f.description)}</div>
        </div>
      </div>`
  ).join('')

  const inner = `<div style="padding:32px 36px 52px;display:flex;flex-direction:column;height:100%;gap:12px;position:relative;">
    ${renderIconWatermark(slide.logo_placement, logoUrls)}
    ${slide.background === 'gradient' ? renderGradientTag(slide.tag_label) : renderTag(slide.tag_label, slide.background, palette)}
    <h2 class="serif" style="font-size:22px;font-weight:800;color:${heading};line-height:1.1;">${esc(slide.heading)}</h2>
    <div style="display:flex;flex-direction:column;gap:10px;flex:1;justify-content:center;">${cards}</div>
  </div>`

  return wrapSlide(inner, { slide, palette, slideIndex, totalSlides })
}

// ---------------------------------------------------------------------------
// 13. minimal_text — clean centered text
// ---------------------------------------------------------------------------

const minimalText: SlideRenderFn = ({ slide, palette, slideIndex, totalSlides, logoUrls }) => {
  const heading = textColor(slide.background, palette)
  const body = secondaryText(slide.background)

  const inner = `<div style="padding:36px 36px 52px;display:flex;flex-direction:column;justify-content:center;align-items:center;height:100%;text-align:center;gap:16px;position:relative;">
    ${renderIconWatermark(slide.logo_placement, logoUrls)}
    ${slide.background === 'gradient' ? renderGradientTag(slide.tag_label) : renderTag(slide.tag_label, slide.background, palette)}
    <h2 class="serif" style="font-size:28px;font-weight:800;color:${heading};line-height:1.1;">${esc(slide.heading)}</h2>
    ${slide.body ? `<p class="sans" style="font-size:14px;font-weight:400;line-height:1.5;color:${body};max-width:300px;">${formatText(slide.body)}</p>` : ''}
  </div>`

  return wrapSlide(inner, { slide, palette, slideIndex, totalSlides })
}

// ---------------------------------------------------------------------------
// 14. cta_final — gradient CTA slide with white button (reference final slides)
// ---------------------------------------------------------------------------

const ctaFinal: SlideRenderFn = ({ slide, palette, slideIndex, totalSlides, logoUrls }) => {
  const light = isLightSlide(slide.background)
  const ctaText = slide.cta?.text ?? 'Get Started'
  const ctaSub = slide.cta?.subtitle ?? ''

  // CTA button: white bg + dark text on dark/gradient, dark bg + white text on light
  const btnBg = light ? palette.dark_bg : '#FFFFFF'
  const btnColor = light ? '#FFFFFF' : palette.dark_bg

  const inner = `<div style="padding:36px 36px 52px;display:flex;flex-direction:column;justify-content:center;align-items:center;height:100%;text-align:center;">
    ${renderLogo(slide.logo_placement === 'full' ? 'full' : undefined, slide.background, logoUrls, 80, 240)}
    <div class="serif" style="font-size:10px;font-weight:800;letter-spacing:1.5px;color:rgba(255,255,255,0.5);margin-bottom:24px;">${esc(slide.heading).toUpperCase()}</div>
    ${slide.body ? `<h2 class="serif" style="font-size:24px;font-weight:800;color:#FFFFFF;line-height:1.15;margin-bottom:8px;">${formatText(slide.body)}</h2>` : ''}
    <div style="display:inline-flex;align-items:center;padding:14px 32px;background:${btnBg};color:${btnColor};font-family:inherit;font-weight:700;font-size:14px;border-radius:28px;margin-bottom:14px;" class="serif">${esc(ctaText)}</div>
    ${ctaSub ? `<p class="sans" style="font-size:11px;color:rgba(255,255,255,0.35);font-style:italic;">${esc(ctaSub)}</p>` : ''}
  </div>`

  return wrapSlide(inner, { slide, palette, slideIndex, totalSlides })
}

// ---------------------------------------------------------------------------
// 15. static_photo_top — photo top ~62%, gradient bridge, content zone, CTA footer
// ---------------------------------------------------------------------------

const staticPhotoTop: SlideRenderFn = ({ slide, palette, logoUrls }) => {
  const slot = slide.photo_slots?.[0] ?? { slot_id: 'static-photo-0', label: 'Main Photo' }
  const deepBg = palette.dark_bg

  const inner = `<div style="height:100%;display:flex;flex-direction:column;">
    <div style="position:relative;height:325px;flex-shrink:0;overflow:hidden;">
      ${renderLogoTopRight(logoUrls)}
      ${renderStaticPhotoZone(slot)}
      <div style="position:absolute;bottom:0;left:0;right:0;height:60px;background:linear-gradient(to bottom,transparent,${deepBg});pointer-events:none;z-index:1;"></div>
    </div>
    <div style="flex:1;background:${deepBg};padding:18px 28px 20px;display:flex;flex-direction:column;justify-content:center;">
      ${renderTag(slide.tag_label, 'dark', palette)}
      <h1 class="serif" style="font-size:24px;font-weight:800;color:#FFFFFF;line-height:1.1;letter-spacing:-0.3px;margin-bottom:8px;">${esc(slide.heading)}</h1>
      ${slide.body ? `<p class="sans" style="font-size:13px;color:rgba(255,255,255,0.6);line-height:1.5;">${formatText(slide.body)}</p>` : ''}
    </div>
    ${renderCtaFooter(slide.cta, palette)}
  </div>`

  return wrapStaticSlide(inner, palette)
}

// ---------------------------------------------------------------------------
// 16. static_full_bleed — full-bleed photo with gradient overlay, content at bottom, CTA footer
// ---------------------------------------------------------------------------

const staticFullBleed: SlideRenderFn = ({ slide, palette, logoUrls }) => {
  const slot = slide.photo_slots?.[0] ?? { slot_id: 'static-photo-0', label: 'Main Photo' }
  const deepBg = palette.dark_bg
  const deepRgb = hexToRgbStr(deepBg)
  const overlayGradient = `linear-gradient(to bottom,rgba(${deepRgb},0.25) 0%,rgba(${deepRgb},0.15) 35%,rgba(${deepRgb},0.55) 60%,rgba(${deepRgb},0.92) 80%,rgba(${deepRgb},0.98) 100%)`

  const inner = `<div style="height:100%;display:flex;flex-direction:column;">
    <div style="position:relative;flex:1;overflow:hidden;">
      ${renderLogoTopRight(logoUrls)}
      ${renderStaticPhotoZone(slot)}
      <div style="position:absolute;inset:0;background:${overlayGradient};pointer-events:none;"></div>
      <div style="position:absolute;bottom:0;left:0;right:0;padding:28px 28px 22px;">
        ${renderTag(slide.tag_label, 'dark', palette)}
        <h1 class="serif" style="font-size:26px;font-weight:800;color:#FFFFFF;line-height:1.1;letter-spacing:-0.3px;margin-bottom:8px;">${esc(slide.heading)}</h1>
        ${slide.body ? `<p class="sans" style="font-size:13px;color:rgba(255,255,255,0.8);line-height:1.5;">${formatText(slide.body)}</p>` : ''}
      </div>
    </div>
    ${renderCtaFooter(slide.cta, palette)}
  </div>`

  return wrapStaticSlide(inner, palette)
}

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

export const LAYOUT_REGISTRY: Record<string, SlideRenderFn> = {
  hero_stat: heroStat,
  hero_hook: heroHook,
  problem_photo: problemPhoto,
  pull_quote: pullQuote,
  feature_grid: featureGrid,
  comparison_columns: comparisonColumns,
  timeline_steps: timelineSteps,
  icon_grid: iconGrid,
  stat_blocks: statBlocks,
  split_photo: splitPhoto,
  full_bleed_photo: fullBleedPhoto,
  card_stack: cardStack,
  minimal_text: minimalText,
  cta_final: ctaFinal,
  static_photo_top: staticPhotoTop,
  static_full_bleed: staticFullBleed,
}
