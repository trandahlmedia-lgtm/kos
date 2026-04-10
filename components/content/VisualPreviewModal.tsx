'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { X, RefreshCw, Download, Loader2, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { getVisualForPost, generateVisualAction, deleteVisualAction } from '@/lib/actions/visuals'
import type { PostVisual } from '@/types'

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
  const [visual, setVisual] = useState<PostVisual | null>(null)
  const [loading, setLoading] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Fetch visual data when modal opens
  useEffect(() => {
    if (!isOpen) return
    setLoading(true)
    setError('')
    getVisualForPost(postId)
      .then((v) => setVisual(v))
      .catch(() => setError('Failed to load visual.'))
      .finally(() => setLoading(false))
  }, [isOpen, postId])

  // Blob URL lifecycle — create/revoke in effect keyed to HTML content
  const generatedHtml = visual?.generated_html ?? null
  const iframeSrc = useMemo(() => {
    if (!generatedHtml) return undefined
    return URL.createObjectURL(new Blob([generatedHtml], { type: 'text/html' }))
  }, [generatedHtml])

  useEffect(() => {
    return () => {
      if (iframeSrc) URL.revokeObjectURL(iframeSrc)
    }
  }, [iframeSrc])

  // Close on Escape
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

  async function handleRegenerate() {
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
        <button
          onClick={onClose}
          aria-label="Close preview"
          className="w-8 h-8 flex items-center justify-center text-[#555555] hover:text-white transition-colors rounded"
        >
          <X size={18} />
        </button>
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
            src={iframeSrc}
            title="Visual preview"
            className="rounded-md border border-[#2a2a2a] bg-white"
            style={{ width: 420, height: 700 }}
            sandbox="allow-scripts"
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
              This will remove the visual and reset the post to "In Production".
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
    </div>
  )
}
