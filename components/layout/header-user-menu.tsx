'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronDown, LogOut, User as UserIcon } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { UserRole } from '@/types/navigation'

const ROLE_LABEL: Record<UserRole, string> = {
  main_admin: '본사 운영팀',
  normal_admin: '일반 직원',
  partner_admin: '파트너',
}

interface HeaderUserMenuProps {
  user: {
    name: string
    email: string
    role: UserRole
  }
}

export function HeaderUserMenu({ user }: HeaderUserMenuProps) {
  const router = useRouter()
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

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
          {user.name.slice(0, 1)}
        </div>
        <span className="text-sm font-medium">{user.name}</span>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2 py-1.5">
          <p className="text-sm font-medium">{user.name}</p>
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{ROLE_LABEL[user.role]}</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/me" />}>
          <UserIcon className="mr-2 h-4 w-4" />내 프로필
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} disabled={loggingOut} variant="destructive">
          <LogOut className="mr-2 h-4 w-4" />
          {loggingOut ? '로그아웃 중...' : '로그아웃'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
