import { useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { cx } from '../../lib/format'
import { Button, RoleBadge } from '../ui'
import { NAV_ITEMS } from './nav'

/** 우측 -> 좌측으로 열리는 모바일 드로어 */
export default function MobileDrawer({ open, offset = 80, onClose, user, isSandbox, inAdmin, onLogout }) {
  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  const items = [
    ...(user ? [{ to: inAdmin ? '/admin' : '/dashboard', label: inAdmin ? '관리자 대시보드' : '내 대시보드', icon: 'fa-solid fa-gauge' }] : []),
    ...NAV_ITEMS,
    ...(isSandbox && !inAdmin ? [{ to: '/sandbox/admin', label: '샌드박스 관리 콘솔', icon: 'fa-solid fa-flask' }] : []),
  ]

  return (
    <div className={cx('fixed inset-x-0 bottom-0 z-[45] lg:hidden', open ? 'pointer-events-auto' : 'pointer-events-none')} style={{ top: offset }} aria-hidden={!open}>
      <div className={cx('absolute inset-0 bg-ink-950/50 backdrop-blur-sm transition-opacity duration-300', open ? 'opacity-100' : 'opacity-0')} onClick={onClose} />
      <aside
        id="mobile-drawer"
        className={cx(
          'absolute top-0 right-0 flex h-full w-[84%] pt-5 max-w-sm flex-col bg-white shadow-lift transition-transform duration-[400ms] ease-[cubic-bezier(0.22,1,0.36,1)]',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
        aria-label="모바일 메뉴"
      >
        <div className="mx-5 rounded-2xl bg-ink-50 p-4">
          {user ? (
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-pick-500 to-match-500 font-bold text-white">
                {user.name?.slice(0, 1)}
              </span>
              <div className="min-w-0">
                <p className="truncate font-semibold">{user.name}</p>
                <p className="truncate text-xs text-ink-400">{user.email}</p>
                <RoleBadge role={user.role} className="mt-1.5" />
              </div>
            </div>
          ) : (
            <div>
              <p className="font-display font-semibold">합격에 가까워지는 자소서</p>
              <p className="mt-1 text-xs text-ink-500">로그인하고 AI 적합도 분석을 받아 보세요.</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button to="/login" variant="secondary" size="sm">로그인</Button>
                <Button to="/signup" size="sm">회원가입</Button>
              </div>
            </div>
          )}
        </div>
        <nav className="mt-4 flex-1 overflow-y-auto px-3" aria-label="모바일 주 메뉴">
          {items.map((item, i) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/admin'}
              onClick={onClose}
              style={{ transitionDelay: open ? `${80 + i * 40}ms` : '0ms' }}
              className={({ isActive }) =>
                cx(
                  'flex items-center gap-3 rounded-xl px-4 py-3.5 text-[15px] font-semibold transition-all duration-500',
                  open ? 'translate-x-0 opacity-100' : 'translate-x-8 opacity-0',
                  isActive ? 'bg-pick-50 text-pick-600' : 'text-ink-700 hover:bg-ink-50',
                )
              }
            >
              <i className={cx(item.icon, 'w-5 text-center')} />
              {item.label}
              <i className="fa-solid fa-chevron-right ml-auto text-xs text-ink-300" />
            </NavLink>
          ))}
        </nav>
        {user && (
          <div className="border-t border-ink-100 p-5">
            <Button variant="secondary" className="w-full" icon="fa-solid fa-arrow-right-from-bracket" onClick={onLogout}>
              {inAdmin ? '관리자 로그아웃' : '로그아웃'}
            </Button>
          </div>
        )}
      </aside>
    </div>
  )
}
