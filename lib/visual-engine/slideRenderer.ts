import { LAYOUT_REGISTRY, renderProgressBar, renderSwipeArrow } from './layoutRegistry'
import { buildFontUrl } from './fontLoader'
import { buildBrandGradient } from './colorDerivation'
import { renderHeader, renderDots, renderActions, renderCaption } from './frameWrapper'
import type { CreativeBrief, ColorPalette, FontPair, BrandLogos, DirectSlide } from '@/types'

// ---------------------------------------------------------------------------
// Story chrome helpers — used only by renderStorySequence
// ---------------------------------------------------------------------------

function escStory(str: string): string {
  if (!str) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function storySlideBackground(bg: 'light' | 'dark' | 'gradient', palette: ColorPalette): string {
  if (bg === 'gradient') return buildBrandGradient(palette)
  return bg === 'light' ? palette.light_bg : palette.dark_bg
}

function storyProgressBars(slideIndex: number, totalSlides: number): string {
  const safeTotal = Math.max(1, totalSlides)
  const safeIndex = Math.max(0, Math.min(slideIndex, safeTotal - 1))
  const segments = Array.from({ length: safeTotal }, (_, i) => {
    const filled = i <= safeIndex
    const bg = filled ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.3)'
    return `<div style="flex:1;height:2px;border-radius:2px;background:${bg};"></div>`
  }).join('')
  return `<div style="position:absolute;top:12px;left:12px;right:12px;display:flex;gap:4px;z-index:20;">${segments}</div>`
}

function storyHeader(
  handle: string,
  palette: ColorPalette,
  isDark: boolean,
  logoUrls?: BrandLogos,
  fontPair?: FontPair
): string {
  const avatarBg = isDark ? palette.brand_accent : palette.brand_primary
  const handleColor = isDark ? '#FFFFFF' : palette.dark_bg
  const timeColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.35)'
  const borderColor = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.1)'
  const headingFont = escStory(fontPair?.heading ?? 'Montserrat')
  const cleanHandle = handle.replace(/^@/, '')
  const initial = cleanHandle.slice(0, 1).toUpperCase()

  const avatarInner = logoUrls?.icon
    ? `<img src="${escStory(logoUrls.icon)}" style="width:24px;height:24px;object-fit:contain;filter:drop-shadow(0 0 4px rgba(255,255,255,0.5));" alt="">`
    : `<div style="font-size:14px;font-weight:700;color:#FFFFFF;">${escStory(initial)}</div>`

  return `<div style="position:absolute;top:24px;left:16px;right:16px;display:flex;align-items:center;gap:10px;z-index:15;">
    <div style="width:36px;height:36px;border-radius:50%;background:${avatarBg};border:2px solid ${borderColor};display:flex;align-items:center;justify-content:center;flex-shrink:0;">${avatarInner}</div>
    <div>
      <span style="font-family:'${headingFont}',sans-serif;font-size:13px;font-weight:600;color:${handleColor};">@${escStory(cleanHandle)}</span>
      <span style="font-size:11px;color:${timeColor};"> · 2h</span>
    </div>
  </div>`
}

function storyTapArrow(isDark: boolean): string {
  const gradBg = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'
  const strokeColor = isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.25)'
  return `<div style="position:absolute;right:0;top:0;bottom:0;width:48px;z-index:9;display:flex;align-items:center;justify-content:center;background:linear-gradient(to right,transparent,${gradBg});"><svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6" stroke="${strokeColor}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg></div>`
}

// ---------------------------------------------------------------------------
// renderCarousel — produces a complete, self-contained HTML document
// that matches the reference carousel structure exactly.
// ---------------------------------------------------------------------------

export function renderCarousel(params: {
  brief: CreativeBrief
  palette: ColorPalette
  fontPair: FontPair
  clientName: string
  instagramHandle?: string
  logoUrls?: BrandLogos
  websiteUrl?: string
}): string {
  const { brief, palette, fontPair, clientName, instagramHandle, logoUrls, websiteUrl } = params
  const handle = instagramHandle ?? clientName.toLowerCase().replace(/\s+/g, '')
  const totalSlides = brief.slides.length
  const fontUrl = buildFontUrl(fontPair)

  // Render each slide through the layout registry
  const slidesHtml = brief.slides
    .map((slide) => {
      const renderFn = LAYOUT_REGISTRY[slide.layout_type]
      if (!renderFn) {
        const fallback = LAYOUT_REGISTRY['minimal_text']
        if (fallback) {
          return fallback({ slide, palette, fontPair, slideIndex: slide.index, totalSlides, logoUrls })
        }
        return ''
      }
      return renderFn({ slide, palette, fontPair, slideIndex: slide.index, totalSlides, logoUrls })
    })
    .join('')

  // Use icon for IG header avatar, fall back to full logo
  const avatarUrl = logoUrls?.icon ?? logoUrls?.full
  const headerHtml = renderHeader(clientName, handle, undefined, avatarUrl)
  const dotsHtml = renderDots(totalSlides)
  const actionsHtml = renderActions()
  const captionHtml = renderCaption(handle, brief.caption, websiteUrl)

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=420">
<link href="${fontUrl}" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box;}
body{background:#1a1a1a;display:flex;justify-content:center;padding:20px 0;font-family:'${fontPair.body}',sans-serif;}
.serif{font-family:'${fontPair.heading}',sans-serif;}
.sans{font-family:'${fontPair.body}',sans-serif;}
.ig-frame{width:420px;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.3);}
.ig-header{display:flex;align-items:center;gap:10px;padding:12px 14px;border-bottom:1px solid #eee;}
.ig-handle{font-family:'${fontPair.heading}',sans-serif;font-size:13px;font-weight:700;color:#262626;}
.ig-handle-sub{font-size:11px;color:#8e8e8e;font-weight:400;}
.carousel-viewport{width:420px;aspect-ratio:4/5;overflow:hidden;position:relative;cursor:grab;}
.carousel-track{display:flex;transition:transform 0.35s cubic-bezier(.4,0,.2,1);height:100%;}
.slide{min-width:420px;width:420px;height:525px;position:relative;display:flex;flex-direction:column;overflow:hidden;}
.ig-dots{display:flex;justify-content:center;gap:4px;padding:10px 0 6px;}
.ig-dot{width:6px;height:6px;border-radius:50%;background:#d4d4d4;transition:background 0.2s;}
.ig-dot.active{background:#0095f6;}
.ig-actions{display:flex;align-items:center;padding:8px 14px 4px;gap:16px;}
.ig-bookmark{margin-left:auto;}
.ig-caption{padding:6px 14px 14px;font-size:13px;color:#262626;line-height:1.4;}
.ig-caption strong{font-weight:600;}
.ig-caption .time{display:block;margin-top:6px;font-size:10px;color:#8e8e8e;letter-spacing:0.5px;}
</style>
</head><body>
<div class="ig-frame">
  ${headerHtml}
  <div class="carousel-viewport" id="viewport">
    <div class="carousel-track" id="track">${slidesHtml}</div>
  </div>
  ${dotsHtml}
  ${actionsHtml}
  ${captionHtml}
</div>
<script>
const track=document.getElementById('track'),viewport=document.getElementById('viewport'),dots=document.querySelectorAll('.ig-dot');
let current=0,startX=0,dx=0,dragging=false;const total=${totalSlides},W=420;
function goTo(i){current=Math.max(0,Math.min(total-1,i));track.style.transform='translateX('+(-current*W)+'px)';dots.forEach((d,j)=>d.classList.toggle('active',j===current));}
viewport.addEventListener('pointerdown',e=>{dragging=true;startX=e.clientX;dx=0;track.style.transition='none';viewport.setPointerCapture(e.pointerId);});
viewport.addEventListener('pointermove',e=>{if(!dragging)return;dx=e.clientX-startX;track.style.transform='translateX('+(-current*W+dx)+'px)';});
viewport.addEventListener('pointerup',()=>{dragging=false;track.style.transition='transform 0.35s cubic-bezier(.4,0,.2,1)';if(dx<-40)goTo(current+1);else if(dx>40)goTo(current-1);else goTo(current);});
</script></body></html>`
}

// ---------------------------------------------------------------------------
// renderStatic — produces a complete, self-contained HTML document for a
// single static feed post (no carousel track, no swipe JS, no progress bar).
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// renderStorySequence — 9:16 story format (420×747px, story chrome baked in)
// ---------------------------------------------------------------------------

export function renderStorySequence(params: {
  brief: CreativeBrief
  palette: ColorPalette
  fontPair: FontPair
  clientName: string
  instagramHandle?: string
  logoUrls?: BrandLogos
  websiteUrl?: string
}): string {
  const { brief, palette, fontPair, clientName, instagramHandle, logoUrls } = params
  const handle = instagramHandle ?? clientName.toLowerCase().replace(/\s+/g, '')
  const totalSlides = brief.slides.length
  const fontUrl = buildFontUrl(fontPair)

  // Render each slide with baked-in story chrome (progress bars, header, tap arrow)
  const slidesHtml = brief.slides
    .map((slide) => {
      const isDark = slide.background !== 'light'
      const bgValue = storySlideBackground(slide.background, palette)

      const renderFn = LAYOUT_REGISTRY[slide.layout_type]
      const innerHtml = renderFn
        ? renderFn({ slide, palette, fontPair, slideIndex: slide.index, totalSlides, logoUrls })
        : (LAYOUT_REGISTRY['story_full_text']?.({ slide, palette, fontPair, slideIndex: slide.index, totalSlides, logoUrls }) ?? '')

      return `<div class="story-slide" style="background:${bgValue};">
  ${storyProgressBars(slide.index, totalSlides)}
  ${storyHeader(handle, palette, isDark, logoUrls, fontPair)}
  ${slide.has_arrow ? storyTapArrow(isDark) : ''}
  ${innerHtml}
</div>`
    })
    .join('')

  const dotsHtml = Array.from({ length: totalSlides }, (_, i) =>
    `<div class="dot${i === 0 ? ' active' : ''}" onclick="goToSlide(${i})"></div>`
  ).join('')

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=420">
<link href="${fontUrl}" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box;}
body{background:#1a1a2e;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;padding:30px 0;font-family:'${fontPair.body}',sans-serif;}
.serif{font-family:'${fontPair.heading}',sans-serif;}
.sans{font-family:'${fontPair.body}',sans-serif;}
.phone-frame{width:420px;height:747px;border-radius:20px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.5),0 0 0 1px rgba(255,255,255,0.08);position:relative;}
.story-viewport{width:420px;height:747px;overflow:hidden;position:relative;cursor:grab;}
.story-viewport:active{cursor:grabbing;}
.story-track{display:flex;height:100%;transition:transform 0.35s cubic-bezier(.4,0,.2,1);}
.story-slide{width:420px;min-width:420px;height:747px;position:relative;overflow:hidden;}
.preview-dots{display:flex;gap:8px;justify-content:center;margin-top:18px;}
.preview-dots .dot{width:8px;height:8px;border-radius:50%;background:rgba(255,255,255,0.2);transition:background 0.3s,transform 0.3s;cursor:pointer;}
.preview-dots .dot.active{background:${palette.brand_accent};transform:scale(1.3);}
.slide-counter{color:rgba(255,255,255,0.4);font-family:'${fontPair.heading}',sans-serif;font-size:12px;margin-top:12px;letter-spacing:1px;text-align:center;}
</style>
</head><body>
<div class="phone-frame">
  <div class="story-viewport" id="viewport">
    <div class="story-track" id="track">${slidesHtml}</div>
  </div>
</div>
<div class="preview-dots">${dotsHtml}</div>
<div class="slide-counter" id="counter">1 / ${totalSlides}</div>
<script>
var startX=0,currentX=0,isDragging=false,currentSlide=0;
var track=document.getElementById('track');
var viewport=document.getElementById('viewport');
var totalSlides=${totalSlides};
var slideWidth=420;
function goToSlide(idx){currentSlide=Math.max(0,Math.min(idx,totalSlides-1));track.style.transition='transform 0.35s cubic-bezier(.4,0,.2,1)';track.style.transform='translateX('+(-currentSlide*slideWidth)+'px)';updateDots();}
function updateDots(){document.querySelectorAll('.dot').forEach(function(d,i){d.classList.toggle('active',i===currentSlide);});document.getElementById('counter').textContent=(currentSlide+1)+' / '+totalSlides;}
viewport.addEventListener('pointerdown',function(e){isDragging=true;startX=e.clientX;track.style.transition='none';viewport.setPointerCapture(e.pointerId);});
viewport.addEventListener('pointermove',function(e){if(!isDragging)return;currentX=e.clientX-startX;track.style.transform='translateX('+(-currentSlide*slideWidth+currentX)+'px)';});
viewport.addEventListener('pointerup',function(){if(!isDragging)return;isDragging=false;var threshold=slideWidth*0.2;if(currentX<-threshold&&currentSlide<totalSlides-1){goToSlide(currentSlide+1);}else if(currentX>threshold&&currentSlide>0){goToSlide(currentSlide-1);}else{goToSlide(currentSlide);}currentX=0;});
document.addEventListener('keydown',function(e){if(e.key==='ArrowRight')goToSlide(currentSlide+1);if(e.key==='ArrowLeft')goToSlide(currentSlide-1);});
</script>
</body></html>`
}

// ---------------------------------------------------------------------------
// renderStatic — produces a complete, self-contained HTML document for a
// single static feed post (no carousel track, no swipe JS, no progress bar).
// ---------------------------------------------------------------------------

export function renderStatic(params: {
  brief: CreativeBrief
  palette: ColorPalette
  fontPair: FontPair
  clientName: string
  instagramHandle?: string
  logoUrls?: BrandLogos
  websiteUrl?: string
}): string {
  const { brief, palette, fontPair, clientName, instagramHandle, logoUrls, websiteUrl } = params
  const handle = instagramHandle ?? clientName.toLowerCase().replace(/\s+/g, '')
  const fontUrl = buildFontUrl(fontPair)

  const slide = brief.slides[0]
  if (!slide) return ''

  const renderFn = LAYOUT_REGISTRY[slide.layout_type]
  const slideHtml = renderFn
    ? renderFn({ slide, palette, fontPair, slideIndex: 0, totalSlides: 1, logoUrls })
    : (LAYOUT_REGISTRY['minimal_text']?.({ slide, palette, fontPair, slideIndex: 0, totalSlides: 1, logoUrls }) ?? '')

  const avatarUrl = logoUrls?.icon ?? logoUrls?.full
  const headerHtml = renderHeader(clientName, handle, undefined, avatarUrl)
  const actionsHtml = renderActions()
  const captionHtml = renderCaption(handle, brief.caption, websiteUrl)

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=420">
<link href="${fontUrl}" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box;}
body{background:#1a1a1a;display:flex;justify-content:center;padding:20px 0;font-family:'${fontPair.body}',sans-serif;}
.serif{font-family:'${fontPair.heading}',sans-serif;}
.sans{font-family:'${fontPair.body}',sans-serif;}
.ig-frame{width:420px;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.3);}
.ig-header{display:flex;align-items:center;gap:10px;padding:12px 14px;border-bottom:1px solid #eee;}
.ig-handle{font-family:'${fontPair.heading}',sans-serif;font-size:13px;font-weight:700;color:#262626;}
.ig-handle-sub{font-size:11px;color:#8e8e8e;font-weight:400;}
.static-viewport{width:420px;height:525px;overflow:hidden;position:relative;}
.slide{min-width:420px;width:420px;height:525px;position:relative;display:flex;flex-direction:column;overflow:hidden;}
.ig-actions{display:flex;align-items:center;padding:8px 14px 4px;gap:16px;}
.ig-bookmark{margin-left:auto;}
.ig-caption{padding:6px 14px 14px;font-size:13px;color:#262626;line-height:1.4;}
.ig-caption strong{font-weight:600;}
.ig-caption .time{display:block;margin-top:6px;font-size:10px;color:#8e8e8e;letter-spacing:0.5px;}
</style>
</head><body>
<div class="ig-frame">
  ${headerHtml}
  <div class="static-viewport">${slideHtml}</div>
  ${actionsHtml}
  ${captionHtml}
</div>
</body></html>`
}

// ---------------------------------------------------------------------------
// Direct-mode helpers — shared by the three direct-mode render functions below
// ---------------------------------------------------------------------------

/**
 * Resolve the logo URL and dimensions for a direct-mode slide.
 * Returns null if logo_placement is 'none' or no matching URL exists.
 */
function pickDirectLogoResult(
  placement: DirectSlide['logo_placement'],
  background: DirectSlide['background'],
  logoUrls?: BrandLogos
): { url: string; maxH: number; maxW: number } | null {
  if (placement === 'none' || !logoUrls) return null

  if (placement === 'icon') {
    const url = logoUrls.icon
    if (!url) return null
    return { url, maxH: 32, maxW: 32 }
  }

  if (placement === 'wordmark') {
    const url = background === 'light'
      ? (logoUrls.wordmark_dark ?? logoUrls.full)
      : (logoUrls.wordmark_light ?? logoUrls.full)
    if (!url) return null
    return { url, maxH: 48, maxW: 140 }
  }

  // 'full' — prefer the full lockup, fall back to background-appropriate wordmark
  const url = logoUrls.full
    ?? (background === 'light' ? logoUrls.wordmark_dark : logoUrls.wordmark_light)
  if (!url) return null
  return { url, maxH: 48, maxW: 140 }
}

/**
 * Renders the logo as an absolutely-positioned element (top-right corner).
 * topOffset controls vertical clearance — 16px for feed, 72px for stories (avoids chrome).
 */
function renderDirectLogo(
  placement: DirectSlide['logo_placement'],
  background: DirectSlide['background'],
  logoUrls: BrandLogos | undefined,
  topOffset = 16
): string {
  const result = pickDirectLogoResult(placement, background, logoUrls)
  if (!result) return ''

  const isLight = background === 'light'
  const filter = isLight
    ? 'drop-shadow(0 0 6px rgba(0,0,0,0.15))'
    : 'drop-shadow(0 0 6px rgba(255,255,255,0.6)) drop-shadow(0 0 12px rgba(255,255,255,0.3))'

  return `<img src="${escStory(result.url)}" style="position:absolute;top:${topOffset}px;right:16px;height:${result.maxH}px;max-width:${result.maxW}px;object-fit:contain;z-index:10;filter:${filter};" alt="">`
}

// ---------------------------------------------------------------------------
// renderCarouselDirect — same document structure as renderCarousel but uses
// DirectSlide.inner_html instead of the layout registry.
// ---------------------------------------------------------------------------

export function renderCarouselDirect(params: {
  slides: DirectSlide[]
  palette: ColorPalette
  fontPair: FontPair
  clientName: string
  caption: string
  hashtags: string
  instagramHandle?: string
  logoUrls?: BrandLogos
  websiteUrl?: string
}): string {
  const { slides, palette, fontPair, clientName, caption, instagramHandle, logoUrls, websiteUrl } = params
  const handle = instagramHandle ?? clientName.toLowerCase().replace(/\s+/g, '')
  const totalSlides = slides.length
  const fontUrl = buildFontUrl(fontPair)

  const slidesHtml = slides.map((slide) => {
    const bg = storySlideBackground(slide.background, palette)
    const isLight = slide.background === 'light'
    return `<div class="slide" style="background:${bg};">
  ${slide.inner_html}
  ${renderDirectLogo(slide.logo_placement, slide.background, logoUrls)}
  ${slide.has_arrow ? renderSwipeArrow(isLight) : ''}
  ${renderProgressBar(slide.index, totalSlides, isLight, palette)}
</div>`
  }).join('')

  const avatarUrl = logoUrls?.icon ?? logoUrls?.full
  const headerHtml = renderHeader(clientName, handle, undefined, avatarUrl)
  const dotsHtml = renderDots(totalSlides)
  const actionsHtml = renderActions()
  const captionHtml = renderCaption(handle, caption, websiteUrl)

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=420">
<link href="${fontUrl}" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box;}
body{background:#1a1a1a;display:flex;justify-content:center;padding:20px 0;font-family:'${fontPair.body}',sans-serif;}
.serif{font-family:'${fontPair.heading}',sans-serif;}
.sans{font-family:'${fontPair.body}',sans-serif;}
.ig-frame{width:420px;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.3);}
.ig-header{display:flex;align-items:center;gap:10px;padding:12px 14px;border-bottom:1px solid #eee;}
.ig-handle{font-family:'${fontPair.heading}',sans-serif;font-size:13px;font-weight:700;color:#262626;}
.ig-handle-sub{font-size:11px;color:#8e8e8e;font-weight:400;}
.carousel-viewport{width:420px;aspect-ratio:4/5;overflow:hidden;position:relative;cursor:grab;}
.carousel-track{display:flex;transition:transform 0.35s cubic-bezier(.4,0,.2,1);height:100%;}
.slide{min-width:420px;width:420px;height:525px;position:relative;display:flex;flex-direction:column;overflow:hidden;}
.ig-dots{display:flex;justify-content:center;gap:4px;padding:10px 0 6px;}
.ig-dot{width:6px;height:6px;border-radius:50%;background:#d4d4d4;transition:background 0.2s;}
.ig-dot.active{background:#0095f6;}
.ig-actions{display:flex;align-items:center;padding:8px 14px 4px;gap:16px;}
.ig-bookmark{margin-left:auto;}
.ig-caption{padding:6px 14px 14px;font-size:13px;color:#262626;line-height:1.4;}
.ig-caption strong{font-weight:600;}
.ig-caption .time{display:block;margin-top:6px;font-size:10px;color:#8e8e8e;letter-spacing:0.5px;}
</style>
</head><body>
<div class="ig-frame">
  ${headerHtml}
  <div class="carousel-viewport" id="viewport">
    <div class="carousel-track" id="track">${slidesHtml}</div>
  </div>
  ${dotsHtml}
  ${actionsHtml}
  ${captionHtml}
</div>
<script>
const track=document.getElementById('track'),viewport=document.getElementById('viewport'),dots=document.querySelectorAll('.ig-dot');
let current=0,startX=0,dx=0,dragging=false;const total=${totalSlides},W=420;
function goTo(i){current=Math.max(0,Math.min(total-1,i));track.style.transform='translateX('+(-current*W)+'px)';dots.forEach((d,j)=>d.classList.toggle('active',j===current));}
viewport.addEventListener('pointerdown',e=>{dragging=true;startX=e.clientX;dx=0;track.style.transition='none';viewport.setPointerCapture(e.pointerId);});
viewport.addEventListener('pointermove',e=>{if(!dragging)return;dx=e.clientX-startX;track.style.transform='translateX('+(-current*W+dx)+'px)';});
viewport.addEventListener('pointerup',()=>{dragging=false;track.style.transition='transform 0.35s cubic-bezier(.4,0,.2,1)';if(dx<-40)goTo(current+1);else if(dx>40)goTo(current-1);else goTo(current);});
</script></body></html>`
}

// ---------------------------------------------------------------------------
// renderStaticDirect — same document structure as renderStatic but uses
// DirectSlide.inner_html instead of the layout registry.
// ---------------------------------------------------------------------------

export function renderStaticDirect(params: {
  slides: DirectSlide[]
  palette: ColorPalette
  fontPair: FontPair
  clientName: string
  caption: string
  hashtags: string
  instagramHandle?: string
  logoUrls?: BrandLogos
  websiteUrl?: string
}): string {
  const { slides, palette, fontPair, clientName, caption, instagramHandle, logoUrls, websiteUrl } = params
  const handle = instagramHandle ?? clientName.toLowerCase().replace(/\s+/g, '')
  const fontUrl = buildFontUrl(fontPair)

  const slide = slides[0]
  if (!slide) return ''

  const bg = storySlideBackground(slide.background, palette)
  const slideHtml = `<div class="slide" style="background:${bg};">
  ${slide.inner_html}
  ${renderDirectLogo(slide.logo_placement, slide.background, logoUrls)}
</div>`

  const avatarUrl = logoUrls?.icon ?? logoUrls?.full
  const headerHtml = renderHeader(clientName, handle, undefined, avatarUrl)
  const actionsHtml = renderActions()
  const captionHtml = renderCaption(handle, caption, websiteUrl)

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=420">
<link href="${fontUrl}" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box;}
body{background:#1a1a1a;display:flex;justify-content:center;padding:20px 0;font-family:'${fontPair.body}',sans-serif;}
.serif{font-family:'${fontPair.heading}',sans-serif;}
.sans{font-family:'${fontPair.body}',sans-serif;}
.ig-frame{width:420px;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.3);}
.ig-header{display:flex;align-items:center;gap:10px;padding:12px 14px;border-bottom:1px solid #eee;}
.ig-handle{font-family:'${fontPair.heading}',sans-serif;font-size:13px;font-weight:700;color:#262626;}
.ig-handle-sub{font-size:11px;color:#8e8e8e;font-weight:400;}
.static-viewport{width:420px;height:525px;overflow:hidden;position:relative;}
.slide{min-width:420px;width:420px;height:525px;position:relative;display:flex;flex-direction:column;overflow:hidden;}
.ig-actions{display:flex;align-items:center;padding:8px 14px 4px;gap:16px;}
.ig-bookmark{margin-left:auto;}
.ig-caption{padding:6px 14px 14px;font-size:13px;color:#262626;line-height:1.4;}
.ig-caption strong{font-weight:600;}
.ig-caption .time{display:block;margin-top:6px;font-size:10px;color:#8e8e8e;letter-spacing:0.5px;}
</style>
</head><body>
<div class="ig-frame">
  ${headerHtml}
  <div class="static-viewport">${slideHtml}</div>
  ${actionsHtml}
  ${captionHtml}
</div>
</body></html>`
}

// ---------------------------------------------------------------------------
// renderStorySequenceDirect — same document structure as renderStorySequence
// but uses DirectSlide.inner_html instead of the layout registry.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// renderStaticStoryDirect — 9:16 single-image story (420×747px) with story
// chrome baked in (single filled progress bar + story header + logo).
// No swipe JS or slide counter since it is a single static image.
// ---------------------------------------------------------------------------

export function renderStaticStoryDirect(params: {
  slides: DirectSlide[]
  palette: ColorPalette
  fontPair: FontPair
  clientName: string
  caption: string
  hashtags: string
  instagramHandle?: string
  logoUrls?: BrandLogos
  websiteUrl?: string
}): string {
  const { slides, palette, fontPair, clientName, instagramHandle, logoUrls } = params
  const handle = instagramHandle ?? clientName.toLowerCase().replace(/\s+/g, '')
  const fontUrl = buildFontUrl(fontPair)

  const slide = slides[0]
  if (!slide) return ''

  const isDark = slide.background !== 'light'
  const bgValue = storySlideBackground(slide.background, palette)

  // Single fully-filled progress bar (one segment, one image)
  const progressBar = `<div style="position:absolute;top:12px;left:12px;right:12px;display:flex;gap:4px;z-index:20;"><div style="flex:1;height:2px;border-radius:2px;background:rgba(255,255,255,0.9);"></div></div>`

  const slideHtml = `<div class="story-slide" style="background:${bgValue};">
  ${progressBar}
  ${storyHeader(handle, palette, isDark, logoUrls, fontPair)}
  ${renderDirectLogo(slide.logo_placement, slide.background, logoUrls, 72)}
  ${slide.inner_html}
</div>`

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=420">
<link href="${fontUrl}" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box;}
body{background:#1a1a2e;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;padding:30px 0;font-family:'${fontPair.body}',sans-serif;}
.serif{font-family:'${fontPair.heading}',sans-serif;}
.sans{font-family:'${fontPair.body}',sans-serif;}
.phone-frame{width:420px;height:747px;border-radius:20px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.5),0 0 0 1px rgba(255,255,255,0.08);position:relative;}
.story-slide{width:420px;height:747px;position:relative;overflow:hidden;}
</style>
</head><body>
<div class="phone-frame">
  ${slideHtml}
</div>
</body></html>`
}

export function renderStorySequenceDirect(params: {
  slides: DirectSlide[]
  palette: ColorPalette
  fontPair: FontPair
  clientName: string
  caption: string
  hashtags: string
  instagramHandle?: string
  logoUrls?: BrandLogos
  websiteUrl?: string
}): string {
  const { slides, palette, fontPair, clientName, instagramHandle, logoUrls } = params
  const handle = instagramHandle ?? clientName.toLowerCase().replace(/\s+/g, '')
  const totalSlides = slides.length
  const fontUrl = buildFontUrl(fontPair)

  const slidesHtml = slides.map((slide) => {
    const isDark = slide.background !== 'light'
    const bgValue = storySlideBackground(slide.background, palette)
    return `<div class="story-slide" style="background:${bgValue};">
  ${storyProgressBars(slide.index, totalSlides)}
  ${storyHeader(handle, palette, isDark, logoUrls, fontPair)}
  ${slide.has_arrow ? storyTapArrow(isDark) : ''}
  ${renderDirectLogo(slide.logo_placement, slide.background, logoUrls, 72)}
  ${slide.inner_html}
</div>`
  }).join('')

  const dotsHtml = Array.from({ length: totalSlides }, (_, i) =>
    `<div class="dot${i === 0 ? ' active' : ''}" onclick="goToSlide(${i})"></div>`
  ).join('')

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=420">
<link href="${fontUrl}" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box;}
body{background:#1a1a2e;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;padding:30px 0;font-family:'${fontPair.body}',sans-serif;}
.serif{font-family:'${fontPair.heading}',sans-serif;}
.sans{font-family:'${fontPair.body}',sans-serif;}
.phone-frame{width:420px;height:747px;border-radius:20px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.5),0 0 0 1px rgba(255,255,255,0.08);position:relative;}
.story-viewport{width:420px;height:747px;overflow:hidden;position:relative;cursor:grab;}
.story-viewport:active{cursor:grabbing;}
.story-track{display:flex;height:100%;transition:transform 0.35s cubic-bezier(.4,0,.2,1);}
.story-slide{width:420px;min-width:420px;height:747px;position:relative;overflow:hidden;}
.preview-dots{display:flex;gap:8px;justify-content:center;margin-top:18px;}
.preview-dots .dot{width:8px;height:8px;border-radius:50%;background:rgba(255,255,255,0.2);transition:background 0.3s,transform 0.3s;cursor:pointer;}
.preview-dots .dot.active{background:${palette.brand_accent};transform:scale(1.3);}
.slide-counter{color:rgba(255,255,255,0.4);font-family:'${fontPair.heading}',sans-serif;font-size:12px;margin-top:12px;letter-spacing:1px;text-align:center;}
</style>
</head><body>
<div class="phone-frame">
  <div class="story-viewport" id="viewport">
    <div class="story-track" id="track">${slidesHtml}</div>
  </div>
</div>
<div class="preview-dots">${dotsHtml}</div>
<div class="slide-counter" id="counter">1 / ${totalSlides}</div>
<script>
var startX=0,currentX=0,isDragging=false,currentSlide=0;
var track=document.getElementById('track');
var viewport=document.getElementById('viewport');
var totalSlides=${totalSlides};
var slideWidth=420;
function goToSlide(idx){currentSlide=Math.max(0,Math.min(idx,totalSlides-1));track.style.transition='transform 0.35s cubic-bezier(.4,0,.2,1)';track.style.transform='translateX('+(-currentSlide*slideWidth)+'px)';updateDots();}
function updateDots(){document.querySelectorAll('.dot').forEach(function(d,i){d.classList.toggle('active',i===currentSlide);});document.getElementById('counter').textContent=(currentSlide+1)+' / '+totalSlides;}
viewport.addEventListener('pointerdown',function(e){isDragging=true;startX=e.clientX;track.style.transition='none';viewport.setPointerCapture(e.pointerId);});
viewport.addEventListener('pointermove',function(e){if(!isDragging)return;currentX=e.clientX-startX;track.style.transform='translateX('+(-currentSlide*slideWidth+currentX)+'px)';});
viewport.addEventListener('pointerup',function(){if(!isDragging)return;isDragging=false;var threshold=slideWidth*0.2;if(currentX<-threshold&&currentSlide<totalSlides-1){goToSlide(currentSlide+1);}else if(currentX>threshold&&currentSlide>0){goToSlide(currentSlide-1);}else{goToSlide(currentSlide);}currentX=0;});
document.addEventListener('keydown',function(e){if(e.key==='ArrowRight')goToSlide(currentSlide+1);if(e.key==='ArrowLeft')goToSlide(currentSlide-1);});
</script>
</body></html>`
}
