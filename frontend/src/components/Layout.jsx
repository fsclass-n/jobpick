import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useApp } from '../state'
import { Check, Gauge, Logo } from './ui'

export const NAV = [
  ['/match', '01', 'Match', '공고 매칭'],
  ['/gap', '02', 'Gap', '갭 로드맵'],
  ['/rewrite', '03', 'Rewrite', '리라이팅'],
  ['/rehearse', '04', 'Rehearse', '모의면접'],
]
const ROLE = { USER: ['MEMBER', 'bg-pick text-ink'], TEST_ADMIN: ['TEST ADMIN · READ-ONLY', 'bg-alert text-white'], ADMIN: ['ADMIN', 'bg-ink text-pick'] }

function RoleBadge({ role }) {
  if (!role) return null
  const [l, c] = ROLE[role]
  return <span className={`px-2 py-0.5 text-[10px] font-bold tracking-widest ${c}`}>{l}</span>
}

function Header() {
  const { role, isAdmin, logout, pick } = useApp()
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()

  useEffect(() => {
    const on = () => { setScrolled(window.scrollY > 24) }
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])
  useEffect(() => { setOpen(false) }, [pathname])
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <header className="sticky top-0 z-40">
      {role === 'TEST_ADMIN' && (
        <div className="stripe py-1 text-center"><span className="bg-ink px-3 py-0.5 text-[11px] font-bold tracking-widest text-pick">TEST ADMIN — 읽기 전용 모드 · 데이터 변경이 차단됩니다</span></div>
      )}
      <div className={`border-b border-ink bg-ink text-paper transition-all ${scrolled ? 'h-0 overflow-hidden border-0' : 'h-8'}`}>
        <div className="wrap flex h-8 items-center justify-between text-[11px]">
          <div className="hidden min-w-0 flex-1 overflow-hidden sm:block">
            <div className="ticker flex w-max gap-10 whitespace-nowrap text-paper/70">
              {[0, 1].map((k) => <span key={k} className="flex gap-10"><span>RPA 오늘 수집 공고 160건</span><span>공공데이터포털 · 서울 열린데이터 · 나라일터</span><span>이번 주 인기 역량: SQL · A/B 테스트 · Tableau</span></span>)}
            </div>
          </div>
          <div className="ml-6 flex shrink-0 items-center gap-4 whitespace-nowrap">
            <Link to="/support" className="link-u">고객센터</Link>
            {role ? <button onClick={logout} className="link-u">로그아웃</button> : <Link to="/login" className="link-u">로그인</Link>}
          </div>
        </div>
      </div>
      <div className={`border-b border-ink transition-all ${scrolled ? 'bg-paper/80 backdrop-blur-md' : 'bg-paper'}`}>
        <div className={`wrap grid grid-cols-[1fr_auto_1fr] items-center transition-all ${scrolled ? 'h-14' : 'h-20'}`}>
          <nav className="hidden items-center gap-7 lg:flex" aria-label="주 메뉴">
            {NAV.map(([to, no, en, ko]) => (
              <NavLink key={to} to={to} className={({ isActive }) => `group text-sm font-semibold ${isActive ? 'active' : ''}`}>
                {({ isActive }) => <><span className="mr-1 text-[10px] text-mute">{no}</span><span className={`link-u ${isActive ? 'active' : ''}`}>{ko}</span></>}
              </NavLink>
            ))}
          </nav>
          <button className="grid h-10 w-10 place-items-center lg:hidden" onClick={() => setOpen(!open)} aria-label={open ? '메뉴 닫기' : '메뉴 열기'} aria-expanded={open}>
            <span className="relative block h-4 w-6">
              <span className={`absolute left-0 h-[2px] w-6 bg-ink transition-all duration-300 ${open ? 'top-[7px] rotate-45' : 'top-0'}`} />
              <span className={`absolute left-0 top-[7px] h-[2px] w-6 bg-ink transition-opacity duration-300 ${open ? 'opacity-0' : ''}`} />
              <span className={`absolute left-0 h-[2px] w-6 bg-ink transition-all duration-300 ${open ? 'top-[7px] -rotate-45' : 'top-[14px]'}`} />
            </span>
          </button>
          <Link to="/" aria-label="jobpick 메인" className="justify-self-center"><Logo small={scrolled} /></Link>
          <div className="flex items-center justify-end gap-4">
            {role && !isAdmin && (
              <Link to="/journey" className="hidden items-center gap-2 border border-ink px-3 py-1.5 text-xs font-semibold hover:bg-pick sm:flex" title="내 Pick Score">
                PICK <span className="font-serif text-base font-black">{pick}</span>
              </Link>
            )}
            {isAdmin && <Link to="/admin" className="hidden text-sm font-semibold sm:block"><span className="link-u">관리자</span></Link>}
            <span className="hidden md:block"><RoleBadge role={role} /></span>
            {!role && <Link to="/login" className="hidden bg-ink px-4 py-2 text-xs font-bold tracking-wider text-paper hover:bg-black sm:block">START</Link>}
          </div>
        </div>
      </div>

      <div className={`fixed inset-0 z-50 lg:hidden ${open ? '' : 'pointer-events-none'}`} aria-hidden={!open}>
        <div onClick={() => setOpen(false)} className={`absolute inset-0 bg-ink/50 transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0'}`} />
        <aside className={`absolute right-0 top-0 flex h-full w-[86%] max-w-sm flex-col bg-paper transition-transform duration-300 ${open ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="flex h-20 items-center justify-between border-b border-ink px-6">
            <Logo small />
            <button onClick={() => setOpen(false)} aria-label="닫기" className="text-3xl leading-none">×</button>
          </div>
          <div className="flex items-center justify-between border-b border-line px-6 py-4 text-sm">
            {role ? <><span className="font-semibold">{isAdmin ? '관리자 세션' : '김픽 님'}</span><RoleBadge role={role} /></> : <Link to="/login" className="font-semibold underline">로그인하고 여정 시작하기</Link>}
          </div>
          <nav className="flex-1 overflow-y-auto">
            {[...NAV, ['/journey', '05', 'Journey', '내 여정']].map(([to, no, en, ko]) => (
              <NavLink key={to} to={to} className={({ isActive }) => `flex items-baseline gap-3 border-b border-line px-6 py-5 ${isActive ? 'bg-pick' : ''}`}>
                <span className="text-xs text-mute">{no}</span><span className="font-serif text-2xl font-black">{ko}</span><span className="eyebrow ml-auto text-mute">{en}</span>
              </NavLink>
            ))}
            {isAdmin && <NavLink to="/admin" className="flex items-baseline gap-3 border-b border-line px-6 py-5"><span className="font-serif text-2xl font-black">관리자</span></NavLink>}
          </nav>
          <div className="border-t border-ink p-6">
            {role ? <button onClick={logout} className="w-full border border-ink py-3 text-sm font-semibold">로그아웃</button>
              : <Link to="/login" className="block bg-ink py-3 text-center text-sm font-semibold text-paper">로그인</Link>}
          </div>
        </aside>
      </div>
    </header>
  )
}

export function JourneyBar() {
  const { pick, distance, cutoff, match, coverage, rehearse } = useApp()
  const items = [['Match', match, '/match'], ['Gap', coverage, '/gap'], ['Rewrite', match, '/rewrite'], ['Rehearse', rehearse, '/rehearse']]
  return (
    <div className="mt-6 grid border border-ink bg-white md:grid-cols-[auto_1fr_auto]">
      <div className="flex items-center gap-4 border-b border-ink bg-ink p-4 text-paper md:border-b-0 md:border-r">
        <Gauge value={pick} size={76} label="pick" dark />
        <div>
          <div className="eyebrow text-paper/60">합격선 {cutoff}</div>
          <div className="font-serif text-2xl font-black">{distance > 0 ? `${distance}점 남음` : <span className="text-pick">도달 <Check className="inline h-5 w-5" /></span>}</div>
        </div>
      </div>
      <ol className="grid grid-cols-4">
        {items.map(([n, v, to], i) => (
          <li key={n} className={`${i ? 'border-l border-line' : ''}`}>
            <Link to={to} className="block h-full p-4 hover:bg-pick">
              <div className="eyebrow text-[9px] text-mute">0{i + 1} {n}</div>
              <div className="font-serif text-2xl font-black">{v}</div>
            </Link>
          </li>
        ))}
      </ol>
      <p className="hidden max-w-[180px] items-center border-l border-line p-4 text-[11px] text-mute md:flex">Pick Score는 참고 지표이며 실제 합격을 보장하지 않습니다.</p>
    </div>
  )
}

function Footer() {
  const cols = [
    ['Service', [['/match', '공고 매칭'], ['/gap', '갭 로드맵'], ['/rewrite', '리라이팅 스튜디오'], ['/rehearse', '모의면접']]],
    ['Support', [['/support', '고객센터'], ['/support', '자주 묻는 질문'], ['/support', '1:1 문의']]],
    ['Policy', [['/terms', '이용약관'], ['/privacy', '개인정보처리방침'], ['/privacy', 'AI 데이터 이용 안내']]],
  ]
  const sns = [['GitHub', 'https://github.com/fsclass-n/jobpick'], ['Instagram', 'https://www.instagram.com/'], ['YouTube', 'https://www.youtube.com/'], ['Blog', 'https://fsclass-n.github.io/jobpick/']]
  return (
    <footer className="mt-24 border-t border-ink bg-paper">
      <div className="wrap grid gap-10 py-14 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-mute">공고와 나를 맞대어, 합격까지의 거리를 줄이는 커리어 에디토리얼 플랫폼.</p>
          <div className="mt-6">
            <div className="eyebrow text-mute">Customer Center</div>
            <div className="font-serif mt-1 text-3xl font-black">1588-0000</div>
            <div className="text-xs text-mute">평일 10:00–18:00 (점심 12:00–13:00) · 주말·공휴일 휴무</div>
          </div>
        </div>
        {cols.map(([t, links]) => (
          <div key={t}>
            <div className="eyebrow mb-4">{t}</div>
            <ul className="space-y-2 text-sm">{links.map(([to, l]) => <li key={l}><Link to={to} className="link-u">{l}</Link></li>)}</ul>
          </div>
        ))}
      </div>
      <div className="border-t border-line">
        <div className="wrap flex flex-col gap-4 py-6 text-[11px] leading-relaxed text-mute md:flex-row md:items-end md:justify-between">
          <div>
            <p>상호 jobpick (교육용 팀 프로젝트) · 팀 박미금(조장) · 이오리 · 김모란 · 홍기흥</p>
            <p>사업자등록번호 000-00-00000 (예시) · 통신판매업 신고 해당 없음 · 이메일 help@jobpick.example</p>
            <p className="mt-2">© 2026 jobpick. AI 분석 결과는 참고용이며 채용 결과를 보장하지 않습니다.</p>
          </div>
          <div className="flex gap-2">
            {sns.map(([n, u]) => <a key={n} href={u} target="_blank" rel="noreferrer" className="border border-ink px-3 py-1.5 font-semibold text-ink hover:bg-ink hover:text-paper">{n}</a>)}
          </div>
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
      className={`fixed bottom-6 right-6 z-30 grid h-12 w-12 place-items-center rounded-full border border-ink bg-paper text-ink shadow-[0_6px_20px_rgba(0,0,0,.12)] transition hover:bg-pick ${show ? 'opacity-100' : 'pointer-events-none translate-y-4 opacity-0'}`}>
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 19V5M6 11l6-6 6 6" /></svg>
    </button>
  )
}

export default function Layout() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <ToTop />
    </div>
  )
}
