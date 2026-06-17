'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { Bell, ChevronDown, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { navItems } from '@/lib/navigation'
import { UserRole } from '@/types/navigation'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'

interface TopBarProps {
  userRole?: UserRole
}

function isChildActive(pathname: string, href: string): boolean {
  return href === '/' ? pathname === '/' : pathname.startsWith(href)
}

function isTabActive(
  pathname: string,
  item: { href?: string; children?: { href: string }[] }
): boolean {
  if (item.children?.length) {
    return item.children.some((c) => isChildActive(pathname, c.href))
  }
  if (item.href) return isChildActive(pathname, item.href)
  return false
}

export function TopBar({ userRole = 'main_admin' }: TopBarProps) {
  const pathname = usePathname() ?? ''
  const router = useRouter()

  const visibleTabs = navItems.filter((item) => item.roles.includes(userRole))

  const roleLabel =
    userRole === 'main_admin'
      ? '차지비 관리자'
      : userRole === 'partner_admin'
        ? '위탁 관리자'
        : '일반 관리자'

  return (
    <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/75">
      <div className="mx-auto flex h-14 max-w-[2200px] items-center gap-4 px-6">
        <Link
          href="/dashboard"
          aria-label="GS차지비 홈"
          className="shrink-0"
        >
          <Image
            src="/logo.png"
            alt="GS차지비"
            width={772}
            height={225}
            sizes="120px"
            className="h-7 w-auto object-contain"
            priority
          />
        </Link>

        <nav className="flex items-center gap-1">
          {visibleTabs.map((tab) => {
            const active = isTabActive(pathname, tab)
            const baseClass = cn(
              'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              active
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )

            if (tab.children?.length) {
              const allowedChildren = tab.children.filter(
                (c) => !c.roles || c.roles.includes(userRole)
              )
              return (
                <DropdownMenu key={tab.title}>
                  <DropdownMenuTrigger
                    className={cn(baseClass, 'inline-flex items-center gap-0.5')}
                  >
                    {tab.title}
                    <ChevronDown className="h-3 w-3 opacity-70" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-48">
                    {allowedChildren.map((c) => {
                      const childActive = isChildActive(pathname, c.href)
                      return (
                        <DropdownMenuItem
                          key={c.href}
                          onClick={() => router.push(c.href)}
                          className={cn(
                            childActive
                              ? 'bg-accent font-medium text-accent-foreground'
                              : ''
                          )}
                        >
                          {c.title}
                        </DropdownMenuItem>
                      )
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              )
            }

            if (!tab.href) return null
            return (
              <Link key={tab.title} href={tab.href} className={baseClass}>
                {tab.title}
              </Link>
            )
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            className="relative inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="알림"
          >
            <Bell className="h-4 w-4" />
            <Badge className="absolute -right-0.5 -top-0.5 h-4 min-w-4 items-center justify-center p-0 px-1 text-[10px]">
              3
            </Badge>
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-1.5 rounded-md px-2 py-1 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                관
              </span>
              <span className="hidden sm:inline">{roleLabel}</span>
              <ChevronDown className="h-3 w-3 opacity-70" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem>내 프로필</DropdownMenuItem>
              <DropdownMenuItem>설정</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive">
                <LogOut className="h-3.5 w-3.5" />
                로그아웃
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
