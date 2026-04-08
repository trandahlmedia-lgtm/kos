'use client'

import { Globe, MapPin } from 'lucide-react'
import type { Lead, LeadResearch } from '@/types'

interface QuickLinksProps {
  lead: Lead
  research: LeadResearch | null
}

interface LinkItem {
  label: string
  url: string
  icon: React.ReactNode
}

/** Only allow http/https URLs. Returns null for unsafe schemes or malformed input. */
function sanitizeUrl(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== 'string') return null
  const trimmed = raw.trim()
  if (!trimmed) return null

  // Add protocol if bare domain
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`

  try {
    const parsed = new URL(withProtocol)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null
    return parsed.href
  } catch {
    return null
  }
}

/** Validate and sanitize an Instagram handle, returning the profile URL or null. */
function sanitizeInstagramHandle(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== 'string') return null
  const handle = raw.trim().replace(/^@/, '')
  // Instagram handles: alphanumeric, periods, underscores, 1-30 chars
  if (!handle || !/^[a-zA-Z0-9._]{1,30}$/.test(handle)) return null
  return `https://instagram.com/${handle}`
}

function isRecord(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null && !Array.isArray(val)
}

function getString(obj: Record<string, unknown>, key: string): string | undefined {
  const val = obj[key]
  return typeof val === 'string' ? val : undefined
}

function parseResearchUrls(research: LeadResearch | null): { facebook?: string; instagram?: string } {
  if (!research || research.status !== 'completed') return {}
  const result: { facebook?: string; instagram?: string } = {}

  const social = research.social_audit
  if (!isRecord(social)) return result

  const platforms = social.platforms
  if (!isRecord(platforms)) return result

  const facebook = platforms.facebook
  if (isRecord(facebook)) {
    const fbUrl = sanitizeUrl(getString(facebook, 'url'))
    if (fbUrl) result.facebook = fbUrl
  }

  const instagram = platforms.instagram
  if (isRecord(instagram)) {
    const igUrl = sanitizeInstagramHandle(getString(instagram, 'handle'))
    if (igUrl) result.instagram = igUrl
  }

  return result
}

export function QuickLinks({ lead, research }: QuickLinksProps) {
  const researchUrls = parseResearchUrls(research)

  const links: LinkItem[] = []

  const websiteUrl = sanitizeUrl(lead.website)
  if (websiteUrl) {
    links.push({
      label: 'Website',
      url: websiteUrl,
      icon: <Globe size={14} aria-hidden="true" />,
    })
  }

  const gbuUrl = sanitizeUrl(lead.google_business_url)
  if (gbuUrl) {
    links.push({
      label: 'Google Business',
      url: gbuUrl,
      icon: <MapPin size={14} aria-hidden="true" />,
    })
  }

  const fbUrl = sanitizeUrl(lead.facebook_url) || researchUrls.facebook
  if (fbUrl) {
    links.push({
      label: 'Facebook',
      url: fbUrl,
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      ),
    })
  }

  const igUrl = sanitizeInstagramHandle(lead.instagram_handle) || researchUrls.instagram
  if (igUrl) {
    links.push({
      label: 'Instagram',
      url: igUrl,
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
        </svg>
      ),
    })
  }

  if (links.length === 0) {
    return (
      <span className="text-[10px] text-[#555555] italic">No verified links</span>
    )
  }

  return (
    <nav aria-label="External links" className="flex items-center gap-1">
      {links.map((link) => (
        <a
          key={link.label}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${link.label} (opens in new tab)`}
          className="flex items-center justify-center w-6 h-6 rounded text-[#555555] hover:text-[#E8732A] hover:bg-[#1a1a1a] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#E8732A] focus-visible:outline-offset-1"
        >
          {link.icon}
        </a>
      ))}
    </nav>
  )
}
