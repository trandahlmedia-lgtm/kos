'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { Loader2, RefreshCw, Pencil, Check } from 'lucide-react'
import { createPostAction } from '@/lib/actions/posts'
import { generateVisualAction, updateVisualHtmlAction } from '@/lib/actions/visuals'
import type { Client, PostFormat, PostPlacement, ContentType, Platform, PostVisual, DirectSlide } from '@/types'

// ---------------------------------------------------------------------------
// Editing script injection
// NOTE: Shared pattern with VisualPreviewModal — keep in sync if either changes.
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
// Types
// ---------------------------------------------------------------------------

interface StepVisualWizardData {
  clientId: string
  clientName: string
  scheduledDate: string
  angle: string
  format: PostFormat | ''
  placement: PostPlacement | ''
  contentType: ContentType | ''
  platform: Platform
}

interface StepVisualProps {
  wizardData: StepVisualWizardData
  // clients is accepted but not used directly — post creation uses wizardData fields
  clients: Client[]
  onPostCreated: (postId: string) => void
  onVisualReady: (visualId: string) => void
}

type Phase = 'creating_post' | 'generating' | 'ready' | 'error'

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function StepVisual({ wizardData, onPostCreated, onVisualReady }: StepVisualProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const pendingSaveResolveRef = useRef<((html: string) => void) | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pendingSlotIdRef = useRef<string | null>(null)
  // Guard against double-fire in React StrictMode
  const hasRunRef = useRef(false)

  const [phase, setPhase] = useState<Phase>('creating_post')
  const [phaseLabel, setPhaseLabel] = useState('Setting up your post...')
  const [postId, setPostId] = useState('')
  const [visual, setVisual] = useState<PostVisual | null>(null)
  const [error, setError] = useState('')

  const [editMode, setEditMode] = useState(false)
  const [hasUnsavedEdits, setHasUnsavedEdits] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [regenerating, setRegenerating] = useState(false)

  // On mount: create post → generate visual
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (hasRunRef.current) return
    hasRunRef.current = true

    async function run() {
      try {
        setPhase('creating_post')
        setPhaseLabel('Setting up your post...')

        const createdPostId = await createPostAction({
          client_id: wizardData.clientId,
          platform: wizardData.platform,
          content_type: (wizardData.contentType as ContentType) || undefined,
          format: (wizardData.format as PostFormat) || 'static',
          placement: (wizardData.placement as PostPlacement) || 'feed',
          scheduled_date: wizardData.scheduledDate || undefined,
        })

        setPostId(createdPostId)
        onPostCreated(createdPostId)

        setPhase('generating')
        setPhaseLabel('Generating your visual...')

        const generatedVisual = await generateVisualAction(createdPostId)
        setVisual(generatedVisual)
        onVisualReady(generatedVisual.id)
        setPhase('ready')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong.')
        setPhase('error')
      }
    }

    void run()
  }, []) // intentionally empty — this effect must run exactly once on mount

  // Iframe dimensions: story formats are 9:16, feed formats are 4:5
  const isStory = wizardData.format === 'story_sequence' || wizardData.format === 'static_story'
  const iframeWidth = isStory ? 350 : 500
  const iframeHeight = isStory ? 622 : 630

  // Build rendered HTML (inject editing script when edit mode is active)
  const generatedHtml = visual?.generated_html ?? null
  const htmlToRender = useMemo(() => {
    if (!generatedHtml) return null
    if (editMode) return injectEditingScript(generatedHtml)
    return generatedHtml
  }, [generatedHtml, editMode])

  // Blob URL lifecycle — revoke when HTML content changes
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
    if (!editMode) return

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
  }, [editMode])

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    const slotId = pendingSlotIdRef.current
    // Reset so the same file can be re-selected next time
    e.target.value = ''
    if (!file || !slotId || !iframeRef.current?.contentWindow) return

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('clientId', wizardData.clientId)
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
        (visual.slide_html ?? []) as DirectSlide[],
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
    if (!postId) return
    setEditMode(false)
    setHasUnsavedEdits(false)
    setRegenerating(true)
    setError('')

    try {
      const updated = await generateVisualAction(postId)
      setVisual(updated)
      onVisualReady(updated.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Regeneration failed.')
    } finally {
      setRegenerating(false)
    }
  }

  function handleRetry() {
    if (!postId) return
    setError('')
    setPhase('generating')
    setPhaseLabel('Generating your visual...')

    generateVisualAction(postId)
      .then((v) => {
        setVisual(v)
        onVisualReady(v.id)
        setPhase('ready')
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Generation failed.')
        setPhase('error')
      })
  }

  // ---------------------------------------------------------------------------
  // Loading state
  // ---------------------------------------------------------------------------

  if (phase === 'creating_post' || phase === 'generating') {
    return (
      <div className="flex flex-col items-center justify-center gap-6 py-16">
        <div
          className={`flex items-center justify-center w-16 h-16 rounded-full border-2 ${
            phase === 'generating'
              ? 'border-[#E8732A]/30 animate-pulse'
              : 'border-[#2a2a2a]'
          }`}
        >
          <Loader2 size={24} className="animate-spin text-[#E8732A]" />
        </div>
        <p className="text-sm text-[#999999]">{phaseLabel}</p>
        {phase === 'generating' && (
          <p className="text-xs text-[#555555]">This usually takes 15–30 seconds.</p>
        )}
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Error state
  // ---------------------------------------------------------------------------

  if (phase === 'error') {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16">
        <p className="text-sm text-red-400">{error || 'Something went wrong.'}</p>
        {postId && (
          <button
            onClick={handleRetry}
            className="px-4 py-2 rounded-md text-sm font-medium border border-[#2a2a2a] text-[#999999] hover:text-white hover:border-[#555555] transition-colors"
          >
            Try Again
          </button>
        )}
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Ready state
  // ---------------------------------------------------------------------------

  return (
    <div className="flex flex-col items-center gap-4 py-4">
      {/* Error banner (non-fatal, e.g. photo upload failure) */}
      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}

      {/* Visual iframe */}
      {iframeSrc && (
        <iframe
          key={editMode ? 'edit' : 'preview'}
          ref={iframeRef}
          src={iframeSrc}
          title="Visual preview"
          className="rounded-md border border-[#2a2a2a] bg-white"
          style={{ width: iframeWidth, height: iframeHeight }}
          sandbox={editMode ? 'allow-scripts allow-same-origin' : 'allow-scripts'}
        />
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-2 flex-wrap justify-center">
        {/* Save edits — only visible when there are unsaved changes */}
        {hasUnsavedEdits && (
          <button
            onClick={handleSaveEdits}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium bg-[#E8732A]/10 border border-[#E8732A]/40 text-[#E8732A] hover:bg-[#E8732A]/20 transition-colors disabled:opacity-50"
          >
            {saving && <Loader2 size={12} className="animate-spin" />}
            {saving ? 'Saving...' : 'Save Edits'}
          </button>
        )}

        {/* Saved confirmation */}
        {saveSuccess && !hasUnsavedEdits && (
          <span className="inline-flex items-center gap-1.5 text-sm text-green-400">
            <Check size={12} />
            Saved
          </span>
        )}

        {/* Edit text toggle */}
        <button
          onClick={() => { if (!hasUnsavedEdits) setEditMode((prev) => !prev) }}
          disabled={hasUnsavedEdits}
          title={
            hasUnsavedEdits
              ? 'Save or discard changes first'
              : editMode
              ? 'Exit edit mode'
              : 'Edit text inline'
          }
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium border transition-colors disabled:opacity-50 ${
            editMode
              ? 'bg-[#E8732A]/10 border-[#E8732A]/40 text-[#E8732A]'
              : 'border-[#2a2a2a] text-[#555555] hover:text-white hover:border-[#555555]'
          }`}
        >
          <Pencil size={12} />
          {editMode ? 'Editing' : 'Edit Text'}
        </button>

        {/* Regenerate */}
        <button
          onClick={handleRegenerate}
          disabled={regenerating}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium border border-[#2a2a2a] text-[#555555] hover:text-white hover:border-[#555555] transition-colors disabled:opacity-50"
        >
          <RefreshCw size={12} className={regenerating ? 'animate-spin' : ''} />
          {regenerating ? 'Regenerating...' : 'Regenerate'}
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
