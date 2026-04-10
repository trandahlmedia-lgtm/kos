// ---------------------------------------------------------------------------
// Instagram frame wrapper components — matches reference carousel styling
// ---------------------------------------------------------------------------

/** Escape HTML entities */
function esc(str: string | undefined): string {
  if (!str) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Profile header row — avatar circle with initial + handle + location.
 * Uses class="serif" so it picks up the heading font defined in the document CSS.
 */
export function renderHeader(clientName: string, handle?: string, location?: string, logoUrl?: string): string {
  const initial = clientName.charAt(0).toUpperCase()
  const displayHandle = handle ? esc(handle) : esc(clientName.toLowerCase().replace(/\s+/g, ''))
  const loc = location ?? ''

  const avatarHtml = logoUrl
    ? `<img src="${esc(logoUrl)}" style="width:32px;height:32px;border-radius:50%;object-fit:cover;" alt="${esc(clientName)}">`
    : `<div style="width:32px;height:32px;border-radius:50%;background:#262626;display:flex;align-items:center;justify-content:center;">
      <span style="font-size:14px;font-weight:700;color:#fff;line-height:1;">${esc(initial)}</span>
    </div>`

  return `<div class="ig-header">
    ${avatarHtml}
    <div><div class="ig-handle">${displayHandle}${loc ? `<br><span class="ig-handle-sub">${esc(loc)}</span>` : ''}</div></div>
  </div>`
}

/**
 * Dot indicators — first dot active. Uses .ig-dot class for JS toggling.
 */
export function renderDots(totalSlides: number): string {
  const dots = Array.from({ length: totalSlides }, (_, i) => {
    const cls = i === 0 ? 'ig-dot active' : 'ig-dot'
    return `<div class="${cls}" data-dot="${i}"></div>`
  }).join('')

  return `<div class="ig-dots" id="dots">${dots}</div>`
}

/**
 * Action icons — heart, comment, share, bookmark (exact Instagram SVGs from reference).
 */
export function renderActions(): string {
  const heart = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" stroke="#262626" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`
  const comment = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="#262626" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`
  const share = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke="#262626" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`
  const bookmark = `<svg class="ig-bookmark" width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" stroke="#262626" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`

  return `<div class="ig-actions">
    ${heart}
    ${comment}
    ${share}
    ${bookmark}
  </div>`
}

/**
 * Caption row — bold handle + caption text + timestamp.
 */
export function renderCaption(handle: string, caption: string, websiteUrl?: string): string {
  const displayHandle = esc(handle)
  const displayCaption = esc(caption)
  const websiteHtml = websiteUrl
    ? `<span style="display:block;margin-top:4px;font-size:11px;color:#00376b;">${esc(websiteUrl)}</span>`
    : ''

  return `<div class="ig-caption"><strong>${displayHandle}</strong> ${displayCaption}${websiteHtml}<span class="time">2 HOURS AGO</span></div>`
}
