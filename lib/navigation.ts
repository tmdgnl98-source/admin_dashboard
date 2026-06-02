import { NavItem } from '@/types/navigation'

export const navItems: NavItem[] = [
  {
    title: '대시보드',
    href: '/dashboard',
    icon: 'layout-dashboard',
    roles: ['main_admin', 'normal_admin', 'partner_admin'],
  },
  {
    title: '충전소 관리',
    icon: 'building',
    roles: ['main_admin', 'normal_admin', 'partner_admin'],
    children: [
      { title: '충전소그룹 관리', href: '/stations/groups' },
      { title: '충전소 리스트', href: '/stations/list' },
    ],
  },
  {
    title: '계정 관리',
    icon: 'users',
    roles: ['main_admin'],
    children: [
      { title: '신규 계정 등록', href: '/accounts/new' },
      { title: '계정별 권한 관리', href: '/accounts/permissions' },
      { title: '충전소별 계정 관리', href: '/accounts/stations' },
      { title: '감사 로그', href: '/accounts/audit-log' },
    ],
  },
  {
    title: '충전소 정보',
    icon: 'zap',
    roles: ['main_admin', 'normal_admin', 'partner_admin'],
    children: [
      { title: '충전소 정보', href: '/station-info/info' },
      { title: '충전기 현황', href: '/station-info/chargers' },
      { title: '실시간 상태', href: '/station-info/realtime' },
      { title: '충전 이력', href: '/station-info/history' },
    ],
  },
  {
    title: '정산 관리',
    icon: 'calculator',
    roles: ['main_admin', 'partner_admin'],
    children: [
      { title: '정산 그룹 관리', href: '/settlement/info', roles: ['main_admin'] },
      { title: '정산 이력', href: '/settlement/history' },
      { title: '한전 납부 이력', href: '/settlement/kepco' },
    ],
  },
  {
    title: '유지보수',
    icon: 'wrench',
    roles: ['main_admin', 'normal_admin', 'partner_admin'],
    children: [
      { title: '접수/처리 이력', href: '/maintenance/tickets' },
      { title: '점검 이력', href: '/maintenance/inspection' },
    ],
  },
  {
    title: '고객센터',
    icon: 'headphones',
    roles: ['main_admin'],
    children: [
      { title: '공지사항', href: '/customer/notices' },
      { title: '자료게시판', href: '/customer/board' },
      { title: '메일,문자 발송', href: '/customer/messaging' },
    ],
  },
  // Beta(AI 챗봇, AI 리포트)는 임시 비활성화. 활성화 시 아래 주석 해제.
  // {
  //   title: 'Beta',
  //   icon: 'flask-conical',
  //   roles: ['main_admin'],
  //   children: [
  //     { title: 'AI 상담사 (챗봇)', href: '/beta/chatbot' },
  //     { title: 'AI 리포트', href: '/beta/report' },
  //   ],
  // },
]
