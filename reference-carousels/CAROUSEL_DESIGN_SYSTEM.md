# Carousel Design System — Reference for Visual Engine

> This file defines the design rules for carousel generation in KOS.
> It is NOT the same as the client's static post template (3-block layout).
> Carousels follow a different, multi-slide design system.

---

## Slide Dimensions
- Frame width: 420px (Instagram standard)
- Feed aspect: 4:5 → 420 x 525px per slide
- Story aspect: 9:16 → 420 x 747px per slide
- Export: Playwright at device_scale_factor = 1080/420 = 2.5714

---

## Color Usage in Carousels

Carousels use the client's brand palette, NOT hardcoded colors. But the PATTERN is consistent:

### Dark slides
- Background: `palette.dark_bg` (derived from client's primary — e.g. #0F2640 for Northern Standard)
- Heading text: `#FFFFFF`
- Body text: `rgba(255,255,255,0.6)`
- Tertiary/hint text: `rgba(255,255,255,0.35)`
- Card backgrounds: `rgba(255,255,255,0.04)` with `border: 1px solid rgba(255,255,255,0.06)`
- Progress bar track: `rgba(255,255,255,0.12)`
- Progress bar fill: `#FFFFFF`
- Progress counter: `rgba(255,255,255,0.4)`
- Swipe arrow gradient: `transparent → rgba(255,255,255,0.08)`
- Swipe arrow stroke: `rgba(255,255,255,0.35)`

### Light slides
- Background: `palette.light_bg` (e.g. #F2F4F7 cloud gray — never pure white)
- Heading text: `#262626`
- Body text: `#666666`
- Secondary text: `#8e8e8e`
- Card backgrounds: `#FFFFFF` with `border: 1px solid` `palette.light_border` (e.g. #E2E4E8)
- Card border-radius: 12px
- Progress bar track: `rgba(0,0,0,0.08)`
- Progress bar fill: `palette.brand_accent` (e.g. #E8732A amber)
- Progress counter: `rgba(0,0,0,0.3)`
- Swipe arrow gradient: `transparent → rgba(0,0,0,0.06)`
- Swipe arrow stroke: `rgba(0,0,0,0.25)`

### Gradient slides (brand gradient — used for CTA and occasional hero slides)
- Background: `linear-gradient(165deg, palette.brand_dark 0%, palette.brand_primary 50%, palette.brand_light 100%)`
- Text follows dark slide rules (white text, white progress fill)
- Tag labels: `rgba(255,255,255,0.6)`

### Accent color (palette.brand_accent) appears on:
- Progress bar fill on LIGHT slides only
- Tag/label text on light slides
- CTA button backgrounds
- Price/stat highlight text on dark slides
- Badge pill backgrounds (sometimes lighter variant)
- Never used as a slide background color

---

## Typography

### Font classes
```css
.serif { font-family: '{heading_font}', sans-serif; }
.sans { font-family: '{body_font}', sans-serif; }
```

### Size scale (fixed — does not change per brand)
| Element | Font | Size | Weight | Letter-spacing | Line-height |
|---------|------|------|--------|---------------|-------------|
| Large hero number (price) | .serif | 60-80px | 900 | -3px | 1.0 |
| Slide heading | .serif | 22-26px | 800 | -0.5px | 1.15 |
| Section heading | .serif | 18-20px | 700 | -0.3px | 1.2 |
| Body text | .sans | 13-15px | 400 | 0 | 1.4-1.5 |
| Tag/label (uppercase) | .sans | 10-11px | 600-700 | 1.5-2px | 1.0 |
| Counter/small | .sans | 11px | 500 | 0 | 1.0 |
| Card label | .sans | 13-14px | 600 | 0 | 1.3 |
| Card description | .sans | 11-12px | 400 | 0 | 1.4 |
| Step number | .serif | 26px | 300 | 0 | 1.0 |

---

## Progress Bar (every slide)

Position: absolute bottom, full width
```
padding: 16px 28px 20px
z-index: 10
display: flex
align-items: center
gap: 10px
```

Track: `flex:1; height:3px; border-radius:2px; overflow:hidden`
Fill: `height:100%; width:{pct}%; border-radius:2px`
Counter: `font-size:11px; font-weight:500` — format "1/7"

Fill width = `((slideIndex + 1) / totalSlides) * 100%`

---

## Swipe Arrow (every slide EXCEPT the last)

Position: absolute right, full height
```
width: 48px
z-index: 9
display: flex
align-items: center
justify-content: center
background: linear-gradient(to right, transparent, {bg_tint})
```

SVG chevron: `<path d="M9 6l6 6-6 6" stroke="{stroke}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`

Last slide: NO arrow, progress bar at 100%

---

## Content Padding

- Standard slides: `padding: 36px 36px 52px` (52px bottom clears progress bar)
- Hero/centered slides: same padding + `justify-content: center`
- Top-aligned content: `padding: 48px 36px 52px` + `justify-content: flex-start`
- Bottom padding of 52px is NON-NEGOTIABLE — content must never overlap the progress bar

---

## Photo Placeholders

When no photo is provided, show a labeled placeholder box:

### On light slides:
```css
width: 100%;
height: 200px;
background: rgba(0,0,0,0.03);
border: 2px dashed rgba(0,0,0,0.1);
border-radius: 12px;
display: flex;
align-items: center;
justify-content: center;
```
Label: camera emoji + uppercase description, 11px, rgba(0,0,0,0.2)

### On dark slides:
```css
background: rgba(255,255,255,0.04);
border: 2px dashed rgba(255,255,255,0.1);
```
Label: camera emoji + uppercase description, 11px, rgba(255,255,255,0.2)

---

## Slide Background Alternation

Alternate light and dark backgrounds for visual rhythm. The specific pattern varies per carousel, but:
- Never put two light slides in a row
- Never put more than two dark slides in a row
- First slide is usually dark (hero/hook)
- Last slide (CTA) is usually gradient
- The alternation pattern should be part of the creative brief

---

## Anti-Repetition Rule

Before generating a new carousel for a client, query their last 5 generated carousels and send the layout recipes to Claude. Claude must pick a combination of slide layout types that does NOT duplicate any recent recipe. This ensures posts look varied in the feed even though they share the same design system.

---

## Reusable Component Patterns

### Tag pill (on dark)
```html
<span class="sans" style="display:inline-block;font-size:10px;font-weight:600;letter-spacing:2px;color:{palette.brand_light};margin-bottom:16px;">{TAG TEXT}</span>
```

### Tag pill (on light)
```html
<span class="sans" style="display:inline-block;font-size:10px;font-weight:600;letter-spacing:2px;color:{palette.brand_accent};margin-bottom:16px;">{TAG TEXT}</span>
```

### Feature card (on light slide)
```html
<div style="background:#fff;border:1px solid {palette.light_border};border-radius:12px;padding:16px;">
  <span style="font-size:20px;margin-bottom:8px;display:block;">{emoji}</span>
  <span class="sans" style="font-size:13px;font-weight:600;color:#262626;display:block;margin-bottom:4px;">{Label}</span>
  <span class="sans" style="font-size:11px;color:#8e8e8e;line-height:1.4;">{Description}</span>
</div>
```

### Feature card (on dark slide)
```html
<div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:16px;">
  <span style="font-size:20px;margin-bottom:8px;display:block;">{emoji}</span>
  <span class="sans" style="font-size:13px;font-weight:600;color:#fff;display:block;margin-bottom:4px;">{Label}</span>
  <span class="sans" style="font-size:11px;color:rgba(255,255,255,0.5);line-height:1.4;">{Description}</span>
</div>
```

### CTA button
```html
<div style="display:inline-flex;align-items:center;gap:8px;padding:12px 28px;background:{palette.light_bg};color:{palette.brand_dark};font-family:'{body_font}',sans-serif;font-weight:600;font-size:14px;border-radius:28px;">
  {CTA text}
</div>
```

### Decorative bar (for pull quotes)
```html
<div style="width:40px;height:2px;background:{palette.brand_accent};margin-bottom:16px;"></div>
```

---

## What This File Does NOT Cover

- Static post template (3-block layout with top navy, middle white, footer gray) — that's a different format
- Reel/video design — different system
- Ad creative — different system
- Logo placement specifics — handled per-client in claude_md

This file covers ONLY the carousel and multi-slide visual design system used by the KOS visual engine.
