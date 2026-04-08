// ---------------------------------------------------------------------------
// CSV parsing + column mapping for lead import
// Pure functions — no server action constraints
// ---------------------------------------------------------------------------

/**
 * Parse a CSV string into an array of row objects.
 * Handles quoted fields and commas inside quotes.
 */
export function parseCSV(csvText: string): Record<string, string>[] {
  const lines = csvText.split(/\r?\n/).filter((line) => line.trim())
  if (lines.length < 2) return []

  const headers = parseCSVRow(lines[0]).map((h) => h.trim().toLowerCase())
  const rows: Record<string, string>[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVRow(lines[i])
    const row: Record<string, string> = {}
    headers.forEach((header, idx) => {
      if (header && values[idx] !== undefined) {
        row[header] = values[idx].trim()
      }
    })
    rows.push(row)
  }

  return rows
}

function parseCSVRow(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += char
    }
  }
  result.push(current)
  return result
}

// ---------------------------------------------------------------------------
// Column mapping
// ---------------------------------------------------------------------------

export interface ColumnMapping {
  business_name: string
  phone?: string
  email?: string
  website?: string
  industry?: string
  service_area?: string
  review_count?: string
  rating?: string
  google_business_url?: string
  notes?: string
}

/** Auto-detect column mapping from CSV headers. */
export function detectColumnMapping(headers: string[]): ColumnMapping {
  const lower = headers.map((h) => h.toLowerCase())
  const mapping: ColumnMapping = {
    business_name: findHeader(lower, ['company name', 'company', 'business_name', 'business name', 'name']) ?? headers[0],
  }

  const phoneMatch = findHeader(lower, ['phone', 'usdlk', 'phone number', 'telephone'])
  if (phoneMatch) mapping.phone = phoneMatch

  const emailMatch = findHeader(lower, ['email', 'email address', 'e-mail'])
  if (emailMatch) mapping.email = emailMatch

  const websiteMatch = findHeader(lower, ['website', 'url', 'lcr4fd href', 'website url', 'web'])
  if (websiteMatch) mapping.website = websiteMatch

  const industryMatch = findHeader(lower, ['industry', 'niche', 'category', 'type'])
  if (industryMatch) mapping.industry = industryMatch

  const areaMatch = findHeader(lower, ['service_area', 'service area', 'city', 'area', 'location', 'address'])
  if (areaMatch) mapping.service_area = areaMatch

  const reviewMatch = findHeader(lower, ['reviews', 'review_count', 'review count', 'google reviews'])
  if (reviewMatch) mapping.review_count = reviewMatch

  const ratingMatch = findHeader(lower, ['rating', 'google rating', 'stars'])
  if (ratingMatch) mapping.rating = ratingMatch

  const googleMatch = findHeader(lower, ['google_business_url', 'google url', 'google maps', 'google maps url'])
  if (googleMatch) mapping.google_business_url = googleMatch

  return mapping
}

function findHeader(headers: string[], candidates: string[]): string | undefined {
  for (const candidate of candidates) {
    const idx = headers.indexOf(candidate)
    if (idx !== -1) return headers[idx]
  }
  return undefined
}

export function mapRow(row: Record<string, string>, mapping: ColumnMapping): Record<string, string | undefined> {
  return {
    business_name: row[mapping.business_name],
    phone: mapping.phone ? row[mapping.phone] : undefined,
    email: mapping.email ? row[mapping.email] : undefined,
    website: mapping.website ? row[mapping.website] : undefined,
    industry: mapping.industry ? row[mapping.industry] : undefined,
    service_area: mapping.service_area ? row[mapping.service_area] : undefined,
    review_count: mapping.review_count ? row[mapping.review_count] : undefined,
    rating: mapping.rating ? row[mapping.rating] : undefined,
    google_business_url: mapping.google_business_url ? row[mapping.google_business_url] : undefined,
  }
}
