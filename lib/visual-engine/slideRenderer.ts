import { LAYOUT_REGISTRY } from './layoutRegistry'
import { buildFontUrl, fontCssClasses } from './fontLoader'
import { renderHeader, renderDots, renderActions, renderCaption } from './frameWrapper'
import type { CreativeBrief, ColorPalette, FontPair } from '@/types'

// ---------------------------------------------------------------------------
// renderCarousel — produces a complete, self-contained HTML document
// ---------------------------------------------------------------------------

export function renderCarousel(params: {
  brief: CreativeBrief
  palette: ColorPalette
  fontPair: FontPair
  clientName: string
  instagramHandle?: string
}): string {
  const { brief, palette, fontPair, clientName, instagramHandle } = params
  const handle = instagramHandle ?? clientName.toLowerCase().replace(/\s+/g, '')
  const totalSlides = brief.slides.length
  const fontUrl = buildFontUrl(fontPair)
  const fontClasses = fontCssClasses(fontPair)

  // Render each slide through the layout registry
  const slidesHtml = brief.slides
    .map((slide) => {
      const renderFn = LAYOUT_REGISTRY[slide.layout_type]
      if (!renderFn) {
        // Fallback: use minimal_text if layout not found
        const fallback = LAYOUT_REGISTRY['minimal_text']
        if (fallback) {
          return fallback({ slide, palette, fontPair, slideIndex: slide.index, totalSlides })
        }
        return ''
      }
      return renderFn({ slide, palette, fontPair, slideIndex: slide.index, totalSlides })
    })
    .join('\n')

  // Build the frame components
  const headerHtml = renderHeader(clientName, handle)
  const dotsHtml = renderDots(totalSlides)
  const actionsHtml = renderActions()
  const captionHtml = renderCaption(handle, brief.caption)

  return `<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=420">
<link href="${fontUrl}" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box;}
body{background:#fff;display:flex;justify-content:center;align-items:flex-start;min-height:100vh;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;}
${fontClasses}
.ig-frame{width:420px;background:#fff;border:1px solid #dbdbdb;border-radius:3px;overflow:hidden;}
.carousel-viewport{width:420px;height:525px;overflow:hidden;position:relative;}
.carousel-track{display:flex;transition:transform 0.35s cubic-bezier(.4,0,.2,1);touch-action:pan-y;user-select:none;-webkit-user-select:none;height:100%;}
.carousel-track .slide{flex-shrink:0;}
</style>
</head>
<body>
<div class="ig-frame">
${headerHtml}
<div class="carousel-viewport" id="viewport">
<div class="carousel-track" id="track">
${slidesHtml}
</div>
</div>
${dotsHtml}
${actionsHtml}
${captionHtml}
</div>
<script>
(function(){
  var track=document.getElementById('track');
  var viewport=document.getElementById('viewport');
  var dots=document.querySelectorAll('.dot');
  var total=${totalSlides};
  var current=0;
  var slideW=420;
  var startX=0;
  var moveX=0;
  var dragging=false;
  var baseOffset=0;

  function goTo(idx){
    if(idx<0)idx=0;
    if(idx>=total)idx=total-1;
    current=idx;
    track.style.transform='translateX('+ (-current*slideW) +'px)';
    dots.forEach(function(d,i){
      d.style.background=i===current?'#0095f6':'#c7c7c7';
    });
  }

  viewport.addEventListener('pointerdown',function(e){
    dragging=true;
    startX=e.clientX;
    baseOffset=-current*slideW;
    track.style.transition='none';
    viewport.setPointerCapture(e.pointerId);
  });

  viewport.addEventListener('pointermove',function(e){
    if(!dragging)return;
    moveX=e.clientX-startX;
    track.style.transform='translateX('+(baseOffset+moveX)+'px)';
  });

  viewport.addEventListener('pointerup',function(e){
    if(!dragging)return;
    dragging=false;
    track.style.transition='transform 0.35s cubic-bezier(.4,0,.2,1)';
    if(Math.abs(moveX)>40){
      if(moveX<0)goTo(current+1);
      else goTo(current-1);
    }else{
      goTo(current);
    }
    moveX=0;
  });

  viewport.addEventListener('pointercancel',function(){
    dragging=false;
    track.style.transition='transform 0.35s cubic-bezier(.4,0,.2,1)';
    goTo(current);
    moveX=0;
  });

  goTo(0);
})();
</script>
</body>
</html>`
}
