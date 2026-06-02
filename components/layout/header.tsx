'use client'

import { useEffect, useState } from 'react'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { HeaderUserMenu } from './header-user-menu'
import type { UserRole } from '@/types/navigation'

interface HeaderProps {
  title: string
}

interface MeUser {
  name: string
  email: string
  role: UserRole
}

/**
 * 'use client' — client·server 페이지 모두에서 호출 가능하도록 client.
 * 마운트 시 /api/auth/me로 user 로드. 일반적으로 layout이 이미 user 검증을 하므로
 * 여기서 user가 null이면 잠깐의 로딩 상태일 뿐 (proxy.ts가 비로그인은 미리 차단).
 */
export function Header({ title }: HeaderProps) {
  const [user, setUser] = useState<MeUser | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/auth/me')
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data) => {
        if (!cancelled && data?.user) setUser(data.user)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-card px-6">
      <h1 className="text-base font-semibold text-foreground">{title}</h1>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="relative h-8 w-8">
          <Bell className="h-4 w-4" />
          <Badge className="absolute -right-0.5 -top-0.5 h-4 w-4 items-center justify-center p-0 text-[10px]">
            3
          </Badge>
        </Button>

        {user && <HeaderUserMenu user={user} />}
      </div>
    </header>
  )
}
