import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useApp } from '../state'
import { Badge, Check, Gauge, Logo } from './ui'

const NAV = [
  ['/match', 'Match', '공고 매칭'],
  ['/gap', 'Gap', '갭 로드맵'],
  ['/rewrite', 'Rewrite', '리라이팅'],
  ['/rehearse', 'Rehearse', '모의면접'],
  ['/journey', 'Journey', '내 여정'],
]
const ROLE_LABEL = { USER: '일반 사용자', ADMIN: '관리자' }

function RoleBadge({ role }) {
  return role ? <Badge tone={role === 'ADMIN' ? 'red' : 'brand'}>{ROLE_LABEL[role]}</Badge> : null
}

function Header() {
  const { role, logout } = useApp()
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 16)
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])
  useEffect(() => setOpen(false), [pathname])
  useEffect(() => { document.body.style.overflow = open ? 'hidden' : '' }, [open])

  const link = ({ isActive }) => `rounded-lg px-3 py-2 text-sm font-medium transition ${isActive ? 'bg-indigo-50 text-brand' : 'text-slate-600 hover:text-brand'}`
  return (
    <header className={`sticky top-0 z-40 border-b transition-all ${scrolled ? 'border-slate-200 bg-white/70 backdrop-blur-md' : 'border-transparent bg-white'}`}>
      <div className={`mx-auto flex max-w-6xl items-center justify-between px-4 transition-all ${scrolled ? 'h-14' : 'h-[72px]'}`}>
        <Link to="/" aria-label="jobpick 홈"><Logo /></Link>
        <nav className="hidden items-center gap-1 lg:flex">
          {NAV.map(([to, en, ko]) => <NavLink key={to} to={to} className={link}>{ko}<span className="ml-1 text-[10px] text-slate-400">{en}</span></NavLink>)}
        </nav>
        <div className="hidden items-center gap-3 lg:flex">
          {role ? (
            <>
              <RoleBadge role={role} />
              {role === 'ADMIN' && <Link to="/admin" className="text-sm font-medium text-slate-600 hover:text-brand">관리자</Link>}
              <button onClick={logout} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50">로그아웃</button>
            </>
          ) : (
            <Link to="/login" className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">로그인</Link>
          )}
        </div>
        <button className="grid h-10 w-10 place-items-center lg:hidden" onClick={() => setOpen(!open)} aria-label={open ? '메뉴 닫기' : '메뉴 열기'} aria-expanded={open}>
          <span className="relative block h-4 w-6">
            <span className={`absolute left-0 h-0.5 w-6 bg-ink transition-all duration-300 ${open ? 'top-1.5 rotate-45' : 'top-0'}`} />
            <span className={`absolute left-0 top-1.5 h-0.5 w-6 bg-ink transition-opacity duration-300 ${open ? 'opacity-0' : ''}`} />
            <span className={`absolute left-0 h-0.5 w-6 bg-ink transition-all duration-300 ${open ? 'top-1.5 -rotate-45' : 'top-3'}`} />
          </span>
        </button>
      </div>

      <div className={`fixed inset-0 top-0 z-50 lg:hidden ${open ? '' : 'pointer-events-none'}`} aria-hidden={!open}>
        <div onClick={() => setOpen(false)} className={`absolute inset-0 bg-slate-900/40 transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0'}`} />
        <aside className={`absolute right-0 top-0 flex h-full w-72 flex-col gap-2 bg-white p-5 shadow-xl transition-transform duration-300 ${open ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="mb-2 flex items-center justify-between">
            <Logo />
            <button onClick={() => setOpen(false)} aria-label="닫기" className="text-2xl leading-none text-slate-500">×</button>
          </div>
          <div className="mb-2 rounded-xl bg-slate-50 p-3 text-sm">
            {role ? <div className="flex items-center justify-between"><span>로그인됨</span><RoleBadge role={role} /></div> : <span className="text-slate-500">로그인이 필요합니다</span>}
          </div>
          {NAV.map(([to, en, ko]) => <NavLink key={to} to={to} className={link}>{ko} <span className="text-[10px] text-slate-400">{en}</span></NavLink>)}
          {role === 'ADMIN' && <NavLink to="/admin" className={link}>관리자</NavLink>}
          <div className="mt-auto">
            {role ? <button onClick={logout} className="w-full rounded-lg border border-slate-200 py-2 text-sm">로그아웃</button>
              : <Link to="/login" className="block rounded-lg bg-brand py-2 text-center text-sm font-medium text-white">로그인</Link>}
          </div>
        </aside>
      </div>
    </header>
  )
}

export function JourneyTracker() {
  const { pick, distance, cutoff, match, coverage, rehearse } = useApp()
  const steps = [['Match', match], ['Gap', coverage], ['Rewrite', match], ['Rehearse', rehearse]]
  return (
    <div className="mb-6 flex flex-wrap items-center gap-4 rounded-2xl border border-indigo-100 bg-white p-4 shadow-sm">
      <Gauge value={pick} size={84} label="Pick" />
      <div className="min-w-[180px] flex-1">
        <div className="text-sm text-slate-500">합격선 {cutoff}점까지</div>
        <div className="font-display text-2xl font-extrabold">{distance > 0 ? `${distance}점 남음` : <span className="text-emerald-600">합격선 도달 <Check className="inline h-5 w-5" /></span>}</div>
        <div className="text-xs text-slate-400">참고 지표이며 실제 합격을 보장하지 않습니다.</div>
      </div>
      <ol className="flex gap-2 text-xs">
        {steps.map(([n, v]) => (
          <li key={n} className="rounded-lg bg-slate-50 px-3 py-2 text-center"><div className="text-slate-500">{n}</div><div className="font-bold">{v}</div></li>
        ))}
      </ol>
    </div>
  )
}

function Footer() {
  return (
    <footer className="mt-20 bg-ink text-slate-300">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-3">
        <div>
          <Logo light />
          <p className="mt-3 text-sm text-slate-400">RPA가 모은 공고와 내 자소서를 맞대어, 합격까지의 거리를 줄여 주는 생성형 AI 커리어 코치입니다.</p>
        </div>
        <div className="text-sm">
          <div className="mb-2 font-bold text-white">Team</div>
          <p>박미금 (조장) · 이오리 · 김모란 · 홍기흥</p>
          <a className="mt-2 inline-block text-indigo-300 hover:underline" href="https://github.com/fsclass-n/jobpick" target="_blank" rel="noreferrer">GitHub</a>
        </div>
        <div className="text-sm">
          <div className="mb-2 font-bold text-white">Policy</div>
          <ul className="space-y-1"><li><Link to="/terms" className="hover:text-white">이용약관</Link></li><li><Link to="/privacy" className="hover:text-white">개인정보처리방침</Link></li></ul>
        </div>
      </div>
      <div className="border-t border-slate-700 py-4 text-center text-xs text-slate-500">© 2026 jobpick. All rights reserved. AI 분석 결과는 참고용입니다.</div>
    </footer>
  )
}

function ToTop() {
  const [show, setShow] = useState(false)
  useEffect(() => {
    const on = () => setShow(window.scrollY > 400)
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])
  return (
    <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="맨 위로"
      className={`fixed bottom-6 right-6 z-30 grid h-11 w-11 place-items-center rounded-full bg-brand text-white shadow-lg transition ${show ? 'opacity-100' : 'pointer-events-none translate-y-4 opacity-0'}`}>
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
    </button>
  )
}

export default function Layout() {
  const { pathname } = useLocation()
  useEffect(() => window.scrollTo(0, 0), [pathname])
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1"><Outlet /></main>
      <Footer />
      <ToTop />
    </div>
  )
}
