name: ig-static-post description: "Instagram static feed post generator — creates branded 1080×1350px PNG images ready for direct upload. Use this skill whenever the user asks to create, generate, design, or build a static Instagram post, feed post, social media graphic, or IG static. Also triggers for requests like 'make a post for [client]', 'create a graphic for Instagram', 'build a social post', or any mention of static feed content. If the user uploads a photo and mentions a post topic, use this skill."
Instagram Static Feed Post Generator
You generate production-ready Instagram static feed posts as self-contained HTML files, then export them as 1080×1350px PNGs for direct upload. Every post is brand-consistent, photo-driven, and designed at 420×525px base width scaled up via Playwright's `device_scale_factor`.
Before You Start
1. Get the brand details
Pull these from the client's brand kit (CLAUDE.md or equivalent). Your KOS should already surface these, but confirm you have:
* Brand name and Instagram handle
* Primary color (hex) and Accent color (hex)
* Logo — either image files (base64 embed) or text-based lockup specs
* Fonts — heading font + body font (load from Google Fonts)
* Phone number for the CTA footer
* Tagline (if the brand has one)
* Voice & tone direction
If anything is missing, ask before generating.
2. Get the photo
The user provides the photo. Always ask for it if they haven't uploaded one. Never generate a post without a real photo unless the user explicitly says to use a placeholder or skip it.
When the user uploads a photo:
* Read the file and determine actual format with Python's `imghdr` or the `file` command (some PNGs are actually JPEGs)
* Base64 encode it
* Embed as `data:image/{actual_format};base64,...` in the HTML
* Display with `object-fit: cover` in the photo zone
3. Get the topic and copy direction
Ask what the post is about if not obvious — e.g., seasonal promo, service highlight, trust-building, social proof, etc. Then write the copy (tag label, headline, body text, CTA) in the client's voice.
Color System
Derive the full palette from the client's primary and accent colors:

```
PRIMARY        = {from brand kit}              — headers, backgrounds, authority
DEEP_PRIMARY   = {primary darkened ~30%}       — hero backgrounds, deep sections
ACCENT         = {from brand kit}              — CTAs, highlights, urgency
ACCENT_LIGHT   = {accent lightened ~15%}       — hover states, secondary highlights
LIGHT_BG       = {tinted off-white}            — light sections (never pure #fff)
LIGHT_BORDER   = {slightly darker than LIGHT_BG} — dividers
WHITE          = #FFFFFF                       — breathing room

```

LIGHT_BG should complement the primary's temperature — warm primary → warm cream, cool primary → cool gray-white. DEEP_PRIMARY is near-black tinted with the brand's color temperature.
Typography
Load the client's fonts from Google Fonts. Apply via CSS classes `.heading-font` and `.body-font`.
Font size scale (at 420px design width):
Element Size Weight Extras Headline 22–28px 700–800 letter-spacing -0.3px, line-height 1.1–1.15 Body 12–14px 400 line-height 1.5 Tag label 9–10px 600–700 letter-spacing 2–2.5px, uppercase CTA text 11–13px 700 letter-spacing 0.5–1px, uppercase Small text 11px 400 —
Layout System
You have two primary layouts. Alternate between them across posts to prevent feed repetition. Choose whichever fits the content better — photo-dominant content gets Layout 1, strong/dramatic photos get Layout 2.
Layout 1: Photo-Top / Text-Bottom
The default workhorse layout. Photo takes the top ~62%, gradient bridge transitions to text on a deep background.

```
┌─────────────────────────────┐
│  Logo (top-right, with glow)│
│                             │
│      PHOTO ZONE             │
│      (~62% of height)       │
│                             │
│  ▓▓▓ gradient bridge ▓▓▓   │
├─────────────────────────────┤
│  {{ TAG LABEL }}            │
│  {{ HEADLINE }}             │
│  {{ Body text }}            │
│         CONTENT ZONE        │
│         (deep primary bg)   │
├─────────────────────────────┤
│  {{ CTA }}    (phone number)│
│         CTA FOOTER          │
│         (accent color bg)   │
└─────────────────────────────┘

```

Photo Zone (top ~325px / 62%):
* User's photo fills this zone with `object-fit: cover`
* If no photo: dashed-border placeholder with camera icon + "Photo Placeholder" + "Drop job site photo here"
Logo Lockup (top-right of photo zone):
* Position: absolute, top 16px, right 16px
* If logo image available: embed as base64, height 44px, `object-fit: contain`
* If text-based: icon circle (accent bg, white letter) + wordmark column
* Glow for visibility on any background: 

```css
filter: drop-shadow(0 0 8px rgba(255,255,255,0.5)) drop-shadow(0 0 16px rgba(255,255,255,0.25));

```

Gradient Bridge:
* 60px tall, positioned at bottom of photo zone
* `linear-gradient(to bottom, transparent, DEEP_PRIMARY)`
* Creates smooth visual transition from photo to content
Content Zone:
* Background: DEEP_PRIMARY
* Padding: 18–20px 28px
* Vertically centered content
* Tag label → Headline → Body text (stacked)
CTA Footer:
* Full-width bar, 48px tall, ACCENT background
* Left: CTA text (heading font, 11px, bold, white, uppercase)
* Right: Phone number (heading font, 13px, bold, white)
* `display: flex; justify-content: space-between; align-items: center; padding: 0 28px;`
Layout 2: Full-Bleed Photo with Overlay
Photo fills the entire frame. Text sits on a gradient overlay at the bottom. Best for dramatic, high-impact photos.

```
┌─────────────────────────────┐
│  Logo (top-right, with glow)│
│                             │
│      FULL-BLEED PHOTO       │
│      (entire frame)         │
│                             │
│                             │
│  ░░░░░░░░░░░░░░░░░░░░░░░░  │
│  ░░ gradient overlay ░░░░░  │
│  ░░ {{ TAG LABEL }}  ░░░░░  │
│  ░░ {{ HEADLINE }}   ░░░░░  │
│  ░░ {{ Body text }}  ░░░░░  │
├─────────────────────────────┤
│  {{ CTA }}    (phone number)│
│         CTA FOOTER          │
└─────────────────────────────┘

```

Photo (full frame):
* `object-fit: cover` filling the entire 420×525 canvas (minus CTA footer)
Gradient Overlay:
* Covers the full frame
* Multi-stop gradient that's light at top (lets photo breathe) and heavy at bottom (text readability): 

```css
background: linear-gradient(  to bottom,  rgba(DEEP_PRIMARY, 0.25) 0%,  rgba(DEEP_PRIMARY, 0.15) 35%,  rgba(DEEP_PRIMARY, 0.55) 60%,  rgba(DEEP_PRIMARY, 0.92) 80%,  rgba(DEEP_PRIMARY, 0.98) 100%);

```

Content Panel (bottom, above CTA):
* Position: absolute, bottom 48px
* Padding: 28px 28px 22px
* Tag label → Headline → Body text
* Headline can be slightly larger here (up to 26px) since there's more visual room
Logo + CTA Footer: Same specs as Layout 1.
Instagram Frame (Preview Wrapper)
When displaying the post in the HTML file (for preview in browser), wrap the post canvas in an Instagram-style frame. This is purely for visualization — it gets stripped during export.
Frame structure:
* `.ig-frame` — 420px wide, white bg, 12px border-radius, subtle box-shadow
* `.ig-header` — avatar circle (primary bg + brand initial in accent) + handle + location
* `.post-viewport` — 420×525px, the actual post canvas
* `.ig-actions` — heart, comment, share, bookmark SVG icons
* `.ig-caption` — handle + placeholder caption + "2 HOURS AGO" timestamp
HTML Generation Rules
Always use Python for generating HTML files. Never use shell scripts — shell variables (`$`, backticks) corrupt HTML output.
Single-file, self-contained:
* All CSS inline in `<style>` tags
* All images as base64 data URIs
* Google Fonts loaded via `<link>` tag
* No external dependencies except fonts
CSS variables for the color system:

```css
:root {
  --primary: {PRIMARY};
  --deep-primary: {DEEP_PRIMARY};
  --accent: {ACCENT};
  --accent-light: {ACCENT_LIGHT};
  --ice-blue: {ICE_BLUE if applicable};
  --cloud-gray: {LIGHT_BG};
  --white: #FFFFFF;
}

```

Exporting as 1080×1350 PNG
After generating the HTML, export it as a production-ready PNG using Playwright.
The approach: Design at 420×525px, scale up to 1080×1350px using `device_scale_factor`. This preserves all layout and font sizing exactly as designed.

```python
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright

INPUT_HTML = Path("path/to/post.html")
OUTPUT_PATH = Path("path/to/output.png")

VIEW_W = 420
VIEW_H = 525
SCALE = 1080 / 420  # ≈ 2.5714

async def export_post():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page(
            viewport={"width": VIEW_W, "height": VIEW_H},
            device_scale_factor=SCALE,
        )

        html_content = INPUT_HTML.read_text(encoding="utf-8")
        await page.set_content(html_content, wait_until="networkidle")
        await page.wait_for_timeout(3000)  # Wait for Google Fonts to load

        # Strip the IG preview frame — isolate just the post image
        await page.evaluate("""() => {
            document.querySelectorAll('.ig-header,.ig-actions,.ig-caption')
                .forEach(el => el.style.display='none');

            const frame = document.querySelector('.ig-frame');
            frame.style.cssText = 'width:420px;height:525px;max-width:none;border-radius:0;box-shadow:none;overflow:hidden;margin:0;';

            const viewport = document.querySelector('.post-viewport');
            viewport.style.cssText = 'width:420px;height:525px;overflow:hidden;';

            document.body.style.cssText = 'padding:0;margin:0;display:block;overflow:hidden;';
        }""")
        await page.wait_for_timeout(500)

        await page.screenshot(
            path=str(OUTPUT_PATH),
            clip={"x": 0, "y": 0, "width": VIEW_W, "height": VIEW_H}
        )
        await browser.close()

asyncio.run(export_post())

```

Common mistakes to avoid
Mistake What happens Fix Setting viewport to 1080×1350 Layout reflows — fonts shrink, spacing breaks Keep 420×525, use `device_scale_factor` Shell scripts for HTML `$`, backticks, numbers get interpolated Always use Python Not waiting for fonts Headlines render in fallback serif/sans `wait_for_timeout(3000)` after `set_content` Not hiding IG frame Export includes header/actions/caption Hide `.ig-header,.ig-actions,.ig-caption` Forgetting to install Playwright Chromium not available `pip install playwright && playwright install chromium`
Copy Guidelines
Write post copy in the client's voice and tone. Pull from their brand kit for phrasing direction.
General rules:
* Tag label: 2–3 words, describes the category (e.g., "AC Maintenance", "Furnace Install", "Seasonal Special")
* Headline: short, punchy, 2 lines max at the design width. Speak to the homeowner's need, not the company's features.
* Body text: 1–2 sentences. Support the headline with a specific detail or proof point. Use `<strong>` for emphasis on key phrases.
* CTA: action-oriented, includes → arrow (e.g., "Schedule Today →", "Get a Free Estimate →", "Book Now →")
* Phone number: always in the CTA footer, every post, no exceptions.
Things to avoid in copy:
* Salesy or pushy language
* ALL CAPS panic energy
* Industry jargon the audience won't understand
* Generic phrases ("best in the business", "second to none")
* More than one offer per post
Seasonal & Promo Variations
For promotional posts (sales, seasonal specials, limited-time offers), you can enhance either layout with:
* Price callout: Large price number (60–72px, weight 900) with a strikethrough original price above it
* Savings pill: Inline badge with accent-tinted background + border, e.g., "SAVE $49 — LIMITED TIME"
* Seasonal tag: Small pill in the corner (accent bg, rounded, uppercase label), e.g., "🥚 EASTER SPECIAL"
These elements overlay onto Layout 1 or Layout 2 — they don't create a separate layout. The promo content just replaces the standard tag/headline/body in the content zone.
Design Principles
1. Single-image, export-ready — everything is baked into one PNG, no overlay UI
2. Photo-driven — the real photo does the heavy lifting; text supports it
3. Brand-derived palette — all colors stem from the client's kit, no freelancing
4. Logo always visible — glow effect ensures readability on any background
5. One clear CTA per post — never stack multiple offers
6. Phone number on every post — always in the CTA footer
7. Content fits containers — verify text doesn't overflow before exporting
8. Alternate layouts — rotate between Layout 1 and Layout 2 to keep the feed varied
