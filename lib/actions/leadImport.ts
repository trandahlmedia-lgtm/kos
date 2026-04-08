'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { leadImportRowSchema, formatZodErrors } from '@/lib/security/validation'
import { parseCSV, detectColumnMapping, mapRow } from '@/lib/outreach/csvParser'
import type { ColumnMapping } from '@/lib/outreach/csvParser'
import type { LeadSource } from '@/types'

// ---------------------------------------------------------------------------
// Preview
// ---------------------------------------------------------------------------

export interface ImportPreview {
  headers: string[]
  totalRows: number
  validRows: number
  invalidRows: { row: number; errors: string }[]
  suggestedMapping: ColumnMapping
}

export async function previewCSVImport(
  csvText: string
): Promise<{ preview: ImportPreview | null; error: string | null }> {
  const rows = parseCSV(csvText)
  if (rows.length === 0) return { preview: null, error: 'No data rows found in CSV' }

  const headers = Object.keys(rows[0])
  const suggestedMapping = detectColumnMapping(headers)
  const invalidRows: { row: number; errors: string }[] = []
  let validCount = 0

  rows.forEach((row, idx) => {
    const mapped = mapRow(row, suggestedMapping)
    const result = leadImportRowSchema.safeParse(mapped)
    if (result.success) {
      validCount++
    } else {
      invalidRows.push({ row: idx + 2, errors: formatZodErrors(result.error.issues) })
    }
  })

  return {
    preview: {
      headers,
      totalRows: rows.length,
      validRows: validCount,
      invalidRows: invalidRows.slice(0, 20),
      suggestedMapping,
    },
    error: null,
  }
}

// ---------------------------------------------------------------------------
// Bulk import
// ---------------------------------------------------------------------------

export async function bulkImportLeads(
  csvText: string,
  mapping: ColumnMapping,
  source: LeadSource = 'scraped'
): Promise<{ imported: number; skipped: number; errors: string[]; error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { imported: 0, skipped: 0, errors: [], error: 'Unauthorized' }

  const rows = parseCSV(csvText)
  if (rows.length === 0) return { imported: 0, skipped: 0, errors: [], error: 'No data rows found' }

  // Fetch existing leads for deduplication (by business_name + service_area)
  const { data: existingLeads } = await supabase
    .from('leads')
    .select('business_name, service_area')

  const existingSet = new Set(
    (existingLeads ?? []).map((l: { business_name: string; service_area: string | null }) =>
      `${l.business_name.toLowerCase()}|${(l.service_area ?? '').toLowerCase()}`
    )
  )

  const toInsert: Record<string, unknown>[] = []
  const errors: string[] = []
  let skipped = 0

  for (let i = 0; i < rows.length; i++) {
    const mapped = mapRow(rows[i], mapping)
    const result = leadImportRowSchema.safeParse(mapped)

    if (!result.success) {
      errors.push(`Row ${i + 2}: ${formatZodErrors(result.error.issues)}`)
      continue
    }

    const data = result.data
    const dedupeKey = `${data.business_name.toLowerCase()}|${(data.service_area ?? '').toLowerCase()}`
    if (existingSet.has(dedupeKey)) {
      skipped++
      continue
    }
    existingSet.add(dedupeKey)

    toInsert.push({
      business_name: data.business_name,
      phone: data.phone ?? null,
      email: data.email ?? null,
      website: data.website ?? null,
      has_website: !!data.website,
      industry: data.industry ?? null,
      service_area: data.service_area ?? null,
      review_count: data.review_count ?? null,
      rating: data.rating ?? null,
      google_business_url: data.google_business_url ?? null,
      source,
      stage: 'new',
      stage_updated_at: new Date().toISOString(),
      assigned_to: user.id,
    })
  }

  if (toInsert.length === 0) {
    return { imported: 0, skipped, errors, error: errors.length > 0 ? 'All rows failed validation' : null }
  }

  // Insert in batches of 50
  let imported = 0
  for (let i = 0; i < toInsert.length; i += 50) {
    const batch = toInsert.slice(i, i + 50)
    const { error: insertError } = await supabase.from('leads').insert(batch)
    if (insertError) {
      console.error('[bulkImportLeads] batch insert error:', insertError)
      errors.push(`Batch ${Math.floor(i / 50) + 1}: ${insertError.message}`)
    } else {
      imported += batch.length
    }
  }

  revalidatePath('/leads')
  return { imported, skipped, errors: errors.slice(0, 20), error: null }
}
