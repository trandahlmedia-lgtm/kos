'use client'

import { useState, useCallback } from 'react'
import { Upload, Loader2, CheckCircle2, AlertCircle, FileSpreadsheet } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { previewCSVImport, bulkImportLeads, type ImportPreview } from '@/lib/actions/leadImport'
import type { ColumnMapping } from '@/lib/outreach/csvParser'

interface BulkImportDialogProps {
  open: boolean
  onClose: () => void
  onImported: () => void
}

export function BulkImportDialog({ open, onClose, onImported }: BulkImportDialogProps) {
  const [step, setStep] = useState<'upload' | 'preview' | 'importing' | 'done'>('upload')
  const [csvText, setCsvText] = useState('')
  const [fileName, setFileName] = useState('')
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [mapping, setMapping] = useState<ColumnMapping | null>(null)
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ imported: number; skipped: number; disqualifiedSkipped: number; errors: string[] } | null>(null)

  function handleClose() {
    setStep('upload')
    setCsvText('')
    setFileName('')
    setPreview(null)
    setMapping(null)
    setError('')
    setResult(null)
    onClose()
  }

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.csv')) {
      setError('Please upload a CSV file')
      return
    }

    setError('')
    setFileName(file.name)
    const text = await file.text()
    setCsvText(text)

    const { preview: p, error: previewError } = await previewCSVImport(text)
    if (previewError || !p) {
      setError(previewError ?? 'Failed to parse CSV')
      return
    }

    setPreview(p)
    setMapping(p.suggestedMapping)
    setStep('preview')
  }, [])

  async function handleImport() {
    if (!csvText || !mapping) return

    setStep('importing')
    setError('')

    const importResult = await bulkImportLeads(csvText, mapping, 'scraped')

    if (importResult.error && importResult.imported === 0) {
      setError(importResult.error)
      setStep('preview')
      return
    }

    setResult({
      imported: importResult.imported,
      skipped: importResult.skipped,
      disqualifiedSkipped: importResult.disqualifiedSkipped,
      errors: importResult.errors,
    })
    setStep('done')
    onImported()
  }

  function handleMappingChange(field: keyof ColumnMapping, value: string) {
    if (!mapping) return
    setMapping({ ...mapping, [field]: value || undefined })
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose() }}>
      <DialogContent className="bg-[#111111] border-[#2a2a2a] text-white max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <FileSpreadsheet size={18} className="text-[#E8732A]" />
            Import Leads from CSV
          </DialogTitle>
        </DialogHeader>

        {error && (
          <div className="flex items-start gap-2 p-3 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        {/* Step 1: Upload */}
        {step === 'upload' && (
          <div className="space-y-4">
            <p className="text-sm text-[#999999]">
              Upload a CSV file with lead data. The importer will auto-detect columns and let you review before importing.
            </p>
            <label className="flex flex-col items-center gap-3 p-8 border-2 border-dashed border-[#2a2a2a] rounded-md cursor-pointer hover:border-[#E8732A]/50 transition-colors">
              <Upload size={24} className="text-[#555555]" />
              <span className="text-sm text-[#999999]">
                {fileName || 'Click to select a CSV file'}
              </span>
              <input
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileSelect}
              />
            </label>
            <p className="text-xs text-[#555555]">
              Expected columns: Company Name, Phone, Email, Website, Industry/Niche, City/Area, Reviews, Rating
            </p>
          </div>
        )}

        {/* Step 2: Preview */}
        {step === 'preview' && preview && mapping && (
          <div className="space-y-4">
            <div className="flex gap-4 text-sm">
              <div className="px-3 py-1.5 rounded bg-[#1a1a1a] text-[#999999]">
                {preview.totalRows} rows
              </div>
              <div className="px-3 py-1.5 rounded bg-green-500/10 text-green-400">
                {preview.validRows} valid
              </div>
              {preview.invalidRows.length > 0 && (
                <div className="px-3 py-1.5 rounded bg-red-500/10 text-red-400">
                  {preview.invalidRows.length} invalid
                </div>
              )}
            </div>

            <div className="space-y-3">
              <Label className="text-[#999999] text-xs uppercase tracking-wider">Column Mapping</Label>
              {(Object.entries({
                business_name: 'Business Name *',
                phone: 'Phone',
                email: 'Email',
                website: 'Website',
                industry: 'Industry / Niche',
                service_area: 'City / Service Area',
                review_count: 'Review Count',
                rating: 'Rating',
              }) as [keyof ColumnMapping, string][]).map(([field, label]) => (
                <div key={field} className="flex items-center gap-3">
                  <span className="text-sm text-[#999999] w-32 shrink-0">{label}</span>
                  <select
                    value={mapping[field] ?? ''}
                    onChange={(e) => handleMappingChange(field, e.target.value)}
                    className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-md px-3 py-1.5 text-sm text-white"
                  >
                    <option value="">— Skip —</option>
                    {preview.headers.map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            {preview.invalidRows.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs text-[#555555]">
                  Invalid rows (first {Math.min(preview.invalidRows.length, 5)}):
                </p>
                {preview.invalidRows.slice(0, 5).map((r) => (
                  <p key={r.row} className="text-xs text-red-400">
                    Row {r.row}: {r.errors}
                  </p>
                ))}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => { setStep('upload'); setPreview(null) }}
                className="border-[#2a2a2a] text-[#999999] hover:text-white"
              >
                Back
              </Button>
              <Button
                onClick={handleImport}
                disabled={preview.validRows === 0}
                className="flex-1 bg-[#E8732A] hover:bg-[#d4621f] text-white"
              >
                Import {preview.validRows} Leads
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Importing */}
        {step === 'importing' && (
          <div className="flex flex-col items-center gap-3 py-8">
            <Loader2 size={24} className="animate-spin text-[#E8732A]" />
            <p className="text-sm text-[#999999]">Importing leads...</p>
          </div>
        )}

        {/* Step 4: Done */}
        {step === 'done' && result && (
          <div className="space-y-4">
            <div className="flex flex-col items-center gap-3 py-4">
              <CheckCircle2 size={32} className="text-green-400" />
              <p className="text-lg text-white font-medium">Import Complete</p>
            </div>

            <div className="flex gap-4 text-sm justify-center">
              <div className="px-3 py-1.5 rounded bg-green-500/10 text-green-400">
                {result.imported} imported
              </div>
              {result.skipped > 0 && (
                <div className="px-3 py-1.5 rounded bg-yellow-500/10 text-yellow-400">
                  {result.skipped} duplicates skipped
                </div>
              )}
              {result.disqualifiedSkipped > 0 && (
                <div className="px-3 py-1.5 rounded bg-red-500/10 text-red-400">
                  {result.disqualifiedSkipped} skipped (previously disqualified)
                </div>
              )}
            </div>

            {result.errors.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs text-[#555555]">Errors:</p>
                {result.errors.slice(0, 5).map((err, i) => (
                  <p key={i} className="text-xs text-red-400">{err}</p>
                ))}
              </div>
            )}

            <Button
              onClick={handleClose}
              className="w-full bg-[#E8732A] hover:bg-[#d4621f] text-white"
            >
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
