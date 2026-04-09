// ---------------------------------------------------------------------------
// Instagram frame wrapper components
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
 * Profile header row — brand initial circle + handle + "Sponsored" subtitle.
 */
export function renderHeader(clientName: string, handle?: string): string {
  const initial = clientName.charAt(0).toUpperCase()
  const displayHandle = handle ? esc(handle) : esc(clientName.toLowerCase().replace(/\s+/g, ''))

  return `<div class="ig-header" style="display:flex;align-items:center;gap:10px;padding:10px 14px;">
    <div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#833ab4,#fd1d1d,#fcb045);display:flex;align-items:center;justify-content:center;">
      <div style="width:28px;height:28px;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center;">
        <span style="font-size:14px;font-weight:700;color:#262626;line-height:1;">${esc(initial)}</span>
      </div>
    </div>
    <div style="display:flex;flex-direction:column;">
      <span style="font-size:13px;font-weight:600;color:#262626;line-height:1.3;">${displayHandle}</span>
      <span style="font-size:11px;color:#8e8e8e;line-height:1.3;">Sponsored</span>
    </div>
    <div style="margin-left:auto;display:flex;align-items:center;cursor:pointer;">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="#262626"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
    </div>
  </div>`
}

/**
 * Dot indicators — first dot active.
 */
export function renderDots(totalSlides: number): string {
  const dots = Array.from({ length: totalSlides }, (_, i) => {
    const bg = i === 0 ? '#0095f6' : '#c7c7c7'
    return `<div class="dot" data-index="${i}" style="width:6px;height:6px;border-radius:50%;background:${bg};transition:background 0.2s ease;"></div>`
  }).join('')

  return `<div class="ig-dots" style="display:flex;justify-content:center;gap:4px;padding:10px 0 4px;">${dots}</div>`
}

/**
 * Action icons — heart, comment, share, bookmark (exact Instagram SVGs).
 */
export function renderActions(): string {
  const heart = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#262626" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`
  const comment = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#262626" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`
  const share = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#262626" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`
  const bookmark = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#262626" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>`

  return `<div class="ig-actions" style="display:flex;align-items:center;padding:6px 14px;">
    <div style="display:flex;gap:16px;">
      ${heart}${comment}${share}
    </div>
    <div style="margin-left:auto;">${bookmark}</div>
  </div>`
}

/**
 * Caption row — bold handle + caption text + timestamp.
 */
export function renderCaption(handle: string, caption: string): string {
  const displayHandle = esc(handle)
  const displayCaption = esc(caption)

  return `<div class="ig-caption" style="padding:4px 14px 12px;font-size:13px;color:#262626;line-height:1.5;">
    <span style="font-weight:600;">${displayHandle}</span> ${displayCaption}
    <div style="font-size:10px;color:#8e8e8e;margin-top:6px;text-transform:uppercase;letter-spacing:0.5px;">2 HOURS AGO</div>
  </div>`
}
