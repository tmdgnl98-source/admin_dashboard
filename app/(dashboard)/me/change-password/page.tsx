import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { getCurrentUser } from '@/lib/auth/server'
import { ChangePasswordForm } from './change-password-form'

export default async function ChangePasswordPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <Header title="비밀번호 변경" />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-md">
          <ChangePasswordForm forced={user.mustChangePassword} />
        </div>
      </div>
    </div>
  )
}
