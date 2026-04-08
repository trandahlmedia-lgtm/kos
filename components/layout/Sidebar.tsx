'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  Target,
  Mail,
  Zap,
  Image,
  Receipt,
  LogOut,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/clients', label: 'Clients', icon: Users },
  { href: '/content', label: 'Content', icon: CalendarDays },
  { href: '/leads', label: 'Leads', icon: Target },
  { href: '/outreach', label: 'Outreach', icon: Mail },
  { href: '/workflows', label: 'Workflows', icon: Zap },
  { href: '/media', label: 'Media', icon: Image },
  { href: '/billing', label: 'Billing', icon: Receipt },
]

interface SidebarProps {
  userName: string
  userEmail: string
}

export function Sidebar({ userName, userEmail }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  function isActive(href: string) {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  const initials = userName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <aside className="w-[240px] shrink-0 h-screen fixed left-0 top-0 bg-[#111111] border-r border-[#2a2a2a] flex flex-col z-10">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-[#2a2a2a]">
        <span className="text-xl font-bold text-[#E8732A] tracking-tight">KOS</span>
        <span className="text-xs text-[#555555] block mt-0.5">Konvyrt Operating System</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
              isActive(href)
                ? 'text-[#E8732A] bg-[#E8732A]/10 border-l-2 border-[#E8732A] pl-[10px]'
                : 'text-[#999999] hover:text-white hover:bg-[#1a1a1a]'
            }`}
          >
            <Icon size={16} strokeWidth={1.5} />
            {label}
          </Link>
        ))}
      </nav>

      {/* User */}
      <div className="px-4 py-4 border-t border-[#2a2a2a]">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-full bg-[#E8732A]/20 text-[#E8732A] text-xs font-semibold flex items-center justify-center shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-white truncate">{userName}</p>
            <p className="text-xs text-[#555555] truncate">{userEmail}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="text-[#555555] hover:text-white transition-colors"
            title="Sign out"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  )
}
