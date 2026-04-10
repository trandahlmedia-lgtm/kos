import { buildBrandGradient } from './colorDerivation'
import type { ColorPalette, FontPair, SlideContent } from '@/types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SlideRenderFn = (params: {
  slide: SlideContent
  palette: ColorPalette
  fontPair: FontPair
  slideIndex: number
  totalSlides: number
}) => string

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function isLightSlide(bg: SlideContent['background']): boolean {
  return bg === 'light'
}

function slideBg(
  bg: SlideContent['background'],
  palette: ColorPalette
): string {
  if (bg === 'gradient') return buildBrandGradient(palette)
  return bg === 'light' ? palette.light_bg : palette.dark_bg
}

function textColor(bg: SlideContent['background']): string {
  return isLightSlide(bg) ? '#1a1a1a' : '#ffffff'
}

function secondaryTextColor(bg: SlideContent['background']): string {
  return isLightSlide(bg) ? '#555555' : 'rgba(255,255,255,0.7)'
}

function mutedTextColor(bg: SlideContent['background']): string {
  return isLightSlide(bg) ? '#888888' : 'rgba(255,255,255,0.5)'
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
// Exported helpers — progress bar & swipe arrow
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

  return `<div style="position:absolute;bottom:0;left:0;right:0;padding:16px 28px 20px;z-index:10;display:flex;align-items:center;gap:10px;">
    <div style="flex:1;height:3px;border-radius:3px;background:${trackBg};overflow:hidden;">
      <div style="width:${pct}%;height:100%;border-radius:3px;background:${fillBg};transition:width 0.3s ease;"></div>
    </div>
    <span style="font-size:11px;font-weight:500;color:${counterColor};white-space:nowrap;" class="sans">${safeIndex + 1}/${safeTotal}</span>
  </div>`
}

export function renderSwipeArrow(isLight: boolean): string {
  const gradBg = isLight
    ? 'rgba(0,0,0,0.06)'
    : 'rgba(255,255,255,0.08)'
  const strokeColor = isLight
    ? 'rgba(0,0,0,0.25)'
    : 'rgba(255,255,255,0.35)'

  return `<div style="position:absolute;top:0;right:0;width:48px;height:100%;z-index:9;display:flex;align-items:center;justify-content:center;background:linear-gradient(to right,transparent,${gradBg});">
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${strokeColor}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 6 15 12 9 18"/></svg>
  </div>`
}

// ---------------------------------------------------------------------------
// Shared slide wrapper
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
  const bgProp = slide.background === 'gradient' ? 'background' : 'background-color'

  return `<div class="slide" style="width:420px;height:525px;position:relative;overflow:hidden;${bgProp}:${bgValue};font-family:sans-serif;overflow-wrap:anywhere;word-break:break-word;">
  ${innerHtml}
  ${slide.has_arrow ? renderSwipeArrow(light) : ''}
  ${renderProgressBar(slideIndex, totalSlides, light, palette)}
</div>`
}

// ---------------------------------------------------------------------------
// Tag label helper
// ---------------------------------------------------------------------------

function renderTag(
  label: string | undefined,
  bg: SlideContent['background'],
  palette: ColorPalette
): string {
  if (!label) return ''
  const tagColor = isLightSlide(bg) ? palette.brand_accent : palette.brand_light
  return `<span class="sans" style="font-size:10px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:${tagColor};">${esc(label)}</span>`
}

// ---------------------------------------------------------------------------
// Photo placeholder helper
// ---------------------------------------------------------------------------

function renderPhotoSlot(
  slot: { slot_id: string; label: string },
  width: string,
  height: string,
  bg: SlideContent['background']
): string {
  const borderColor = isLightSlide(bg)
    ? 'rgba(0,0,0,0.15)'
    : 'rgba(255,255,255,0.2)'
  const labelColor = isLightSlide(bg)
    ? 'rgba(0,0,0,0.35)'
    : 'rgba(255,255,255,0.4)'
  const iconColor = isLightSlide(bg)
    ? 'rgba(0,0,0,0.2)'
    : 'rgba(255,255,255,0.25)'

  return `<div data-slot-id="${esc(slot.slot_id)}" style="width:${width};height:${height};border:2px dashed ${borderColor};border-radius:8px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;background:${isLightSlide(bg) ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.04)'};">
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="${iconColor}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
    <span class="sans" style="font-size:10px;font-weight:500;color:${labelColor};text-align:center;padding:0 12px;line-height:1.3;">${esc(slot.label)}</span>
  </div>`
}

// ---------------------------------------------------------------------------
// 1. hero_stat
// ---------------------------------------------------------------------------

const heroStat: SlideRenderFn = ({ slide, palette, slideIndex, totalSlides }) => {
  const primary = textColor(slide.background)
  const secondary = secondaryTextColor(slide.background)
  const statNum = slide.stat?.number ?? ''
  const statLabel = slide.stat?.label ?? ''
  const statColor = isLightSlide(slide.background) ? palette.brand_accent : palette.brand_light

  const inner = `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;padding:36px 36px 52px;text-align:center;gap:8px;">
    ${renderTag(slide.tag_label, slide.background, palette)}
    <div class="serif" style="font-size:56px;font-weight:800;letter-spacing:-1px;color:${statColor};line-height:1;">${esc(statNum)}</div>
    <div class="sans" style="font-size:12px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:${secondary};margin-top:2px;">${esc(statLabel)}</div>
    <div class="serif" style="font-size:28px;font-weight:700;letter-spacing:-0.3px;color:${primary};line-height:1.2;margin-top:12px;">${esc(slide.heading)}</div>
    ${slide.body ? `<div class="sans" style="font-size:14px;font-weight:400;line-height:1.5;color:${secondary};margin-top:4px;max-width:320px;">${formatText(slide.body)}</div>` : ''}
  </div>`

  return wrapSlide(inner, { slide, palette, slideIndex, totalSlides })
}

// ---------------------------------------------------------------------------
// 2. hero_hook
// ---------------------------------------------------------------------------

const heroHook: SlideRenderFn = ({ slide, palette, slideIndex, totalSlides }) => {
  const primary = textColor(slide.background)
  const secondary = secondaryTextColor(slide.background)

  const inner = `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;padding:36px 36px 52px;text-align:center;gap:12px;">
    ${renderTag(slide.tag_label, slide.background, palette)}
    <div class="serif" style="font-size:34px;font-weight:800;letter-spacing:-0.5px;color:${primary};line-height:1.15;max-width:340px;">${esc(slide.heading)}</div>
    ${slide.body ? `<div class="sans" style="font-size:14px;font-weight:400;line-height:1.5;color:${secondary};margin-top:4px;max-width:320px;">${formatText(slide.body)}</div>` : ''}
  </div>`

  return wrapSlide(inner, { slide, palette, slideIndex, totalSlides })
}

// ---------------------------------------------------------------------------
// 3. problem_photo
// ---------------------------------------------------------------------------

const problemPhoto: SlideRenderFn = ({ slide, palette, slideIndex, totalSlides }) => {
  const primary = textColor(slide.background)
  const secondary = secondaryTextColor(slide.background)
  const slot = slide.photo_slots?.[0] ?? { slot_id: 'photo-0', label: 'Photo' }

  const inner = `<div style="display:flex;flex-direction:column;height:100%;padding:28px 36px 52px;gap:16px;">
    ${renderPhotoSlot(slot, '100%', '220px', slide.background)}
    <div style="display:flex;flex-direction:column;gap:8px;flex:1;">
      ${renderTag(slide.tag_label, slide.background, palette)}
      <div class="serif" style="font-size:28px;font-weight:700;letter-spacing:-0.3px;color:${primary};line-height:1.2;">${esc(slide.heading)}</div>
      ${slide.body ? `<div class="sans" style="font-size:14px;font-weight:400;line-height:1.5;color:${secondary};">${formatText(slide.body)}</div>` : ''}
    </div>
  </div>`

  return wrapSlide(inner, { slide, palette, slideIndex, totalSlides })
}

// ---------------------------------------------------------------------------
// 4. pull_quote
// ---------------------------------------------------------------------------

const pullQuote: SlideRenderFn = ({ slide, palette, slideIndex, totalSlides }) => {
  const primary = textColor(slide.background)
  const barColor = isLightSlide(slide.background) ? palette.brand_accent : palette.brand_light
  const quoteText = slide.quote ?? slide.heading

  const inner = `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;padding:36px 36px 52px;text-align:center;gap:20px;">
    ${renderTag(slide.tag_label, slide.background, palette)}
    <div style="width:40px;height:2px;background:${barColor};border-radius:1px;"></div>
    <div class="serif" style="font-size:22px;font-weight:600;font-style:italic;letter-spacing:-0.2px;color:${primary};line-height:1.45;max-width:320px;">&ldquo;${esc(quoteText)}&rdquo;</div>
    <div style="width:40px;height:2px;background:${barColor};border-radius:1px;"></div>
    ${slide.body ? `<div class="sans" style="font-size:12px;font-weight:500;color:${mutedTextColor(slide.background)};letter-spacing:0.5px;">${formatText(slide.body)}</div>` : ''}
  </div>`

  return wrapSlide(inner, { slide, palette, slideIndex, totalSlides })
}

// ---------------------------------------------------------------------------
// 5. feature_grid
// ---------------------------------------------------------------------------

const featureGrid: SlideRenderFn = ({ slide, palette, slideIndex, totalSlides }) => {
  const primary = textColor(slide.background)
  const secondary = secondaryTextColor(slide.background)
  const light = isLightSlide(slide.background)
  const cardBg = light ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.06)'
  const cardBorder = light ? palette.light_border : 'rgba(255,255,255,0.1)'
  const features = slide.features ?? []

  const cards = features.slice(0, 4).map((f) => `
    <div style="flex:1 1 calc(50% - 6px);background:${cardBg};border:1px solid ${cardBorder};border-radius:12px;padding:16px 14px;display:flex;flex-direction:column;gap:6px;">
      <div style="font-size:22px;line-height:1;">${esc(f.icon)}</div>
      <div class="sans" style="font-size:13px;font-weight:600;color:${primary};line-height:1.2;">${esc(f.label)}</div>
      <div class="sans" style="font-size:12px;font-weight:400;line-height:1.4;color:${secondary};">${esc(f.description)}</div>
    </div>
  `).join('')

  const inner = `<div style="display:flex;flex-direction:column;height:100%;padding:32px 36px 52px;gap:16px;">
    ${renderTag(slide.tag_label, slide.background, palette)}
    <div class="serif" style="font-size:28px;font-weight:700;letter-spacing:-0.3px;color:${primary};line-height:1.2;">${esc(slide.heading)}</div>
    <div style="display:flex;flex-wrap:wrap;gap:12px;flex:1;align-content:start;">
      ${cards}
    </div>
  </div>`

  return wrapSlide(inner, { slide, palette, slideIndex, totalSlides })
}

// ---------------------------------------------------------------------------
// 6. comparison_columns
// ---------------------------------------------------------------------------

const comparisonColumns: SlideRenderFn = ({ slide, palette, slideIndex, totalSlides }) => {
  const primary = textColor(slide.background)
  const secondary = secondaryTextColor(slide.background)
  const light = isLightSlide(slide.background)
  const colBg = light ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.06)'
  const colBorder = light ? palette.light_border : 'rgba(255,255,255,0.1)'
  const left = slide.comparison?.left ?? { label: 'Before', items: [] }
  const right = slide.comparison?.right ?? { label: 'After', items: [] }

  function renderCol(col: { label: string; items: string[] }, accent: boolean): string {
    const headerBg = accent ? palette.brand_accent : 'transparent'
    const headerColor = accent ? '#ffffff' : primary
    const items = col.items.map((item) =>
      `<div class="sans" style="font-size:13px;font-weight:400;line-height:1.4;color:${secondary};padding:8px 0;border-bottom:1px solid ${colBorder};">${esc(item)}</div>`
    ).join('')

    return `<div style="flex:1;background:${colBg};border:1px solid ${colBorder};border-radius:12px;overflow:hidden;">
      <div class="sans" style="font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;text-align:center;padding:10px 12px;color:${headerColor};background:${headerBg};">${esc(col.label)}</div>
      <div style="padding:8px 14px;">${items}</div>
    </div>`
  }

  const inner = `<div style="display:flex;flex-direction:column;height:100%;padding:32px 36px 52px;gap:16px;">
    ${renderTag(slide.tag_label, slide.background, palette)}
    <div class="serif" style="font-size:28px;font-weight:700;letter-spacing:-0.3px;color:${primary};line-height:1.2;">${esc(slide.heading)}</div>
    <div style="display:flex;gap:12px;flex:1;">${renderCol(left, false)}${renderCol(right, true)}</div>
  </div>`

  return wrapSlide(inner, { slide, palette, slideIndex, totalSlides })
}

// ---------------------------------------------------------------------------
// 7. timeline_steps
// ---------------------------------------------------------------------------

const timelineSteps: SlideRenderFn = ({ slide, palette, slideIndex, totalSlides }) => {
  const primary = textColor(slide.background)
  const secondary = secondaryTextColor(slide.background)
  const light = isLightSlide(slide.background)
  const dividerColor = light ? palette.light_border : 'rgba(255,255,255,0.1)'
  const steps = slide.steps ?? []

  const stepsHtml = steps.map((step, i) => {
    const isLast = i === steps.length - 1
    return `<div style="display:flex;gap:16px;padding:14px 0;${isLast ? '' : `border-bottom:1px solid ${dividerColor};`}">
      <div class="sans" style="font-size:24px;font-weight:800;color:${isLightSlide(slide.background) ? palette.brand_accent : palette.brand_light};line-height:1;min-width:36px;">${esc(step.number)}</div>
      <div style="display:flex;flex-direction:column;gap:3px;">
        <div class="sans" style="font-size:14px;font-weight:600;color:${primary};line-height:1.3;">${esc(step.title)}</div>
        <div class="sans" style="font-size:12px;font-weight:400;line-height:1.4;color:${secondary};">${esc(step.description)}</div>
      </div>
    </div>`
  }).join('')

  const inner = `<div style="display:flex;flex-direction:column;height:100%;padding:32px 36px 52px;gap:12px;">
    ${renderTag(slide.tag_label, slide.background, palette)}
    <div class="serif" style="font-size:28px;font-weight:700;letter-spacing:-0.3px;color:${primary};line-height:1.2;">${esc(slide.heading)}</div>
    <div style="flex:1;display:flex;flex-direction:column;justify-content:center;">${stepsHtml}</div>
  </div>`

  return wrapSlide(inner, { slide, palette, slideIndex, totalSlides })
}

// ---------------------------------------------------------------------------
// 8. icon_grid
// ---------------------------------------------------------------------------

const iconGrid: SlideRenderFn = ({ slide, palette, slideIndex, totalSlides }) => {
  const primary = textColor(slide.background)
  const light = isLightSlide(slide.background)
  const pillBg = light ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.08)'
  const pillBorder = light ? palette.light_border : 'rgba(255,255,255,0.12)'
  const features = slide.features ?? []

  const pills = features.map((f) =>
    `<div style="display:inline-flex;align-items:center;gap:8px;background:${pillBg};border:1px solid ${pillBorder};border-radius:20px;padding:8px 16px;">
      <span style="font-size:16px;line-height:1;">${esc(f.icon)}</span>
      <span class="sans" style="font-size:13px;font-weight:500;color:${primary};">${esc(f.label)}</span>
    </div>`
  ).join('')

  const inner = `<div style="display:flex;flex-direction:column;height:100%;padding:32px 36px 52px;gap:20px;">
    ${renderTag(slide.tag_label, slide.background, palette)}
    <div class="serif" style="font-size:28px;font-weight:700;letter-spacing:-0.3px;color:${primary};line-height:1.2;">${esc(slide.heading)}</div>
    <div style="display:flex;flex-wrap:wrap;gap:10px;flex:1;align-content:start;">${pills}</div>
  </div>`

  return wrapSlide(inner, { slide, palette, slideIndex, totalSlides })
}

// ---------------------------------------------------------------------------
// 9. stat_blocks
// ---------------------------------------------------------------------------

const statBlocks: SlideRenderFn = ({ slide, palette, slideIndex, totalSlides }) => {
  const primary = textColor(slide.background)
  const secondary = secondaryTextColor(slide.background)
  const light = isLightSlide(slide.background)
  const cardBg = light ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.06)'
  const cardBorder = light ? palette.light_border : 'rgba(255,255,255,0.1)'
  const features = slide.features ?? []

  const cards = features.slice(0, 4).map((f) =>
    `<div style="flex:1;background:${cardBg};border:1px solid ${cardBorder};border-radius:12px;padding:16px 12px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:4px;">
      <div class="serif" style="font-size:28px;font-weight:800;color:${light ? palette.brand_accent : palette.brand_light};line-height:1;">${esc(f.icon)}</div>
      <div class="sans" style="font-size:11px;font-weight:500;color:${secondary};line-height:1.3;margin-top:4px;">${esc(f.label)}</div>
    </div>`
  ).join('')

  const inner = `<div style="display:flex;flex-direction:column;height:100%;padding:32px 36px 52px;gap:16px;">
    ${renderTag(slide.tag_label, slide.background, palette)}
    <div class="serif" style="font-size:28px;font-weight:700;letter-spacing:-0.3px;color:${primary};line-height:1.2;">${esc(slide.heading)}</div>
    ${slide.body ? `<div class="sans" style="font-size:14px;font-weight:400;line-height:1.5;color:${secondary};">${formatText(slide.body)}</div>` : ''}
    <div style="display:flex;gap:12px;flex:1;align-items:center;">${cards}</div>
  </div>`

  return wrapSlide(inner, { slide, palette, slideIndex, totalSlides })
}

// ---------------------------------------------------------------------------
// 10. split_photo
// ---------------------------------------------------------------------------

const splitPhoto: SlideRenderFn = ({ slide, palette, slideIndex, totalSlides }) => {
  const primary = textColor(slide.background)
  const secondary = secondaryTextColor(slide.background)
  const slot = slide.photo_slots?.[0] ?? { slot_id: 'photo-0', label: 'Photo' }

  const photoSide = `<div style="flex:1;display:flex;align-items:stretch;padding:0;">
    ${renderPhotoSlot(slot, '100%', '100%', slide.background)}
  </div>`

  const textSide = `<div style="flex:1;display:flex;flex-direction:column;justify-content:center;padding:24px 20px;gap:10px;">
    ${renderTag(slide.tag_label, slide.background, palette)}
    <div class="serif" style="font-size:24px;font-weight:700;letter-spacing:-0.3px;color:${primary};line-height:1.2;">${esc(slide.heading)}</div>
    ${slide.body ? `<div class="sans" style="font-size:13px;font-weight:400;line-height:1.5;color:${secondary};">${formatText(slide.body)}</div>` : ''}
  </div>`

  const inner = `<div style="display:flex;height:100%;padding-bottom:40px;">
    ${photoSide}${textSide}
  </div>`

  return wrapSlide(inner, { slide, palette, slideIndex, totalSlides })
}

// ---------------------------------------------------------------------------
// 11. full_bleed_photo
// ---------------------------------------------------------------------------

const fullBleedPhoto: SlideRenderFn = ({ slide, palette, slideIndex, totalSlides }) => {
  const slot = slide.photo_slots?.[0] ?? { slot_id: 'photo-0', label: 'Photo' }

  const inner = `<div style="position:relative;width:100%;height:100%;">
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
// 12. card_stack
// ---------------------------------------------------------------------------

const cardStack: SlideRenderFn = ({ slide, palette, slideIndex, totalSlides }) => {
  const primary = textColor(slide.background)
  const secondary = secondaryTextColor(slide.background)
  const light = isLightSlide(slide.background)
  const cardBg = light ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.06)'
  const cardBorder = light ? palette.light_border : 'rgba(255,255,255,0.1)'
  const features = slide.features ?? []

  const cards = features.map((f) =>
    `<div style="background:${cardBg};border:1px solid ${cardBorder};border-radius:12px;padding:14px 16px;display:flex;align-items:flex-start;gap:12px;">
      <span style="font-size:18px;line-height:1;flex-shrink:0;">${esc(f.icon)}</span>
      <div style="display:flex;flex-direction:column;gap:2px;">
        <div class="sans" style="font-size:14px;font-weight:600;color:${primary};line-height:1.3;">${esc(f.label)}</div>
        <div class="sans" style="font-size:12px;font-weight:400;line-height:1.4;color:${secondary};">${esc(f.description)}</div>
      </div>
    </div>`
  ).join('')

  const inner = `<div style="display:flex;flex-direction:column;height:100%;padding:32px 36px 52px;gap:12px;">
    ${renderTag(slide.tag_label, slide.background, palette)}
    <div class="serif" style="font-size:28px;font-weight:700;letter-spacing:-0.3px;color:${primary};line-height:1.2;">${esc(slide.heading)}</div>
    <div style="display:flex;flex-direction:column;gap:10px;flex:1;justify-content:center;">${cards}</div>
  </div>`

  return wrapSlide(inner, { slide, palette, slideIndex, totalSlides })
}

// ---------------------------------------------------------------------------
// 13. minimal_text
// ---------------------------------------------------------------------------

const minimalText: SlideRenderFn = ({ slide, palette, slideIndex, totalSlides }) => {
  const primary = textColor(slide.background)
  const secondary = secondaryTextColor(slide.background)

  const inner = `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;padding:48px 36px 52px;text-align:center;gap:16px;">
    ${renderTag(slide.tag_label, slide.background, palette)}
    <div class="serif" style="font-size:34px;font-weight:700;letter-spacing:-0.5px;color:${primary};line-height:1.2;max-width:340px;">${esc(slide.heading)}</div>
    ${slide.body ? `<div class="sans" style="font-size:14px;font-weight:400;line-height:1.5;color:${secondary};max-width:300px;">${formatText(slide.body)}</div>` : ''}
  </div>`

  return wrapSlide(inner, { slide, palette, slideIndex, totalSlides })
}

// ---------------------------------------------------------------------------
// 14. cta_final
// ---------------------------------------------------------------------------

const ctaFinal: SlideRenderFn = ({ slide, palette, slideIndex, totalSlides }) => {
  const primary = textColor(slide.background)
  const secondary = secondaryTextColor(slide.background)
  const light = isLightSlide(slide.background)
  const circleBg = light ? palette.brand_primary : palette.brand_light
  const circleText = light ? '#ffffff' : palette.dark_bg
  const brandInitial = slide.heading.charAt(0).toUpperCase()
  const ctaText = slide.cta?.text ?? 'Get Started'
  const ctaSub = slide.cta?.subtitle ?? ''

  const inner = `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;padding:36px 36px 52px;text-align:center;gap:20px;">
    <div style="display:flex;align-items:center;gap:14px;">
      <div style="width:40px;height:40px;border-radius:50%;background:${circleBg};display:flex;align-items:center;justify-content:center;">
        <span class="serif" style="font-size:20px;font-weight:700;color:${circleText};line-height:1;">${esc(brandInitial)}</span>
      </div>
      <span class="serif" style="font-size:22px;font-weight:700;color:${primary};letter-spacing:-0.3px;">${esc(slide.heading)}</span>
    </div>
    ${slide.body ? `<div class="sans" style="font-size:14px;font-weight:400;line-height:1.5;color:${secondary};max-width:300px;">${formatText(slide.body)}</div>` : ''}
    <div style="display:inline-block;background:${palette.brand_accent};color:#ffffff;font-size:14px;font-weight:600;padding:12px 28px;border-radius:9999px;letter-spacing:0.3px;cursor:pointer;" class="sans">${esc(ctaText)}</div>
    ${ctaSub ? `<div class="sans" style="font-size:11px;font-weight:400;color:${mutedTextColor(slide.background)};">${esc(ctaSub)}</div>` : ''}
  </div>`

  return wrapSlide(inner, { slide, palette, slideIndex, totalSlides })
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
}
