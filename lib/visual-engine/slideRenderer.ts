import { LAYOUT_REGISTRY } from './layoutRegistry'
import { buildFontUrl } from './fontLoader'
import { renderHeader, renderDots, renderActions, renderCaption } from './frameWrapper'
import type { CreativeBrief, ColorPalette, FontPair, BrandLogos } from '@/types'

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
          return fallback({ slide, palette, fontPair, slideIndex: slide.index, totalSlides })
        }
        return ''
      }
      return renderFn({ slide, palette, fontPair, slideIndex: slide.index, totalSlides })
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
