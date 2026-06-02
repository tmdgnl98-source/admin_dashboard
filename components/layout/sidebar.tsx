'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useRouter, usePathname } from 'next/navigation'
import { useState } from 'react'
import { ChevronDown, ChevronRight, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { navItems } from '@/lib/navigation'
import { UserRole } from '@/types/navigation'
import {
  Building2,
  Users,
  LayoutDashboard,
  Zap,
  Calculator,
  Wrench,
  Headphones,
  FlaskConical,
} from 'lucide-react'

const ROLE_LABEL: Record<UserRole, string> = {
  main_admin: '본사 운영팀',
  normal_admin: '일반 직원',
  partner_admin: '파트너',
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  building: Building2,
  users: Users,
  'layout-dashboard': LayoutDashboard,
  zap: Zap,
  calculator: Calculator,
  wrench: Wrench,
  headphones: Headphones,
  'flask-conical': FlaskConical,
}

interface SidebarUser {
  id: string
  name: string
  email: string
  role: UserRole
}

interface SidebarProps {
  user: SidebarUser
}

export function Sidebar({ user }: SidebarProps) {
  const userRole = user.role
  const router = useRouter()
  const pathname = usePathname()
  const [openMenus, setOpenMenus] = useState<Set<string>>(new Set(['대시보드']))
  const [loggingOut, setLoggingOut] = useState(false)

  const handleLogout = async () => {
    if (loggingOut) return
    setLoggingOut(true)
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } finally {
      router.replace('/login')
      router.refresh()
    }
  }

  const toggleMenu = (title: string) => {
    setOpenMenus((prev) => {
      const next = new Set(prev)
      if (next.has(title)) {
        next.delete(title)
      } else {
        next.add(title)
      }
      return next
    })
  }

  const filteredItems = navItems.filter((item) =>
    item.roles.includes(userRole)
  )

  return (
    <aside className="flex h-screen w-60 flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-4">
        <div className="rounded-md bg-white px-2.5 py-1.5">
          <Image
            src="/GSchargev_logo.png"
            alt="GS 차지비"
            width={120}
            height={28}
            priority
            className="h-6 w-auto"
          />
        </div>
        <span className="text-xs text-white/70">관리자</span>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        {filteredItems.map((item) => {
          const Icon = iconMap[item.icon]

          if (item.href) {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.title}
                href={item.href}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground'
                )}
              >
                {Icon && <Icon className="h-4 w-4 shrink-0" />}
                <span>{item.title}</span>
              </Link>
            )
          }

          const isOpen = openMenus.has(item.title)
          const isActive = item.children?.some((child) =>
            pathname.startsWith(child.href)
          )

          return (
            <div key={item.title}>
              <button
                onClick={() => toggleMenu(item.title)}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground'
                )}
              >
                {Icon && <Icon className="h-4 w-4 shrink-0" />}
                <span className="flex-1 text-left">{item.title}</span>
                {isOpen ? (
                  <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 opacity-60" />
                )}
              </button>

              {isOpen && item.children && (
                <div className="ml-4 mt-0.5 space-y-0.5 border-l border-sidebar-border pl-3">
                  {item.children
                    .filter((child) => !child.roles || child.roles.includes(userRole))
                    .map((child) => {
                      const isChildActive = pathname === child.href
                      return (
                        <Link
                          key={child.href + child.title}
                          href={child.href}
                          className={cn(
                            'block rounded-md px-3 py-1.5 text-sm transition-colors',
                            isChildActive
                              ? 'bg-sidebar-primary text-sidebar-primary-foreground font-medium'
                              : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
                          )}
                        >
                          {child.title}
                        </Link>
                      )
                    })}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-2.5 rounded-md px-2 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sidebar-primary text-xs font-bold text-white">
            {user.name.slice(0, 1)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-medium text-sidebar-foreground">
              {user.name}
            </p>
            <p className="truncate text-xs text-sidebar-foreground/60">
              {ROLE_LABEL[userRole]} · {user.email}
            </p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="mt-1 flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground disabled:opacity-50"
        >
          <LogOut className="h-4 w-4" />
          {loggingOut ? '로그아웃 중...' : '로그아웃'}
        </button>
      </div>
    </aside>
  )
}
