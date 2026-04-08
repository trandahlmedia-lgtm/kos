import { type Platform } from '@/types'

const PLATFORM_COLORS: Record<Platform, string> = {
  instagram: 'text-pink-400',
  facebook: 'text-blue-500',
  linkedin: 'text-blue-400',
  tiktok: 'text-white',
  nextdoor: 'text-green-500',
}

const PLATFORM_LABELS: Record<Platform, string> = {
  instagram: 'IG',
  facebook: 'FB',
  linkedin: 'LI',
  tiktok: 'TT',
  nextdoor: 'ND',
}

interface PlatformIconProps {
  platform: Platform
  size?: 'sm' | 'md'
}

export function PlatformIcon({ platform, size = 'md' }: PlatformIconProps) {
  const sizeClass = size === 'sm' ? 'w-5 h-5 text-[9px]' : 'w-6 h-6 text-[10px]'
  return (
    <span
      className={`${sizeClass} ${PLATFORM_COLORS[platform]} bg-[#1a1a1a] border border-[#2a2a2a] rounded font-bold flex items-center justify-center`}
      title={platform}
    >
      {PLATFORM_LABELS[platform]}
    </span>
  )
}
