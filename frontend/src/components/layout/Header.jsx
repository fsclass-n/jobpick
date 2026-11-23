import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { USE_MOCK } from '../../api'
import { useAuth } from '../../context/AuthContext'
import { cx } from '../../lib/format'
import { Button, RoleBadge } from '../ui'
import Logo from './Logo'
import MobileDrawer from './MobileDrawer'
import { NAV_ITEMS } from './nav'

function useScrolled(threshold = 12) {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > threshold)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [threshold])
  return scrolled
}

function UserMenu({ user, onLogout, isSandbox }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    const close = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false)
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])
  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-xl border border-ink-100 bg-white py-1.5 pr-3 pl-1.5 text-sm font-semibold text-ink-800 transition hover:border-pick-200"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-pick-500 to-match-500 text-xs font-bold text-white">
          {user.name?.slice(0, 1) || 'U'}
        </span>
        <span className="max-w-24 truncate">{user.name}</span>
        <i className={cx('fa-solid fa-chevron-down text-[10px] text-ink-400 transition', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-60 animate-fade-up rounded-2xl border border-ink-100 bg-white p-2 shadow-lift" role="menu">
          <div className="border-b border-ink-100 px-3 pt-2 pb-3">
            <p className="truncate text-sm font-semibold">{user.name}</p>
            <p className="truncate text-xs text-ink-400">{user.email}</p>
            <RoleBadge role={user.role} className="mt-2" />
          </div>
          {[
            { to: '/dashboard', label: '내 대시보드', icon: 'fa-solid fa-gauge' },
            { to: '/resumes', label: '자소서 관리', icon: 'fa-solid fa-file-pen' },
            ...(isSandbox ? [{ to: '/sandbox/admin', label: '샌드박스 관리 콘솔', icon: 'fa-solid fa-flask' }] : []),
          ].map((m) => (
            <Link key={m.to} to={m.to} onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-ink-700 hover:bg-ink-50" role="menuitem">
              <i className={cx(m.icon, 'w-4 text-ink-400')} />
              {m.label}
            </Link>
          ))}
          <button onClick={onLogout} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-coral-600 hover:bg-coral-50" role="menuitem">
            <i className="fa-solid fa-arrow-right-from-bracket w-4" />
            로그아웃
          </button>
        </div>
      )}
    </div>
  )
}

export default function Header() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { userSession, adminSession, isSandbox, logoutUser, logoutAdmin } = useAuth()
  const scrolled = useScrolled()
  const [drawer, setDrawer] = useState(false)
  const [offset, setOffset] = useState(80)
  const barRef = useRef(null)
  const isHome = pathname === '/'
  const inAdmin = pathname.startsWith('/admin')
  const inConsole = inAdmin || pathname.startsWith('/sandbox/admin')
  const transparent = isHome && !scrolled && !drawer
  const user = userSession?.user

  useEffect(() => {
    setDrawer(false)
  }, [pathname])
  useEffect(() => {
    if (drawer && barRef.current) setOffset(barRef.current.getBoundingClientRect().bottom)
  }, [drawer, scrolled])
  // 홈 히어로가 투명 헤더 아래까지 확장되도록 헤더 높이를 CSS 변수로 노출
  useEffect(() => {
    const el = barRef.current
    if (!el || !('ResizeObserver' in window)) return undefined
    const ro = new ResizeObserver(() => document.documentElement.style.setProperty('--header-h', `${el.offsetHeight}px`))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const handleLogout = () => {
    logoutUser()
    navigate('/')
  }
  const handleAdminLogout = async () => {
    await logoutAdmin()
    navigate('/admin/login')
  }

  return (
    <>
      <div className="sticky top-0 z-50" ref={barRef}>
        {isSandbox && !inConsole && (
          <div className="bg-[repeating-linear-gradient(45deg,#ffc44d,#ffc44d_12px,#f5a524_12px,#f5a524_24px)] text-ink-950">
            <div className="container-page flex h-8 items-center justify-center gap-2 text-xs font-bold">
              <i className="fa-solid fa-flask" />
              SANDBOX 모드 · 테스트 관리자 세션입니다. 관리 기능은 샌드박스 데이터에만 적용됩니다.
              <Link to="/sandbox/admin" className="underline underline-offset-2 max-sm:hidden">샌드박스 콘솔</Link>
            </div>
          </div>
        )}
        {USE_MOCK && (
          <div className="bg-ink-950 text-[11px] text-ink-300">
            <div className="container-page flex h-6 items-center justify-center gap-2">
              <i className="fa-solid fa-circle-info text-pick-300" />
              데모 환경 · Mock 데이터로 동작하며 입력 내용은 이 브라우저에만 저장됩니다.
            </div>
          </div>
        )}
        <header
          className={cx(
            'transition-all duration-300',
            transparent ? 'bg-transparent' : 'border-b border-ink-100/80 bg-white/80 shadow-[0_8px_30px_-20px_rgb(15_20_48/0.35)] backdrop-blur-xl',
          )}
        >
          <div className={cx('container-page flex items-center justify-between gap-6 transition-all duration-300', scrolled ? 'h-16' : 'h-20')}>
            <Link to="/" aria-label="jobpick 홈">
              <Logo light={transparent} />
            </Link>

            <nav className="hidden items-center gap-1 lg:flex" aria-label="주 메뉴">
              {NAV_ITEMS.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => {
                    const active = isActive || (item.match && pathname.startsWith(item.match))
                    return cx(
                      'relative rounded-xl px-4 py-2 text-sm font-semibold transition',
                      transparent ? 'text-white/80 hover:text-white' : 'text-ink-600 hover:bg-ink-50 hover:text-ink-900',
                      active && (transparent ? 'text-white' : 'text-pick-600'),
                    )
                  }}
                >
                  {({ isActive }) => (
                    <>
                      {item.label}
                      {(isActive || (item.match && pathname.startsWith(item.match))) && (
                        <span className="absolute inset-x-4 -bottom-0.5 h-0.5 rounded-full bg-gradient-to-r from-pick-500 to-match-500" />
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </nav>

            <div className="hidden items-center gap-2 lg:flex">
              {inAdmin && adminSession ? (
                <>
                  <RoleBadge role="ADMIN" />
                  <span className="text-sm font-semibold text-ink-700">{adminSession.user?.name}</span>
                  <Button variant="secondary" size="sm" icon="fa-solid fa-arrow-right-from-bracket" onClick={handleAdminLogout}>
                    관리자 로그아웃
                  </Button>
                </>
              ) : user ? (
                <>
                  {isSandbox && (
                    <Button to="/sandbox/admin" variant="secondary" size="sm" icon="fa-solid fa-flask">
                      샌드박스 콘솔
                    </Button>
                  )}
                  <UserMenu user={user} isSandbox={isSandbox} onLogout={handleLogout} />
                </>
              ) : (
                <>
                  <Button to="/login" variant="ghost" size="sm" className={transparent ? 'text-white/85 hover:bg-white/10 hover:text-white' : ''}>
                    로그인
                  </Button>
                  <Button to="/signup" size="sm" icon="fa-solid fa-bolt">
                    무료로 시작하기
                  </Button>
                </>
              )}
            </div>

            <button
              className={cx('relative grid h-11 w-11 place-items-center rounded-xl lg:hidden', transparent ? 'text-white' : 'text-ink-900')}
              onClick={() => setDrawer((v) => !v)}
              aria-label={drawer ? '메뉴 닫기' : '메뉴 열기'}
              aria-expanded={drawer}
              aria-controls="mobile-drawer"
            >
              <span className="relative block h-4 w-6">
                <span className={cx('absolute left-0 h-0.5 w-6 rounded-full bg-current transition-all duration-300', drawer ? 'top-1/2 -translate-y-1/2 rotate-45' : 'top-0')} />
                <span className={cx('absolute top-1/2 left-0 h-0.5 w-6 -translate-y-1/2 rounded-full bg-current transition-all duration-200', drawer ? 'scale-x-0 opacity-0' : 'opacity-100')} />
                <span className={cx('absolute left-0 h-0.5 w-6 rounded-full bg-current transition-all duration-300', drawer ? 'top-1/2 -translate-y-1/2 -rotate-45' : 'bottom-0')} />
              </span>
            </button>
          </div>
        </header>
      </div>
      <MobileDrawer
        open={drawer}
        offset={offset}
        onClose={() => setDrawer(false)}
        user={inAdmin && adminSession ? adminSession.user : user}
        isSandbox={isSandbox}
        inAdmin={inAdmin && !!adminSession}
        onLogout={inAdmin && adminSession ? handleAdminLogout : handleLogout}
      />
    </>
  )
}
