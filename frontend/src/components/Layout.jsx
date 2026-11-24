import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { CREDITS } from '../data/credits'
import { useApp } from '../state'
import { Icon, Logo, Ring } from './ui'

export const NAV = [
  ['/match', 'Match', '공고 매칭'],
  ['/gap', 'Gap', '갭 로드맵'],
  ['/rewrite', 'Rewrite', '리라이팅'],
  ['/rehearse', 'Rehearse', '모의면접'],
]
const ROLE = { USER: ['구직자', 'bg-mint/15 text-[#0b8a68]'], TEST_ADMIN: ['테스트 관리자 · 읽기 전용', 'bg-tie/12 text-tie'], ADMIN: ['관리자', 'bg-navy text-white'] }
const PROVIDER = { google: 'Google', naver: '네이버', kakao: '카카오' }
const userLabel = (user) => (user?.name ? `${user.name} 님${user.provider ? ` · ${PROVIDER[user.provider] || user.provider}` : ''}` : '체험 사용자')

export function RoleBadge({ role }) {
  if (!role) return null
  const [l, c] = ROLE[role]
  return <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${c}`}>{l}</span>
}

function AccountMenu() {
  const { role, isAdmin, logout, pick, user } = useApp()
  const nav = useNavigate()
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [])
  if (!role) {
    if (pathname.endsWith('/login')) return null
    return (
      <Link to="/login" className="inline-flex h-10 items-center gap-2 rounded-full bg-navy px-5 text-sm font-semibold text-white hover:bg-suit">
        로그인 · 시작하기 {Icon.arrow()}
      </Link>
    )
  }
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)} aria-expanded={open} aria-haspopup="menu" className="flex h-10 items-center gap-2 rounded-full bg-white pl-1.5 pr-4 ring-1 ring-line hover:ring-navy">
        {isAdmin ? <span className="grid h-7 w-7 place-items-center rounded-full bg-navy text-white">{Icon.user('h-4 w-4')}</span>
          : <Ring value={pick} size={28} stroke={14} track="#e6e7f0"><span /></Ring>}
        <span className="text-sm font-semibold">{isAdmin ? '관리자' : <>Pick <span className="num">{pick}</span></>}</span>
      </button>
      {open && (
        <div role="menu" className="pop absolute right-0 top-12 w-60 rounded-3xl bg-white p-2 shadow-2xl ring-1 ring-line">
          <div className="flex items-center justify-between px-3 py-2"><span className="text-sm font-bold">{isAdmin ? '관리자 세션' : userLabel(user)}</span><RoleBadge role={role} /></div>
          {(isAdmin ? [['/admin', '관리자 콘솔']] : [['/journey', '내 여정 · Pick Score'], ['/match', '스크랩한 공고']]).map(([to, l]) => (
            <button key={to} role="menuitem" onClick={() => { setOpen(false); nav(to) }} className="block w-full rounded-2xl px-3 py-2.5 text-left text-sm hover:bg-bg">{l}</button>
          ))}
          <button role="menuitem" onClick={() => { setOpen(false); nav('/'); logout() }} className="block w-full rounded-2xl px-3 py-2.5 text-left text-sm text-tie hover:bg-tie/10">로그아웃</button>
        </div>
      )}
    </div>
  )
}

function Header() {
  const { role, isAdmin, logout, user } = useApp()
  const nav = useNavigate()
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  useEffect(() => {
    const on = () => { setScrolled(window.scrollY > 12) }
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])
  useEffect(() => { setOpen(false) }, [pathname])
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  const items = isAdmin ? [['/admin', 'Console', '관리자 콘솔']] : NAV
  return (
    <>
      {role === 'TEST_ADMIN' && <div className="caution sticky top-0 z-50 py-1 text-center"><span className="rounded-full bg-navy px-3 py-0.5 text-[11px] font-bold text-white">테스트 관리자 · 읽기 전용 모드 — 데이터 변경이 차단됩니다</span></div>}
      <header className={`sticky z-40 px-3 transition-all ${role === 'TEST_ADMIN' ? 'top-7' : 'top-0'} ${scrolled ? 'pt-2' : 'pt-4'}`}>
        <div className={`glass mx-auto flex max-w-[1240px] items-center justify-between rounded-full px-3 ring-1 ring-line transition-all sm:px-4 ${scrolled ? 'h-14 shadow-lg shadow-navy/5' : 'h-16'}`}>
          <Link to="/" aria-label="jobpick 메인" className="pl-1"><Logo /></Link>
          <nav className="hidden items-center gap-1 lg:flex" aria-label="주 메뉴">
            {items.map(([to, en, ko]) => (
              <NavLink key={to} to={to} className={({ isActive }) => `rounded-full px-4 py-2 text-sm font-semibold transition ${isActive ? 'bg-navy text-white' : 'text-sub hover:bg-white hover:text-navy'}`}>{ko}</NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <div className="hidden sm:block"><AccountMenu /></div>
            <button className="grid h-10 w-10 place-items-center rounded-full bg-white ring-1 ring-line lg:hidden" onClick={() => setOpen(!open)} aria-label={open ? '메뉴 닫기' : '메뉴 열기'} aria-expanded={open}>
              <span className="relative block h-3.5 w-5">
                <span className={`absolute left-0 h-[2px] w-5 rounded bg-navy transition-all duration-300 ${open ? 'top-[6px] rotate-45' : 'top-0'}`} />
                <span className={`absolute left-0 top-[6px] h-[2px] w-5 rounded bg-navy transition-opacity duration-300 ${open ? 'opacity-0' : ''}`} />
                <span className={`absolute left-0 h-[2px] w-5 rounded bg-navy transition-all duration-300 ${open ? 'top-[6px] -rotate-45' : 'top-[12px]'}`} />
              </span>
            </button>
          </div>
        </div>
      </header>

      <div className={`fixed inset-0 z-[60] lg:hidden ${open ? '' : 'pointer-events-none'}`} aria-hidden={!open}>
        <div onClick={() => setOpen(false)} className={`absolute inset-0 bg-navy/40 backdrop-blur-sm transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0'}`} />
        <aside className={`absolute bottom-3 right-3 top-3 flex w-[min(88%,380px)] flex-col rounded-[32px] bg-white p-5 shadow-2xl transition-transform duration-300 ${open ? 'translate-x-0' : 'translate-x-[110%]'}`}>
          <div className="flex items-center justify-between">
            <Logo />
            <button onClick={() => setOpen(false)} aria-label="닫기" className="grid h-10 w-10 place-items-center rounded-full bg-bg">{Icon.x()}</button>
          </div>
          <div className="mt-5 flex items-center justify-between rounded-3xl bg-bg p-4 text-sm">
            {role ? <><span className="font-semibold">{isAdmin ? '관리자 세션' : userLabel(user)}</span><RoleBadge role={role} /></> : <span className="text-sub">로그인하고 오늘의 Pick을 시작하세요</span>}
          </div>
          <nav className="mt-4 flex-1 space-y-1 overflow-y-auto">
            {[...items, ...(isAdmin ? [] : [['/journey', 'Journey', '내 여정']])].map(([to, en, ko]) => (
              <NavLink key={to} to={to} className={({ isActive }) => `flex items-center justify-between rounded-2xl px-4 py-4 ${isActive ? 'bg-navy text-white' : 'hover:bg-bg'}`}>
                <span className="text-lg font-bold">{ko}</span><span className="kicker opacity-50">{en}</span>
              </NavLink>
            ))}
          </nav>
          <div className="pt-4">
            {role ? <button onClick={() => { setOpen(false); nav('/'); logout() }} className="h-12 w-full rounded-full bg-bg text-sm font-semibold text-tie">로그아웃</button>
              : <Link to="/login" className="flex h-12 items-center justify-center gap-2 rounded-full bg-navy text-sm font-semibold text-white">로그인 · 시작하기 {Icon.arrow()}</Link>}
          </div>
        </aside>
      </div>
    </>
  )
}

function Footer() {
  const cols = [
    ['서비스', [['/match', '공고 매칭'], ['/gap', '갭 로드맵'], ['/rewrite', '리라이팅 스튜디오'], ['/rehearse', '모의면접']]],
    ['고객지원', [['/support', '고객센터'], ['/support', '자주 묻는 질문'], ['/support', '1:1 문의']]],
    ['정책', [['/terms', '이용약관'], ['/privacy', '개인정보처리방침'], ['/privacy', 'AI 데이터 이용 안내']]],
  ]
  const sns = [
    ['GitHub', 'https://github.com/fsclass-n/jobpick', 'M12 2a10 10 0 0 0-3.2 19.5c.5.1.7-.2.7-.5v-1.7c-2.8.6-3.4-1.3-3.4-1.3-.4-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.5 2.4 1.1 3 .8.1-.6.3-1.1.6-1.3-2.2-.3-4.6-1.1-4.6-5 0-1.1.4-2 1-2.7-.1-.3-.4-1.3.1-2.7 0 0 .8-.3 2.8 1a9.6 9.6 0 0 1 5 0c1.9-1.3 2.8-1 2.8-1 .5 1.4.2 2.4.1 2.7.6.7 1 1.6 1 2.7 0 3.9-2.4 4.7-4.6 5 .4.3.7.9.7 1.8V21c0 .3.2.6.7.5A10 10 0 0 0 12 2Z'],
    ['Instagram', 'https://www.instagram.com/', 'M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5Zm5 5a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm0 2a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm5.5-3a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4Z'],
    ['YouTube', 'https://www.youtube.com/', 'M22 8.2a3 3 0 0 0-2.1-2.1C18 5.6 12 5.6 12 5.6s-6 0-7.9.5A3 3 0 0 0 2 8.2 31 31 0 0 0 1.6 12 31 31 0 0 0 2 15.8a3 3 0 0 0 2.1 2.1c1.9.5 7.9.5 7.9.5s6 0 7.9-.5a3 3 0 0 0 2.1-2.1c.4-1.2.4-3.8.4-3.8s0-2.6-.4-3.8ZM10 15V9l5.2 3Z'],
  ]
  return (
    <footer className="mt-24 rounded-t-[40px] bg-navy text-white/70">
      <div className="wrap grid gap-10 pb-10 pt-16 md:grid-cols-[1.5fr_repeat(3,1fr)]">
        <div>
          <Logo light />
          <p className="mt-4 max-w-xs text-sm leading-relaxed">오늘의 공고를 넘기고 고르면, 합격까지의 거리가 줄어듭니다. 생성형 AI · RPA 기반 커리어 코치.</p>
          <div className="mt-6 rounded-3xl bg-white/5 p-5 ring-1 ring-white/10">
            <div className="text-xs">고객센터</div>
            <div className="num mt-1 text-3xl font-bold text-white">1588-0000</div>
            <div className="mt-1 text-xs">평일 10:00–18:00 · 점심 12:00–13:00 · 주말·공휴일 휴무</div>
          </div>
        </div>
        {cols.map(([t, links]) => (
          <div key={t}>
            <div className="mb-4 text-sm font-bold text-white">{t}</div>
            <ul className="space-y-2.5 text-sm">{links.map(([to, l]) => <li key={l}><Link to={to} className="hover:text-white">{l}</Link></li>)}</ul>
          </div>
        ))}
      </div>
      <div className="wrap flex flex-col gap-5 border-t border-white/10 py-8 text-xs leading-relaxed md:flex-row md:items-end md:justify-between">
        <div>
          <p>jobpick (교육용 팀 프로젝트) · 팀 박미금(조장) · 이오리 · 김모란 · 홍기흥 · help@jobpick.example</p>
          <p>사업자등록번호 000-00-00000 (예시) · AI 분석 결과는 참고용이며 채용 결과를 보장하지 않습니다.</p>
          <p className="mt-2 text-white/40">Photos: {CREDITS.map(([n, u], i) => <span key={n}>{i ? ', ' : ''}<a href={u} target="_blank" rel="noreferrer" className="hover:text-white">{n}</a></span>)} on <a href="https://unsplash.com/" target="_blank" rel="noreferrer" className="hover:text-white">Unsplash</a></p>
          <p className="mt-1 text-white/40">© 2026 jobpick. All rights reserved.</p>
        </div>
        <div className="flex gap-2">
          {sns.map(([n, u, d]) => (
            <a key={n} href={u} target="_blank" rel="noreferrer" aria-label={n} className="grid h-11 w-11 place-items-center rounded-full bg-white/5 ring-1 ring-white/10 hover:bg-white hover:text-navy">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden><path d={d} /></svg>
            </a>
          ))}
        </div>
      </div>
    </footer>
  )
}

function ToTop() {
  const [show, setShow] = useState(false)
  useEffect(() => {
    const on = () => { setShow(window.scrollY > 400) }
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])
  return (
    <button onClick={() => { window.scrollTo({ top: 0, behavior: 'smooth' }) }} aria-label="맨 위로"
      className={`fixed bottom-6 right-6 z-30 grid h-14 w-14 place-items-center rounded-full bg-tie text-white shadow-[0_12px_30px_-10px_rgba(255,90,60,.9)] transition hover:-translate-y-1 ${show ? 'opacity-100' : 'pointer-events-none translate-y-4 opacity-0'}`}>
      {Icon.up('h-6 w-6')}
    </button>
  )
}

export default function Layout() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1"><Outlet /></main>
      <Footer />
      <ToTop />
    </div>
  )
}
