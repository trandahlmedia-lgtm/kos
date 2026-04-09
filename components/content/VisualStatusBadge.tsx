import type { VisualExportStatus } from '@/types'

const VISUAL_STATUS_CONFIG: Record<VisualExportStatus, { label: string; className: string } | null> = {
  pending: null,
  photos_needed: { label: 'Photos Needed', className: 'text-yellow-400 bg-yellow-400/10 border border-yellow-400/20' },
  ready_to_export: { label: 'Ready to Export', className: 'text-blue-400 bg-blue-400/10 border border-blue-400/20' },
  exported: { label: 'Exported', className: 'text-green-400 bg-green-400/10 border border-green-400/20' },
}

export function VisualStatusBadge({ status }: { status?: VisualExportStatus | null }) {
  if (!status) return null
  const config = VISUAL_STATUS_CONFIG[status]
  if (!config) return null

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${config.className}`}>
      {config.label}
    </span>
  )
}
