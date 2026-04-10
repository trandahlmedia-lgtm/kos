'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { X, RefreshCw, Download, Loader2, Trash2, Pencil, Check } from 'lucide-react'
import { useRouter } from 'next/navigation'
import {
  getVisualForPost,
  generateVisualAction,
  deleteVisualAction,
  updateVisualHtmlAction,
} from '@/lib/actions/visuals'
import type { PostVisual } from '@/types'

// ---------------------------------------------------------------------------
// Editing script injection
// ---------------------------------------------------------------------------

function injectEditingScript(html: string): string {
  const injection = `<style id="__kos-edit-style">
[data-field]{transition:outline .15s,box-shadow .15s;cursor:text;position:relative}
[data-field]:hover{outline:1px dashed rgba(232,115,42,.5);outline-offset:4px}
[data-field].editing{outline:1px solid #E8732A;outline-offset:4px;box-shadow:0 0 0 4px rgba(232,115,42,.1)}
[data-field]:focus{outline:1px solid #E8732A;outline-offset:4px}
.__kos-tip{position:absolute;top:-24px;left:50%;transform:translateX(-50%);background:#E8732A;color:#fff;font-size:10px;font-family:sans-serif;padding:2px 6px;border-radius:3px;white-space:nowrap;pointer-events:none;z-index:9999}
[data-photo-slot]{cursor:pointer;position:relative;transition:border-color .15s}
[data-photo-slot]:hover{border-color:rgba(232,115,42,.6)!important}
.__kos-photo-tip{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(232,115,42,.08);border-radius:inherit;pointer-events:none;z-index:9998}
.__kos-photo-tip span{font-size:11px;color:#E8732A;font-family:sans-serif;letter-spacing:.3px}
</style>
<script id="__kos-edit-script">(function(){
var SL=['heading','tag','cta','stat'];
document.querySelectorAll('[data-field]').forEach(function(el){
  var orig='',tip=null;
  function rmTip(){if(tip){tip.remove();tip=null;}}
  el.addEventListener('mouseenter',function(){
    if(el.contentEditable==='true')return;
    tip=document.createElement('span');
    tip.className='__kos-tip';tip.textContent='Click to edit';el.appendChild(tip);
  });
  el.addEventListener('mouseleave',rmTip);
  el.addEventListener('click',function(e){
    e.stopPropagation();
    if(el.contentEditable==='true')return;
    rmTip();orig=el.innerHTML;
    el.contentEditable='true';el.classList.add('editing');el.focus();
    var r=document.createRange();r.selectNodeContents(el);
    var s=window.getSelection();if(s){s.removeAllRanges();s.addRange(r);}
  });
  el.addEventListener('blur',function(){
    if(el.contentEditable!=='true')return;
    el.contentEditable='false';el.classList.remove('editing');
    window.parent.postMessage({type:'slide-text-edit',slideIndex:parseInt(el.dataset.slide||'0',10),field:el.dataset.field,value:el.innerHTML},'*');
  });
  el.addEventListener('keydown',function(e){
    e.stopPropagation();
    if(e.key==='Enter'&&SL.indexOf(el.dataset.field)!==-1){e.preventDefault();el.blur();return;}
    if(e.key==='Escape'){el.innerHTML=orig;el.contentEditable='false';el.classList.remove('editing');rmTip();}
  });
  ['pointerdown','pointermove','pointerup'].forEach(function(ev){
    el.addEventListener(ev,function(e){e.stopPropagation();});
  });
});
document.querySelectorAll('[data-photo-slot]').forEach(function(el){
  var tip=null;
  function rmTip(){if(tip){tip.remove();tip=null;}}
  el.addEventListener('mouseenter',function(){
    if(tip)return;
    tip=document.createElement('div');
    tip.className='__kos-photo-tip';
    tip.innerHTML='<span>\uD83D\uDCF7 Click to upload</span>';
    el.appendChild(tip);
  });
  el.addEventListener('mouseleave',rmTip);
  el.addEventListener('click',function(e){
    e.stopPropagation();rmTip();
    var slotId=el.dataset.photoSlot||'';
    var m=slotId.match(/slide-(\d+)/);
    window.parent.postMessage({type:'photo-slot-clicked',slotId:slotId,slideIndex:m?parseInt(m[1],10):0},'*');
  });
});
window.addEventListener('message',function(e){
  if(!e.data)return;
  if(e.data.type==='photo-uploaded'){
    var slot=document.querySelector('[data-photo-slot="'+e.data.slotId+'"]');
    if(!slot)return;
    slot.style.backgroundImage='url('+e.data.url+')';
    slot.style.backgroundSize='cover';
    slot.style.backgroundPosition='center';
    slot.style.border='none';
    slot.innerHTML='';
    var m2=(e.data.slotId||'').match(/slide-(\d+)/);
    window.parent.postMessage({type:'photo-updated',slotId:e.data.slotId,slideIndex:m2?parseInt(m2[1],10):0},'*');
    return;
  }
  if(e.data.type!=='request-full-html')return;
  var c=document.documentElement.cloneNode(true);
  var s=c.querySelector('#__kos-edit-style');if(s)s.remove();
  var sc=c.querySelector('#__kos-edit-script');if(sc)sc.remove();
  c.querySelectorAll('[contenteditable]').forEach(function(n){n.removeAttribute('contenteditable');});
  c.querySelectorAll('.editing').forEach(function(n){n.classList.remove('editing');});
  c.querySelectorAll('.__kos-tip,.__kos-photo-tip').forEach(function(n){n.remove();});
  window.parent.postMessage({type:'full-html-response',html:'<!DOCTYPE html>'+c.outerHTML},'*');
});
})();</script>`

  return html.replace(/<\/body>/i, injection + '\n</body>')
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface VisualPreviewModalProps {
  postId: string
  postMeta?: {
    clientName?: string
    contentType?: string
    format?: string
    placement?: string
    angle?: string
  }
  isOpen: boolean
  onClose: () => void
}

export function VisualPreviewModal({
  postId,
  postMeta,
  isOpen,
  onClose,
}: VisualPreviewModalProps) {
  const router = useRouter()
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const pendingSaveResolveRef = useRef<((html: string) => void) | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pendingSlotIdRef = useRef<string | null>(null)

  const [visual, setVisual] = useState<PostVisual | null>(null)
  const [loading, setLoading] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [hasUnsavedEdits, setHasUnsavedEdits] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Fetch visual data when modal opens; reset edit state on close
  useEffect(() => {
    if (!isOpen) {
      setEditMode(false)
      setHasUnsavedEdits(false)
      return
    }
    setLoading(true)
    setError('')
    getVisualForPost(postId)
      .then((v) => setVisual(v))
      .catch(() => setError('Failed to load visual.'))
      .finally(() => setLoading(false))
  }, [isOpen, postId])

  const isDirectMode = visual?.generation_mode === 'direct'

  // Build rendered HTML (inject editing script when in edit mode)
  const generatedHtml = visual?.generated_html ?? null
  const htmlToRender = useMemo(() => {
    if (!generatedHtml) return null
    if (editMode) return injectEditingScript(generatedHtml)
    return generatedHtml
  }, [generatedHtml, editMode])

  // Blob URL lifecycle — create/revoke keyed to HTML content
  const iframeSrc = useMemo(() => {
    if (!htmlToRender) return undefined
    return URL.createObjectURL(new Blob([htmlToRender], { type: 'text/html' }))
  }, [htmlToRender])

  useEffect(() => {
    return () => {
      if (iframeSrc) URL.revokeObjectURL(iframeSrc)
    }
  }, [iframeSrc])

  // postMessage listener — active while edit mode is on
  useEffect(() => {
    if (!isOpen || !editMode) return

    function handleMessage(e: MessageEvent) {
      if (!e.data || typeof e.data !== 'object') return
      const msg = e.data as Record<string, unknown>

      if (msg.type === 'slide-text-edit') {
        setHasUnsavedEdits(true)
      }

      if (msg.type === 'photo-slot-clicked' && typeof msg.slotId === 'string') {
        pendingSlotIdRef.current = msg.slotId
        fileInputRef.current?.click()
      }

      if (msg.type === 'photo-updated') {
        setHasUnsavedEdits(true)
      }

      if (msg.type === 'full-html-response' && typeof msg.html === 'string') {
        pendingSaveResolveRef.current?.(msg.html)
        pendingSaveResolveRef.current = null
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [isOpen, editMode])

  // Close on Escape (keyboard events from inside the iframe don't propagate here)
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    },
    [onClose]
  )

  useEffect(() => {
    if (!isOpen) return
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, handleKeyDown])

  function handleToggleEditMode() {
    // Prevent toggling off while there are unsaved changes
    if (hasUnsavedEdits) return
    setEditMode((prev) => !prev)
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    const slotId = pendingSlotIdRef.current
    // Reset so the same file can be re-selected next time
    e.target.value = ''
    if (!file || !slotId || !visual?.client_id || !iframeRef.current?.contentWindow) return

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('clientId', visual.client_id)
      formData.append('postId', postId)
      formData.append('category', 'creative')

      const res = await fetch('/api/media/upload', { method: 'POST', body: formData })
      const data = await res.json() as { originalUrl?: string; error?: string }

      if (!res.ok || !data.originalUrl) {
        setError(data.error ?? 'Photo upload failed.')
        return
      }

      iframeRef.current.contentWindow.postMessage(
        { type: 'photo-uploaded', slotId, url: data.originalUrl },
        '*'
      )
    } catch {
      setError('Photo upload failed.')
    } finally {
      pendingSlotIdRef.current = null
    }
  }

  async function handleSaveEdits() {
    if (!visual || !iframeRef.current?.contentWindow) return
    setSaving(true)
    setError('')

    try {
      // Ask the iframe to serialize its current DOM (with injected script/style stripped)
      const fullHtml = await new Promise<string>((resolve, reject) => {
        const timeout = setTimeout(() => {
          pendingSaveResolveRef.current = null
          reject(new Error('Save timeout — the iframe did not respond.'))
        }, 5000)

        pendingSaveResolveRef.current = (html: string) => {
          clearTimeout(timeout)
          resolve(html)
        }

        iframeRef.current!.contentWindow!.postMessage({ type: 'request-full-html' }, '*')
      })

      const result = await updateVisualHtmlAction(
        postId,
        visual.slide_html ?? [],
        fullHtml
      )

      if (!result.success) {
        setError(result.error ?? 'Failed to save changes.')
        return
      }

      setVisual((prev) => (prev ? { ...prev, generated_html: fullHtml } : null))
      setHasUnsavedEdits(false)
      setEditMode(false)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes.')
    } finally {
      setSaving(false)
    }
  }

  async function handleRegenerate() {
    setEditMode(false)
    setHasUnsavedEdits(false)
    setRegenerating(true)
    setError('')
    try {
      const updated = await generateVisualAction(postId)
      setVisual(updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Regeneration failed.')
    } finally {
      setRegenerating(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    setError('')
    try {
      const result = await deleteVisualAction(postId)
      if (!result.success) {
        setError(result.error ?? 'Failed to delete visual.')
        return
      }
      router.refresh()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed.')
    } finally {
      setDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  if (!isOpen) return null

  const modalTitle = postMeta?.clientName
    ? `Visual preview — ${postMeta.clientName}`
    : 'Visual preview'

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={modalTitle}
      className="fixed inset-0 z-50 flex flex-col bg-[#0a0a0a]/95"
      onClick={onClose}
    >
      {/* Top bar */}
      <div
        className="flex items-center justify-between px-6 py-3 border-b border-[#2a2a2a]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 text-sm">
          {postMeta?.clientName && (
            <span className="text-white font-medium">{postMeta.clientName}</span>
          )}
          {postMeta?.contentType && (
            <span className="text-[#555555]">{postMeta.contentType.replace(/_/g, ' ')}</span>
          )}
          {postMeta?.format && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium text-[#999999] bg-[#1a1a1a] border border-[#2a2a2a]">
              {postMeta.format}
            </span>
          )}
          {postMeta?.placement && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium text-[#999999] bg-[#1a1a1a] border border-[#2a2a2a]">
              {postMeta.placement}
            </span>
          )}
          {postMeta?.angle && (
            <span className="text-[#555555] text-xs italic truncate max-w-[300px]">{postMeta.angle}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isDirectMode && iframeSrc && (
            <button
              onClick={handleToggleEditMode}
              disabled={hasUnsavedEdits}
              title={
                hasUnsavedEdits
                  ? 'Save or discard changes first'
                  : editMode
                    ? 'Exit edit mode'
                    : 'Edit text inline'
              }
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium border transition-colors disabled:opacity-50 ${
                editMode
                  ? 'bg-[#E8732A]/10 border-[#E8732A]/40 text-[#E8732A]'
                  : 'border-[#2a2a2a] text-[#555555] hover:text-white hover:border-[#555555]'
              }`}
            >
              <Pencil size={12} />
              {editMode ? 'Editing' : 'Edit'}
            </button>
          )}
          <button
            onClick={onClose}
            aria-label="Close preview"
            className="w-8 h-8 flex items-center justify-center text-[#555555] hover:text-white transition-colors rounded"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Center content */}
      <div
        className="flex-1 flex items-center justify-center overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {loading ? (
          <div className="flex items-center gap-2 text-[#555555]">
            <Loader2 size={16} className="animate-spin" />
            <span className="text-sm">Loading preview...</span>
          </div>
        ) : error ? (
          <div className="text-sm text-red-400">{error}</div>
        ) : !iframeSrc ? (
          <div className="text-sm text-[#555555]">No visual generated yet.</div>
        ) : (
          <iframe
            key={editMode ? 'edit' : 'preview'}
            ref={iframeRef}
            src={iframeSrc}
            title="Visual preview"
            className="rounded-md border border-[#2a2a2a] bg-white"
            style={{ width: 420, height: 700 }}
            sandbox={editMode ? 'allow-scripts allow-same-origin' : 'allow-scripts'}
          />
        )}
      </div>

      {/* Delete confirmation dialog */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => !deleting && setShowDeleteConfirm(false)}
        >
          <div
            className="bg-[#111111] border border-[#2a2a2a] rounded-md p-5 max-w-sm mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-white font-medium mb-2">Delete Visual?</h3>
            <p className="text-sm text-[#999999] mb-4">
              This will remove the visual and reset the post to &quot;In Production&quot;.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => !deleting && setShowDeleteConfirm(false)}
                disabled={deleting}
                className="px-3 py-2 rounded-md text-sm font-medium border border-[#2a2a2a] text-[#999999] hover:text-white transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-3 py-2 rounded-md text-sm font-medium bg-red-900/20 border border-red-600/50 text-red-400 hover:bg-red-900/30 hover:border-red-500/70 transition-colors disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom bar */}
      <div
        className="flex items-center justify-center gap-3 px-6 py-3 border-t border-[#2a2a2a]"
        onClick={(e) => e.stopPropagation()}
      >
        {hasUnsavedEdits && (
          <button
            onClick={handleSaveEdits}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium bg-[#E8732A]/10 border border-[#E8732A]/40 text-[#E8732A] hover:bg-[#E8732A]/20 transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : null}
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        )}
        {saveSuccess && !hasUnsavedEdits && (
          <span className="inline-flex items-center gap-1.5 text-sm text-green-400">
            <Check size={14} />
            Saved
          </span>
        )}
        <button
          onClick={handleRegenerate}
          disabled={regenerating}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium border border-[#2a2a2a] text-[#999999] hover:text-white hover:border-[#555555] transition-colors disabled:opacity-50"
        >
          <RefreshCw size={14} className={regenerating ? 'animate-spin' : ''} />
          {regenerating ? 'Regenerating...' : 'Regenerate'}
        </button>
        <button
          disabled
          title="Coming soon"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium border border-[#2a2a2a] text-[#333333] cursor-not-allowed"
        >
          <Download size={14} />
          Export PNGs
          <span className="text-[10px] text-[#333333]">coming soon</span>
        </button>
        <button
          onClick={() => setShowDeleteConfirm(true)}
          disabled={deleting}
          title="Delete visual"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium border border-[#2a2a2a] text-red-500 hover:text-red-400 hover:border-red-600/50 transition-colors disabled:opacity-50"
        >
          <Trash2 size={14} />
          Delete
        </button>
        <button
          onClick={onClose}
          className="px-4 py-2 rounded-md text-sm font-medium bg-[#1a1a1a] border border-[#2a2a2a] text-[#999999] hover:text-white transition-colors"
        >
          Close
        </button>
      </div>

      {/* Hidden file input for photo slot uploads */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handlePhotoUpload}
      />
    </div>
  )
}
