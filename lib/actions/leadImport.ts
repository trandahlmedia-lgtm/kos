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

// Normalize business name for fuzzy matching: lowercase, trim, strip punctuation
function normalizeBusinessName(name: string): string {
  return name.toLowerCase().trim().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ')
}

export async function bulkImportLeads(
  csvText: string,
  mapping: ColumnMapping,
  source: LeadSource = 'scraped'
): Promise<{ imported: number; skipped: number; disqualifiedSkipped: number; errors: string[]; error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { imported: 0, skipped: 0, disqualifiedSkipped: 0, errors: [], error: 'Unauthorized' }

  const rows = parseCSV(csvText)
  if (rows.length === 0) return { imported: 0, skipped: 0, disqualifiedSkipped: 0, errors: [], error: 'No data rows found' }

  // Fetch existing leads for deduplication (by business_name + service_area)
  const { data: existingLeads } = await supabase
    .from('leads')
    .select('business_name, service_area, email, stage, heat_level')

  const existingSet = new Set(
    (existingLeads ?? []).map((l: { business_name: string; service_area: string | null }) =>
      `${l.business_name.toLowerCase()}|${(l.service_area ?? '').toLowerCase()}`
    )
  )

  // Build a set of disqualified business names+area (normalized) and emails for matching
  // Uses name+area compound key to avoid false positives on franchises in different markets
  const disqualifiedNameAreaKeys = new Set(
    (existingLeads ?? [])
      .filter((l: { stage: string; heat_level: string | null }) => l.stage === 'lost' && l.heat_level === 'cut')
      .map((l: { business_name: string; service_area: string | null }) =>
        `${normalizeBusinessName(l.business_name)}|${(l.service_area ?? '').toLowerCase().trim()}`
      )
  )
  const disqualifiedEmails = new Set(
    (existingLeads ?? [])
      .filter((l: { stage: string; heat_level: string | null; email: string | null }) =>
        l.stage === 'lost' && l.heat_level === 'cut' && l.email
      )
      .map((l: { email: string | null }) => l.email!.toLowerCase())
  )

  // Also fetch email_opt_outs
  const { data: optOuts } = await supabase.from('email_opt_outs').select('email')
  const optOutEmails = new Set((optOuts ?? []).map((o: { email: string }) => o.email.toLowerCase()))

  const toInsert: Record<string, unknown>[] = []
  const errors: string[] = []
  let skipped = 0
  let disqualifiedSkipped = 0

  for (let i = 0; i < rows.length; i++) {
    const mapped = mapRow(rows[i], mapping)
    const result = leadImportRowSchema.safeParse(mapped)

    if (!result.success) {
      errors.push(`Row ${i + 2}: ${formatZodErrors(result.error.issues)}`)
      continue
    }

    const data = result.data

    // Check if this lead was previously disqualified (by email or fuzzy business name+area)
    const rowEmail = data.email?.toLowerCase().trim()
    const rowNameAreaKey = `${normalizeBusinessName(data.business_name)}|${(data.service_area ?? '').toLowerCase().trim()}`
    if (
      (rowEmail && (optOutEmails.has(rowEmail) || disqualifiedEmails.has(rowEmail))) ||
      disqualifiedNameAreaKeys.has(rowNameAreaKey)
    ) {
      disqualifiedSkipped++
      continue
    }

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
    return { imported: 0, skipped, disqualifiedSkipped, errors, error: errors.length > 0 ? 'All rows failed validation' : null }
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
  return { imported, skipped, disqualifiedSkipped, errors: errors.slice(0, 20), error: null }
}
