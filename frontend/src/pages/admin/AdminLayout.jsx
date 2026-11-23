import { createContext, useContext, useEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { api } from '../../api'
import { useAuth } from '../../context/AuthContext'
import { cx } from '../../lib/format'

const AdminScopeContext = createContext(null)
export const useAdminScope = () => useContext(AdminScopeContext)

/**
 * scope='admin'   : 정식 관리자 (/admin, 관리자 전용 토큰, 운영 데이터)
 * scope='sandbox' : 테스트 관리자 (/sandbox/admin, 샌드박스 토큰, 샌드박스 데이터)
 */
const SCOPES = {
  admin: { base: '/admin', api: api.admin, label: '운영 관리자 콘솔', isSandbox: false },
  sandbox: { base: '/sandbox/admin', api: api.sandbox, label: '샌드박스 관리 콘솔', isSandbox: true },
}

function SessionTimer() {
  const { adminSession } = useAuth()
  const [left, setLeft] = useState(0)
  useEffect(() => {
    const tick = () => setLeft(Math.max(0, Math.floor((adminSession.expiresAt - Date.now()) / 1000)))
    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [adminSession])
  const m = String(Math.floor(left / 60)).padStart(2, '0')
  const s = String(left % 60).padStart(2, '0')
  return (
    <span className={cx('font-mono font-semibold', left < 300 ? 'text-coral-400' : 'text-white')}>
      <i className="fa-regular fa-clock mr-1" />{m}:{s}
    </span>
  )
}

export default function AdminLayout({ scope }) {
  const conf = SCOPES[scope]
  const menu = [
    { to: conf.base, label: '모니터링 대시보드', icon: 'fa-solid fa-chart-column', end: true },
    { to: `${conf.base}/users`, label: '회원 관리', icon: 'fa-solid fa-users' },
    { to: `${conf.base}/crawl`, label: '수집 관리', icon: 'fa-solid fa-robot' },
    ...(conf.isSandbox ? [] : [{ to: `${conf.base}/logs`, label: '관리자 접속 로그', icon: 'fa-solid fa-clipboard-list' }]),
  ]
  return (
    <AdminScopeContext.Provider value={{ scope, ...conf }}>
      <div className={cx(conf.isSandbox ? 'bg-sun-50/40' : 'bg-ink-50')}>
        <div className={cx('border-b', conf.isSandbox ? 'border-sun-400/40 bg-sun-400 text-ink-950' : 'border-ink-800 bg-ink-900 text-white')}>
          <div className="container-page flex flex-wrap items-center justify-between gap-2 py-2.5 text-xs font-semibold">
            <span className="flex items-center gap-2">
              <i className={conf.isSandbox ? 'fa-solid fa-flask' : 'fa-solid fa-shield-halved text-match-400'} />
              {conf.isSandbox ? 'SANDBOX · 테스트 관리자 세션 — 모든 조회·변경은 샌드박스 데이터에만 적용됩니다.' : 'PRODUCTION · 정식 관리자 세션 — 실서비스 운영 데이터입니다. 모든 작업이 기록됩니다.'}
            </span>
            {!conf.isSandbox && <span>세션 남은 시간 <SessionTimer /></span>}
          </div>
        </div>
        <div className="container-page grid grid-cols-1 gap-6 py-8 lg:grid-cols-[240px_minmax(0,1fr)] lg:py-10">
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <p className="mb-3 hidden px-3 text-xs font-bold tracking-wider text-ink-400 lg:block">{conf.label}</p>
            <nav className="flex gap-1 overflow-x-auto lg:flex-col" aria-label="관리자 메뉴">
              {menu.map((m) => (
                <NavLink
                  key={m.to}
                  to={m.to}
                  end={m.end}
                  className={({ isActive }) =>
                    cx('flex shrink-0 items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition', isActive ? (conf.isSandbox ? 'bg-sun-400 text-ink-950' : 'bg-ink-900 text-white') : 'text-ink-600 hover:bg-white')
                  }
                >
                  <i className={cx(m.icon, 'w-4')} />
                  {m.label}
                </NavLink>
              ))}
            </nav>
          </aside>
          <div className="min-w-0">
            <Outlet />
          </div>
        </div>
      </div>
    </AdminScopeContext.Provider>
  )
}
