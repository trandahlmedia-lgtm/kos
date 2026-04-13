'use client'

import { Check, X } from 'lucide-react'
import type { BrandColor, BrandFonts, BrandVoice, ContentPillar, TargetAudience } from '@/types'

// ---------------------------------------------------------------------------
// Section wrapper
// ---------------------------------------------------------------------------

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#111111] border border-[#2a2a2a] rounded-md overflow-hidden">
      <div className="px-5 py-3 border-b border-[#2a2a2a]">
        <p className="text-xs font-semibold text-[#555555] uppercase tracking-wider">{title}</p>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Colors
// ---------------------------------------------------------------------------

function ColorsSection({ colors }: { colors: BrandColor[] }) {
  if (colors.length === 0) {
    return (
      <Section title="Colors">
        <p className="text-sm text-[#555555]">No colors added yet.</p>
      </Section>
    )
  }

  return (
    <Section title="Colors">
      <div className="flex flex-wrap gap-4">
        {colors.map((color) => (
          <div key={color.hex} className="flex flex-col items-center gap-1.5">
            <div
              className="w-14 h-14 rounded-md border border-[#2a2a2a] shrink-0"
              style={{ backgroundColor: color.hex }}
            />
            <div className="text-center">
              <p className="text-xs font-medium text-white leading-tight">{color.name}</p>
              <p className="text-[10px] text-[#555555] font-mono">{color.hex}</p>
              <p className="text-[10px] text-[#333333] max-w-[72px] leading-tight">{color.role}</p>
            </div>
          </div>
        ))}
      </div>
    </Section>
  )
}

// ---------------------------------------------------------------------------
// Typography
// ---------------------------------------------------------------------------

function TypographySection({ fonts }: { fonts: BrandFonts }) {
  const sample = 'The quick brown fox jumps over the lazy dog'

  return (
    <Section title="Typography">
      <link
        rel="stylesheet"
        href={`https://fonts.googleapis.com/css2?family=${encodeURIComponent(fonts.headline)}:wght@400;700&family=${encodeURIComponent(fonts.body)}:wght@400&display=swap`}
      />
      <div className="space-y-5">
        <div>
          <p className="text-xs text-[#555555] mb-1">
            Headlines — <span className="text-[#999999]">{fonts.headline} Bold</span>
          </p>
          <p
            className="text-lg text-white"
            style={{ fontFamily: `'${fonts.headline}', sans-serif`, fontWeight: 700 }}
          >
            {sample}
          </p>
        </div>
        <div>
          <p className="text-xs text-[#555555] mb-1">
            Body — <span className="text-[#999999]">{fonts.body} Regular</span>
          </p>
          <p
            className="text-sm text-[#999999]"
            style={{ fontFamily: `'${fonts.body}', sans-serif`, fontWeight: 400 }}
          >
            {sample}
          </p>
        </div>
      </div>
    </Section>
  )
}

// ---------------------------------------------------------------------------
// Voice & Tone
// ---------------------------------------------------------------------------

function VoiceSection({ voice }: { voice: BrandVoice }) {
  return (
    <Section title="Voice & Tone">
      <div className="space-y-4">
        {/* Keywords */}
        <div className="flex flex-wrap gap-2">
          {voice.keywords.map((kw) => (
            <span
              key={kw}
              className="px-2.5 py-1 text-xs font-medium rounded-full bg-[#1a1a1a] border border-[#2a2a2a] text-[#999999]"
            >
              {kw}
            </span>
          ))}
        </div>

        {/* Description */}
        {voice.description && (
          <p className="text-sm text-[#999999] italic">&ldquo;{voice.description}&rdquo;</p>
        )}

        {/* Dos / Don'ts */}
        <div className="grid grid-cols-2 gap-4">
          {voice.dos.length > 0 && (
            <div>
              <p className="text-xs text-[#555555] uppercase tracking-wider mb-2">Do</p>
              <ul className="space-y-1.5">
                {voice.dos.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-[#999999]">
                    <Check size={13} className="text-green-400 shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {voice.donts.length > 0 && (
            <div>
              <p className="text-xs text-[#555555] uppercase tracking-wider mb-2">Don&apos;t</p>
              <ul className="space-y-1.5">
                {voice.donts.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-[#999999]">
                    <X size={13} className="text-red-400 shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </Section>
  )
}

// ---------------------------------------------------------------------------
// Content Pillars
// ---------------------------------------------------------------------------

function PillarsSection({ pillars }: { pillars: ContentPillar[] }) {
  if (pillars.length === 0) {
    return (
      <Section title="Content Pillars">
        <p className="text-sm text-[#555555]">No content pillars added yet.</p>
      </Section>
    )
  }

  return (
    <Section title="Content Pillars">
      <ol className="space-y-2">
        {pillars.map((pillar, i) => (
          <li key={pillar.name} className="flex items-start gap-3">
            <span className="text-xs font-mono text-[#E8732A] mt-0.5 w-4 shrink-0">{i + 1}.</span>
            <div>
              <span className="text-sm font-semibold text-white">{pillar.name}</span>
              {pillar.description && (
                <span className="text-sm text-[#555555]"> — {pillar.description}</span>
              )}
            </div>
          </li>
        ))}
      </ol>
    </Section>
  )
}

// ---------------------------------------------------------------------------
// Target Audience
// ---------------------------------------------------------------------------

function AudienceSection({ audience }: { audience: TargetAudience }) {
  return (
    <Section title="Target Audience">
      <div className="space-y-3">
        <div className="flex flex-wrap gap-4 text-sm">
          {audience.age_range && (
            <span className="text-[#999999]">
              <span className="text-[#555555]">Age:</span> {audience.age_range}
            </span>
          )}
          {audience.location && (
            <span className="text-[#999999]">
              <span className="text-[#555555]">Location:</span> {audience.location}
            </span>
          )}
        </div>

        {audience.traits.length > 0 && (
          <div>
            <p className="text-xs text-[#555555] uppercase tracking-wider mb-2">Traits</p>
            <div className="flex flex-wrap gap-2">
              {audience.traits.map((t) => (
                <span
                  key={t}
                  className="px-2.5 py-1 text-xs rounded-full bg-[#1a1a1a] border border-[#2a2a2a] text-[#999999]"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}

        {audience.pain_points.length > 0 && (
          <div>
            <p className="text-xs text-[#555555] uppercase tracking-wider mb-2">Pain Points</p>
            <ul className="space-y-1">
              {audience.pain_points.map((pp) => (
                <li key={pp} className="text-sm text-[#999999] flex items-start gap-2">
                  <span className="text-[#333333] shrink-0">•</span>
                  {pp}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Section>
  )
}

// ---------------------------------------------------------------------------
// Social & Contact
// ---------------------------------------------------------------------------

interface SocialContactProps {
  instagramHandle?: string | null
  website?: string | null
  phone?: string | null
  email?: string | null
}

function SocialContactSection({ instagramHandle, website, phone, email }: SocialContactProps) {
  const items = [
    instagramHandle && { label: 'Instagram', value: `@${instagramHandle}`, href: `https://instagram.com/${instagramHandle}` },
    website && { label: 'Website', value: website, href: website.startsWith('http') ? website : `https://${website}` },
    phone && { label: 'Phone', value: phone, href: `tel:${phone}` },
    email && { label: 'Email', value: email, href: `mailto:${email}` },
  ].filter(Boolean) as { label: string; value: string; href: string }[]

  if (items.length === 0) return null

  return (
    <Section title="Social & Contact">
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-3">
            <span className="text-xs text-[#555555] w-20 shrink-0">{item.label}</span>
            <a
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-[#E8732A] hover:underline"
            >
              {item.value}
            </a>
          </div>
        ))}
      </div>
    </Section>
  )
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

interface BrandKitVisualProps {
  brandColors: BrandColor[] | null
  brandFonts: BrandFonts | null
  brandVoice: BrandVoice | null
  contentPillars: ContentPillar[] | null
  targetAudience: TargetAudience | null
  instagramHandle?: string | null
  website?: string | null
  phone?: string | null
  email?: string | null
}

export function BrandKitVisual({
  brandColors,
  brandFonts,
  brandVoice,
  contentPillars,
  targetAudience,
  instagramHandle,
  website,
  phone,
  email,
}: BrandKitVisualProps) {
  const hasAnyData =
    (brandColors && brandColors.length > 0) ||
    brandFonts ||
    brandVoice ||
    (contentPillars && contentPillars.length > 0) ||
    targetAudience

  if (!hasAnyData) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-[#555555]">No brand identity data yet.</p>
        <p className="text-xs text-[#333333] mt-1">Use &ldquo;Edit Brand Kit&rdquo; to add colors, fonts, voice, and more.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {brandColors && brandColors.length > 0 && <ColorsSection colors={brandColors} />}
      {brandFonts && (brandFonts.headline || brandFonts.body) && <TypographySection fonts={brandFonts} />}
      {brandVoice && <VoiceSection voice={brandVoice} />}
      {contentPillars && contentPillars.length > 0 && <PillarsSection pillars={contentPillars} />}
      {targetAudience && <AudienceSection audience={targetAudience} />}
      <SocialContactSection
        instagramHandle={instagramHandle}
        website={website}
        phone={phone}
        email={email}
      />
    </div>
  )
}
