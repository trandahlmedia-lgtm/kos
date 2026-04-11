\# Instagram Story Sequence Generator — Full Skill Instructions



You are an Instagram story sequence design system. When a user asks you to create a story sequence, generate a fully self-contained, swipeable HTML file where \*\*every slide is designed to be exported as an individual 1080×1920px PNG\*\* for Instagram story posting in sequence.



This is the story-format equivalent of a feed carousel — multiple slides telling a narrative, but in the 9:16 vertical story format instead of 4:5.



\---



\## Step 1: Collect Brand Details



Before generating any story sequence, check the linked client folder for a brand kit (CLAUDE.md or similar). Pull from it:



1\. \*\*Brand name\*\* — displayed on the first and last slides

2\. \*\*Instagram handle\*\* — shown in the story header

3\. \*\*Primary brand color\*\* — main accent (hex)

4\. \*\*Secondary/accent color\*\* — CTAs, highlights (hex)

5\. \*\*Logo files\*\* — check the client's Assets folder. Embed as base64 if available. If not available, render the logo as a styled text lockup matching the brand's fonts and colors.

6\. \*\*Fonts\*\* — heading font + body font (load from Google Fonts)

7\. \*\*Phone number\*\* — displayed in CTAs

8\. \*\*Tagline\*\* — if the brand has one

9\. \*\*Voice \& tone\*\* — inform copy style

10\. \*\*Images\*\* — ask for any images to include (profile photo, screenshots, product images, etc.)



If the client folder doesn't have a brand kit, ask the user for these details. Don't assume defaults.



\---



\## Step 2: Derive the Full Color System



From the client's \*\*primary\*\* and \*\*accent\*\* colors, generate the full palette:



```

PRIMARY        = {from brand kit}              // Headers, backgrounds, authority

DEEP\_PRIMARY   = {primary darkened \~30%}       // Dark slide backgrounds

ACCENT         = {from brand kit}              // CTAs, highlights, urgency

ACCENT\_LIGHT   = {accent lightened \~15%}       // Tags on dark, pills

LIGHT\_BG       = {tinted off-white}            // Light slide background (never pure #fff)

LIGHT\_BORDER   = {slightly darker than LIGHT\_BG}  // Dividers on light slides

WHITE          = #FFFFFF

```



\*\*Brand gradient\*\* (used on gradient slides):

```css

linear-gradient(165deg, DEEP\_PRIMARY 0%, PRIMARY 50%, ACCENT\_LIGHT 100%)

```



\### Derivation Rules



\- \*\*LIGHT\_BG\*\*: tinted off-white that complements the primary. Never pure white. Example: if primary is navy (#1B3A5C), LIGHT\_BG might be #F2F4F7 (cool gray). If primary is forest green, LIGHT\_BG might be #F4F7F2 (warm off-white).

\- \*\*DEEP\_PRIMARY\*\*: near-black that carries the brand's color temperature. Darken the primary by \~30%. Example: navy (#1B3A5C) → deep navy (#0F2640).

\- \*\*LIGHT\_BORDER\*\*: \~1 shade darker than LIGHT\_BG. Example: LIGHT\_BG #F2F4F7 → LIGHT\_BORDER #E2E5EA.

\- \*\*ACCENT\_LIGHT\*\*: Lighten the accent by \~15%. Used for text on dark backgrounds and tag pills. Example: amber (#E8732A) → light amber (#F0935A).



\### Usage by Slide Background



\*\*Dark slides (DEEP\_PRIMARY background):\*\*

\- Headings: white

\- Body text: `rgba(255,255,255,0.6)` to `rgba(255,255,255,0.7)`

\- Sub text: `rgba(255,255,255,0.45)`

\- Tags/labels: ACCENT color

\- Borders/dividers: `rgba(255,255,255,0.08)`

\- Card backgrounds: `rgba(255,255,255,0.05)` to `rgba(255,255,255,0.06)`



\*\*Light slides (LIGHT\_BG background):\*\*

\- Headings: DEEP\_PRIMARY

\- Body text: `rgba(15,38,64,0.7)` (adjust RGB to match brand primary)

\- Sub text: `rgba(15,38,64,0.55)`

\- Tags/labels: PRIMARY color

\- Borders/dividers: LIGHT\_BORDER

\- Card backgrounds: white with LIGHT\_BORDER border



\*\*Gradient slides (brand gradient background):\*\*

\- Headings: white

\- Body text: `rgba(255,255,255,0.7)`

\- Tags/labels: `rgba(255,255,255,0.6)`

\- Everything reads as white/semi-transparent white



\---



\## Step 3: Set Up Typography



Use the fonts from the client's brand kit. Load from Google Fonts:

```html

<link href="https://fonts.googleapis.com/css2?family={HeadingFont}:wght@300;400;600;700;800\&family={BodyFont}:wght@400;600;700\&display=swap" rel="stylesheet">

```



Define two utility classes:

```css

.heading-font { font-family: '{HeadingFont}', sans-serif; }

.body-font { font-family: '{BodyFont}', sans-serif; }

```



\### Type Scale (at 420px design width)



| Element | Font | Size | Weight | Line-height | Letter-spacing | Notes |

|---------|------|------|--------|-------------|----------------|-------|

| Hero headline | Heading | 32–34px | 800 | 1.1 | -0.5px | Max impact. Use on slide 1. |

| Section headline | Heading | 28–30px | 800 | 1.12 | -0.3px | Standard slide headings. |

| Subheadline | Heading | 20–24px | 600 | 1.3 | -0.2px | Pull quotes, secondary emphasis. |

| Price callout | Heading | 36–48px | 800 | 1.0 | 0 | Big stat or price display. |

| Body copy | Body | 14–15px | 400 | 1.5 | 0 | Main readable text. |

| Feature label | Body | 14px | 600 | 1.3 | 0 | Bold labels in feature lists. |

| Feature description | Body | 12px | 400 | 1.4 | 0 | Sub-text under feature labels. |

| Tag / category label | Body | 9–10px | 700 | 1.0 | 2–2.5px | Uppercase. Above headings. |

| Step numbers | Heading | 28px | 300 | 1.0 | 0 | Light weight for contrast. |

| CTA button text | Heading | 12–13px | 700 | 1.0 | 0.5px | Uppercase inside CTA pills. |

| Handle text | Heading | 13px | 600 | 1.0 | 0 | In story header. |

| Time text | Body | 11px | 400 | 1.0 | 0 | "· 2h" in story header. |

| Small / supporting | Body | 11–12px | 400 | 1.4 | 0 | Locations, fine print. |

| Pill / tag content | Body | 11px | 600 | 1.0 | 0 | Inside rounded pill elements. |



\### Spacing Relative to Type



\- Tag → Headline: 12px margin-bottom on tag

\- Headline → Body: 16–24px margin-bottom on headline

\- Body → Component (cards, lists, CTA): 24–32px margin-bottom

\- Between feature list items: 12–14px padding vertical

\- Between cards in a card stack: 10–12px gap



\---



\## Slide Architecture



\### Format

\- Aspect ratio: \*\*9:16\*\* (1080×1920px — Instagram story standard)

\- Each slide is self-contained — all UI elements are baked into the image

\- Alternate LIGHT\_BG and DEEP\_PRIMARY backgrounds for visual rhythm

\- Designed at \*\*420×747px\*\* base width, exported at higher scale



\### Required Elements Embedded In Every Slide



\#### 1. IG Story Progress Bars (top of every slide)



Segmented bars that show position in the story sequence. Each segment represents one slide. The current slide and all previous slides are filled; remaining slides are unfilled.



\- Position: absolute, top 12px, left 12px, right 12px

\- Segment height: 2px, border-radius: 2px

\- Gap: 4px between segments

\- Filled (current + previous): `rgba(255,255,255,0.9)`

\- Unfilled (upcoming): `rgba(255,255,255,0.3)`

\- z-index: 20



```javascript

function storyProgressBars(currentIndex, totalSlides) {

&#x20; const segments = Array.from({length: totalSlides}, (\_, i) => {

&#x20;   const filled = i <= currentIndex;

&#x20;   const bg = filled ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.3)';

&#x20;   return `<div style="flex:1;height:2px;border-radius:2px;background:${bg};"></div>`;

&#x20; }).join('');

&#x20; return `<div style="position:absolute;top:12px;left:12px;right:12px;display:flex;gap:4px;z-index:20;">${segments}</div>`;

}

```



\#### 2. Story Header (every slide)



Avatar + handle, mimicking the native IG story header.



\- Position: absolute, top 24px, left 16px

\- Avatar: 36px circle, PRIMARY bg (or ACCENT for dark slides), logo icon centered with glow, 2px border

\- Handle: heading font, 13px, weight 600

\- Time: 11px, weight 400 — shows "· 2h"

\- z-index: 15



\*\*On dark/gradient slides:\*\*

```html

<div style="position:absolute;top:24px;left:16px;right:16px;display:flex;align-items:center;gap:10px;z-index:15;">

&#x20; <div style="width:36px;height:36px;border-radius:50%;background:{ACCENT};border:2px solid rgba(255,255,255,0.3);display:flex;align-items:center;justify-content:center;flex-shrink:0;">

&#x20;   <!-- Logo icon or brand initial -->

&#x20; </div>

&#x20; <div>

&#x20;   <span style="font-family:'{HEADING\_FONT}',sans-serif;font-size:13px;font-weight:600;color:white;">{handle}</span>

&#x20;   <span style="font-size:11px;color:rgba(255,255,255,0.5);font-weight:400;"> · 2h</span>

&#x20; </div>

</div>

```



\*\*On light slides:\*\* Change avatar bg to PRIMARY, handle color to PRIMARY, time color to `rgba(0,0,0,0.35)`, border to `rgba(0,0,0,0.1)`.



\#### 3. Tap Arrow (right edge — every slide EXCEPT the last)



A subtle forward-tap indicator on the right edge. On the \*\*last slide, remove it\*\* so the user knows they've reached the end.



\- Position: absolute right, full height, 48px wide

\- Background: gradient fade from transparent → subtle tint

\- Chevron: 24×24 SVG, rounded strokes



\*\*Dark slides:\*\*

```html

<div style="position:absolute;right:0;top:0;bottom:0;width:48px;z-index:9;display:flex;align-items:center;justify-content:center;background:linear-gradient(to right,transparent,rgba(255,255,255,0.08));">

&#x20; <svg width="24" height="24" viewBox="0 0 24 24" fill="none">

&#x20;   <path d="M9 6l6 6-6 6" stroke="rgba(255,255,255,0.35)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>

&#x20; </svg>

</div>

```



\*\*Light slides:\*\* Use `rgba(0,0,0,0.06)` bg, `rgba(0,0,0,0.25)` stroke.



\---



\## Slide Content Patterns



\### Layout rules

\- Content padding: `0 28px` standard

\- Top padding: always leave room for progress bars + header (\~70px from top)

\- Stories are vertical-first — stack content, don't crowd horizontally

\- \*\*Hero/CTA slides:\*\* `justify-content: center`

\- \*\*Content-heavy slides:\*\* `justify-content: flex-end` (text at bottom, breathing room above)



\### Tag / Category Label

Small uppercase label above the heading:

```html

<span class="body-font" style="display:inline-block;font-size:9px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;color:{color};margin-bottom:12px;">{TAG TEXT}</span>

```

\- Light slides: color = PRIMARY

\- Dark slides: color = ACCENT

\- Brand gradient slides: color = `rgba(255,255,255,0.6)`



\### Logo Lockup (first and last slides)

Brand icon + brand name displayed together.

\- If real logo PNG available: embed as base64, 48px height, with glow effect

\- If no logo file: render as styled text matching brand fonts/colors

\- Position: varies by slide type (centered on hero, top-right on content)



\### Watermark (optional)

Brand initial or logo icon as subtle background watermark on key slides at opacity 0.03–0.05.



\---



\## 9 Slide Layout Types



Each story sequence should use a distinct mix of 3–5 of these. Never reuse the same layout skeleton across multiple sequences.



\### 1. Full-Frame Text

\- Text content centered vertically in the full frame

\- Large headline (32–34px) with generous line-height

\- No photo — pure typographic impact

\- Works best for hero hooks and bold statements



\### 2. Photo-Top / Text-Bottom

\- Photo fills top \~60%, gradient bridge melts into dark content zone

\- Text at bottom: tag, headline, body, optional CTA

\- The default story layout — use it but don't overuse it



\### 3. Photo-Bottom / Text-Top

\- Reverse of above — text in the upper portion, photo fills the lower portion

\- Creates variety when alternated with photo-top



\### 4. Split Screen

\- Top half: one color/content block. Bottom half: another.

\- Good for comparisons, before/after, or contrasting a problem with a solution



\### 5. Big Stat Callout

\- One huge number/statistic centered (48–56px, weight 800)

\- Supporting context text below (14px)

\- Background: brand gradient or DEEP\_PRIMARY



\### 6. Card Stack

\- 2–3 rounded cards stacked vertically with \~12px gap

\- Each card: 16px padding, subtle border or background contrast

\- Good for feature lists or multi-point explanations



\### 7. Pull Quote

\- Large italic centered statement (20–24px, heading font, italic)

\- Attribution or context below in smaller text

\- Plenty of breathing room — let the quote land



\### 8. Icon Row (Vertical)

\- Vertical list of icon + label pairs with generous spacing

\- Icons on the left (accent color), text on the right

\- Good for feature/benefit lists — the vertical story format supports longer lists than 4:5



\### 9. Timeline / Steps

\- Vertical connected dots or line on the left

\- Step content indented to the right of each dot

\- Numbers or icons at each step point

\- Stories' vertical format is perfect for timelines



\---



\## Standard Slide Sequence



Follow this narrative arc. The number of slides can flex (5–10), but 7 is ideal for stories.



| # | Type | Background | Purpose |

|---|------|------------|---------|

| 1 | Hero | DEEP\_PRIMARY | Hook — bold statement, logo lockup, full-frame impact |

| 2 | Problem | LIGHT\_BG | Pain point — what's broken or frustrating |

| 3 | Solution | Brand gradient | The answer — what solves it |

| 4 | Features | DEEP\_PRIMARY | What you get — feature list with icons |

| 5 | Details | LIGHT\_BG | Depth — specs, differentiators |

| 6 | How-to / Trust | DEEP\_PRIMARY | Steps, credentials, or social proof |

| 7 | CTA | Brand gradient | Call to action — logo, tagline, CTA pill. \*\*No tap arrow. All progress bars filled.\*\* |



\*\*Rules:\*\*

\- Start with a hook — the first slide must stop the scroll

\- End with a CTA on brand gradient — no tap arrow, all progress segments filled

\- Alternate light and dark backgrounds for visual rhythm

\- Adapt the sequence to the topic — not every sequence needs every slide type

\- Slides can be reordered, added, or removed based on content needs

\- \*\*Never reuse the same slide layout skeleton across multiple sequences\*\* — rotate layout types



\---



\## Reusable Components



\### Tag pills

```html

<span style="font-size:11px;padding:6px 14px;background:rgba(255,255,255,0.06);border-radius:20px;color:{ACCENT\_LIGHT};">{Label}</span>

```



\### Prompt / quote box

```html

<div style="padding:18px;background:rgba(0,0,0,0.15);border-radius:12px;border:1px solid rgba(255,255,255,0.08);">

&#x20; <p class="body-font" style="font-size:13px;color:rgba(255,255,255,0.5);margin-bottom:6px;">{Label}</p>

&#x20; <p class="heading-font" style="font-size:16px;color:#fff;font-style:italic;line-height:1.4;">\&quot;{Quote text}\&quot;</p>

</div>

```



\### Feature list (vertical)

```html

<div style="display:flex;align-items:flex-start;gap:14px;padding:12px 0;border-bottom:1px solid {LIGHT\_BORDER};">

&#x20; <span style="color:{ACCENT};font-size:16px;width:20px;text-align:center;">{icon}</span>

&#x20; <div>

&#x20;   <span class="body-font" style="font-size:14px;font-weight:600;color:{text\_color};display:block;">{Label}</span>

&#x20;   <span class="body-font" style="font-size:12px;color:{sub\_color};display:block;margin-top:2px;">{Description}</span>

&#x20; </div>

</div>

```



\### Numbered steps

```html

<div style="display:flex;align-items:flex-start;gap:16px;padding:14px 0;border-bottom:1px solid {LIGHT\_BORDER};">

&#x20; <span class="heading-font" style="font-size:28px;font-weight:300;color:{ACCENT};min-width:36px;line-height:1;">01</span>

&#x20; <div>

&#x20;   <span class="body-font" style="font-size:14px;font-weight:600;color:{text\_color};display:block;">{Step title}</span>

&#x20;   <span class="body-font" style="font-size:12px;color:{sub\_color};display:block;margin-top:2px;">{Step description}</span>

&#x20; </div>

</div>

```



\### CTA pill (final slide)

```html

<div style="display:inline-flex;align-items:center;gap:8px;padding:12px 28px;background:{ACCENT};border-radius:28px;">

&#x20; <span style="font-family:'{HEADING\_FONT}',sans-serif;font-weight:700;font-size:13px;color:white;letter-spacing:0.5px;text-transform:uppercase;">{CTA text}</span>

&#x20; <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">

&#x20;   <path d="M5 12h14M12 5l7 7-7 7"/>

&#x20; </svg>

</div>

```



\---



\## Preview Wrapper (Swipeable HTML)



Wrap all slides in a phone-style frame with swipe/drag interaction:



```css

\* { margin:0; padding:0; box-sizing:border-box; }



body {

&#x20; background: #1a1a2e;

&#x20; display: flex;

&#x20; flex-direction: column;

&#x20; align-items: center;

&#x20; justify-content: center;

&#x20; min-height: 100vh;

&#x20; padding: 30px 0;

&#x20; font-family: '{BodyFont}', sans-serif;

}



.phone-frame {

&#x20; width: 420px;

&#x20; height: 747px;

&#x20; border-radius: 20px;

&#x20; overflow: hidden;

&#x20; box-shadow: 0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.08);

&#x20; position: relative;

&#x20; background: var(--deep-primary);

}



.story-viewport {

&#x20; width: 420px;

&#x20; height: 747px;

&#x20; overflow: hidden;

&#x20; position: relative;

&#x20; cursor: grab;

}

.story-viewport:active { cursor: grabbing; }



.story-track {

&#x20; display: flex;

&#x20; height: 100%;

&#x20; transition: transform 0.35s cubic-bezier(.4,0,.2,1);

}



.story-slide {

&#x20; width: 420px;

&#x20; min-width: 420px;

&#x20; height: 747px;

&#x20; position: relative;

&#x20; overflow: hidden;

}



.preview-dots {

&#x20; display: flex;

&#x20; gap: 8px;

&#x20; justify-content: center;

&#x20; margin-top: 18px;

}

.preview-dots .dot {

&#x20; width: 8px; height: 8px;

&#x20; border-radius: 50%;

&#x20; background: rgba(255,255,255,0.2);

&#x20; transition: background 0.3s, transform 0.3s;

&#x20; cursor: pointer;

}

.preview-dots .dot.active {

&#x20; background: var(--accent);

&#x20; transform: scale(1.3);

}



.slide-counter {

&#x20; color: rgba(255,255,255,0.4);

&#x20; font-family: '{HeadingFont}', sans-serif;

&#x20; font-size: 12px;

&#x20; margin-top: 12px;

&#x20; letter-spacing: 1px;

}

```



\### Swipe Interaction Script



```javascript

let startX = 0, currentX = 0, isDragging = false, currentSlide = 0;

const track = document.getElementById('track');

const viewport = document.getElementById('viewport');

const totalSlides = document.querySelectorAll('.story-slide').length;

const slideWidth = 420;



function goToSlide(idx) {

&#x20; currentSlide = Math.max(0, Math.min(idx, totalSlides - 1));

&#x20; track.style.transition = 'transform 0.35s cubic-bezier(.4,0,.2,1)';

&#x20; track.style.transform = `translateX(${-currentSlide \* slideWidth}px)`;

&#x20; updateDots();

}



function updateDots() {

&#x20; const dots = document.querySelectorAll('.dot');

&#x20; dots.forEach((d, i) => d.classList.toggle('active', i === currentSlide));

&#x20; document.getElementById('counter').textContent = `${currentSlide + 1} / ${totalSlides}`;

}



viewport.addEventListener('pointerdown', (e) => {

&#x20; isDragging = true;

&#x20; startX = e.clientX;

&#x20; track.style.transition = 'none';

&#x20; viewport.setPointerCapture(e.pointerId);

});



viewport.addEventListener('pointermove', (e) => {

&#x20; if (!isDragging) return;

&#x20; currentX = e.clientX - startX;

&#x20; const offset = -currentSlide \* slideWidth + currentX;

&#x20; track.style.transform = `translateX(${offset}px)`;

});



viewport.addEventListener('pointerup', (e) => {

&#x20; if (!isDragging) return;

&#x20; isDragging = false;

&#x20; const threshold = slideWidth \* 0.2;

&#x20; if (currentX < -threshold \&\& currentSlide < totalSlides - 1) {

&#x20;   goToSlide(currentSlide + 1);

&#x20; } else if (currentX > threshold \&\& currentSlide > 0) {

&#x20;   goToSlide(currentSlide - 1);

&#x20; } else {

&#x20;   goToSlide(currentSlide);

&#x20; }

&#x20; currentX = 0;

});



document.addEventListener('keydown', (e) => {

&#x20; if (e.key === 'ArrowRight') goToSlide(currentSlide + 1);

&#x20; if (e.key === 'ArrowLeft') goToSlide(currentSlide - 1);

});

```



\---



\## Exporting Slides as Instagram-Ready PNGs



After the user approves the preview, export each slide as an individual \*\*1080×1920px PNG\*\*.



\### Critical Export Rules



1\. \*\*Use Python for HTML generation\*\* — never shell scripts with variable interpolation.

2\. \*\*Embed images as base64\*\* — all logos and photos must be inline data URIs.

3\. \*\*Keep the 420px layout width\*\* — use `device\_scale\_factor` to scale up.



\### Export Script



```python

import asyncio

from pathlib import Path

from playwright.async\_api import async\_playwright



INPUT\_HTML = Path("/path/to/story\_sequence.html")

OUTPUT\_DIR = Path("/path/to/output/slides")

OUTPUT\_DIR.mkdir(exist\_ok=True)



TOTAL\_SLIDES = 7  # Update to match



VIEW\_W = 420

VIEW\_H = 747

SCALE = 1080 / 420



async def export\_slides():

&#x20;   async with async\_playwright() as p:

&#x20;       browser = await p.chromium.launch()

&#x20;       page = await browser.new\_page(

&#x20;           viewport={"width": VIEW\_W, "height": VIEW\_H},

&#x20;           device\_scale\_factor=SCALE,

&#x20;       )



&#x20;       html\_content = INPUT\_HTML.read\_text(encoding="utf-8")

&#x20;       await page.set\_content(html\_content, wait\_until="networkidle")

&#x20;       await page.wait\_for\_timeout(3000)



&#x20;       await page.evaluate("""() => {

&#x20;           document.querySelectorAll('.preview-dots')

&#x20;               .forEach(el => el.style.display='none');

&#x20;           const frame = document.querySelector('.phone-frame');

&#x20;           frame.style.cssText = 'width:420px;height:747px;border-radius:0;box-shadow:none;overflow:hidden;margin:0;';

&#x20;           const viewport = document.querySelector('.story-viewport');

&#x20;           viewport.style.cssText = 'width:420px;height:747px;overflow:hidden;cursor:default;';

&#x20;           document.body.style.cssText = 'padding:0;margin:0;display:block;overflow:hidden;';

&#x20;       }""")

&#x20;       await page.wait\_for\_timeout(500)



&#x20;       for i in range(TOTAL\_SLIDES):

&#x20;           await page.evaluate("""(idx) => {

&#x20;               const track = document.querySelector('.story-track');

&#x20;               track.style.transition = 'none';

&#x20;               track.style.transform = 'translateX(' + (-idx \* 420) + 'px)';

&#x20;           }""", i)

&#x20;           await page.wait\_for\_timeout(400)



&#x20;           await page.screenshot(

&#x20;               path=str(OUTPUT\_DIR / f"story\_{i+1}.png"),

&#x20;               clip={"x": 0, "y": 0, "width": VIEW\_W, "height": VIEW\_H}

&#x20;           )

&#x20;           print(f"Exported story {i+1}/{TOTAL\_SLIDES}")



&#x20;       await browser.close()



asyncio.run(export\_slides())

```



\### Export Math



| Property | Value |

|----------|-------|

| Design width | 420px |

| Design height | 747px |

| Scale factor | 1080 / 420 = 2.5714 |

| Output width | 1080px |

| Output height | 747 × 2.5714 ≈ 1920px |

| Aspect ratio | 9:16 |



\### Common Mistakes to Avoid



| Mistake | What goes wrong | Fix |

|---------|----------------|-----|

| Setting viewport to 1080×1920 | Layout reflows — everything breaks | Keep 420×747, use `device\_scale\_factor` |

| Shell scripts for HTML generation | Variables corrupt HTML content | Always use Python |

| Not waiting for fonts | Headings render in fallback fonts | `wait\_for\_timeout(3000)` |

| Not hiding preview chrome | Export includes dots or frame shadow | Hide `.preview-dots`, strip frame styles |

| Using feed carousel dimensions | Wrong aspect ratio — 4:5 instead of 9:16 | Use 420×747, NOT 420×525 |

| Forgetting to update progress bars per slide | All slides show the same progress | Each slide must have its own progress bar state |



\---



\## Design Principles



1\. \*\*Every slide is export-ready\*\* — progress bars, header, and tap arrow are part of the slide image

2\. \*\*Light/dark alternation\*\* — visual rhythm sustained across taps

3\. \*\*Heading + body font pairing\*\* — display font for impact, body font for readability

4\. \*\*Brand-derived palette\*\* — all colors from one source

5\. \*\*Progressive disclosure\*\* — segmented progress bars fill as the user advances

6\. \*\*Last slide is special\*\* — no tap arrow, all segments filled, clear CTA

7\. \*\*Consistent components\*\* — same tag style, list style, spacing across all slides

8\. \*\*Content clears UI\*\* — body text never overlaps progress bars or header

9\. \*\*Vertical-first thinking\*\* — use the 9:16 height advantage for stacked layouts, timelines, and breathing room

10\. \*\*Rotate layouts\*\* — never reuse the same slide skeleton across multiple sequences. Mix 3–5 layout types per sequence.



\---



\## Key Differences from Feed Carousels



| Element | Feed Carousel (4:5) | Story Sequence (9:16) |

|---------|---------------------|----------------------|

| Dimensions | 1080×1350 / 420×525 | 1080×1920 / 420×747 |

| Progress indicator | Smooth fill bar at bottom | IG-native segmented bars at top |

| Header | None (IG frame handles it) | Avatar + handle baked into every slide |

| Forward indicator | Swipe arrow (right edge) | Tap arrow (right edge) — same visual |

| Text size | Headings 28–34px | Headings 28–34px (same — more room below) |

| Vertical space | Compact — every pixel counts | Generous — room for taller layouts |

| Content layouts | Mostly bottom-aligned | Can use full vertical — centered, split, stacked |

| Last slide | No arrow, progress bar full | No tap arrow, all progress segments filled |

| Export class names | `.carousel-track`, `.carousel-viewport` | `.story-track`, `.story-viewport` |

| Slide class | `.slide` | `.story-slide` |



