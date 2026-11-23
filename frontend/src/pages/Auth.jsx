import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { IMG } from '../data/credits'
import { useApp } from '../state'
import { Btn, Chip, Icon, Logo, LogoMark } from '../components/ui'

const RULES = [
  ['8자 이상', (p) => p.length >= 8],
  ['대문자', (p) => /[A-Z]/.test(p)],
  ['소문자', (p) => /[a-z]/.test(p)],
  ['숫자', (p) => /\d/.test(p)],
  ['특수문자', (p) => /[^A-Za-z0-9]/.test(p)],
]
const SOCIAL = [['Google', 'bg-white ring-1 ring-line'], ['Naver', 'bg-[#03c75a] text-white'], ['Kakao', 'bg-[#fee500]']]
const field = 'mt-1.5 h-12 w-full rounded-2xl bg-bg px-4 text-sm outline-none ring-1 ring-line transition focus:bg-white focus:ring-2 focus:ring-navy'

export function Login() {
  const { login, role, isAdmin } = useApp()
  const nav = useNavigate()
  const from = useLocation().state?.from || '/journey'
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const ok = RULES.every(([, f]) => f(pw))
  if (role === 'USER') return <Navigate to={from} replace />
  if (isAdmin) return <Navigate to="/admin" replace />

  const enterUser = () => { login('USER'); nav(from, { replace: true }) }
  const enterTestAdmin = async () => {
    setBusy(true); setErr('')
    try {
      const r = await api('/api/auth/test-admin', { method: 'POST' })
      login('TEST_ADMIN', r.access_token)
      nav('/admin', { replace: true })
    } catch (e) { setErr(e.message) } finally { setBusy(false) }
  }

  return (
    <div className="wrap py-8">
      <div className="grid overflow-hidden rounded-[36px] bg-white shadow-xl shadow-navy/5 ring-1 ring-line lg:grid-cols-2">
        <div className="relative hidden min-h-[640px] lg:block">
          <img src={IMG.hero} alt="사무실에서 미소 짓는 직장인" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-navy via-navy/30 to-transparent" />
          <div className="float absolute right-8 top-8 rounded-3xl bg-white p-4 shadow-xl">
            <div className="text-[11px] font-semibold text-sub">Pick Score</div>
            <div className="num text-3xl font-bold">81 <span className="text-sm text-[#0b8a68]">+43</span></div>
          </div>
          <div className="absolute bottom-10 left-10 right-10 text-white">
            <LogoMark className="h-12 w-12" />
            <h2 className="mt-5 text-4xl font-extrabold leading-tight">넥타이를 매기 전,<br />거리부터 줄이세요.</h2>
            <p className="mt-3 text-white/70">공고 매칭 · 갭 로드맵 · 리라이팅 · 모의면접</p>
          </div>
        </div>
        <div className="flex flex-col justify-center p-8 sm:p-14">
          <h1 className="text-3xl font-extrabold tracking-tight">로그인</h1>
          <p className="mt-2 text-sm text-sub">가입 없이 체험하거나, 이메일·소셜 계정으로 로그인하세요.</p>

          <button onClick={enterUser} className="mt-8 flex items-center justify-between rounded-3xl bg-navy p-5 text-left text-white transition hover:bg-suit">
            <span><span className="block text-base font-bold">샘플 데이터로 바로 체험</span><span className="text-xs text-white/60">일반 사용자 · 가입 불필요</span></span>
            <span className="grid h-10 w-10 place-items-center rounded-full bg-mint text-navy">{Icon.arrow('h-5 w-5')}</span>
          </button>

          <div className="my-7 flex items-center gap-3 text-xs text-sub"><span className="h-px flex-1 bg-line" />또는 이메일<span className="h-px flex-1 bg-line" /></div>
          <label className="text-xs font-semibold" htmlFor="email">이메일</label>
          <input id="email" value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="you@example.com" className={field} />
          <label className="mt-4 text-xs font-semibold" htmlFor="pw">비밀번호</label>
          <input id="pw" value={pw} onChange={(e) => setPw(e.target.value)} type="password" className={field} />
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {RULES.map(([l, f]) => <li key={l}><Chip tone={f(pw) ? 'mint' : 'line'}>{f(pw) ? '✓' : '·'} {l}</Chip></li>)}
          </ul>
          <Btn disabled={!ok || !email} onClick={enterUser} size="lg" className="mt-6 w-full">이메일로 로그인</Btn>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {SOCIAL.map(([n, c]) => <button key={n} onClick={enterUser} className={`h-12 rounded-2xl text-sm font-bold ${c}`}>{n}</button>)}
          </div>

          <div className="mt-8 rounded-3xl bg-bg p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs"><b className="text-sm">QA · 시연용 테스트 관리자</b><br /><span className="text-sub">관리자 화면 전체를 읽기 전용으로 둘러봅니다</span></div>
              <Btn variant="soft" size="sm" onClick={enterTestAdmin} disabled={busy}>{busy ? '서버 연결 중…' : '테스트 관리자 로그인'}</Btn>
            </div>
            {err && <p className="mt-2 text-xs text-tie">{err}</p>}
          </div>
        </div>
      </div>
    </div>
  )
}

export function AdminLogin() {
  const { login, role } = useApp()
  const nav = useNavigate()
  const [key, setKey] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  if (role === 'ADMIN') return <Navigate to="/admin" replace />
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setErr('')
    try {
      const r = await api('/api/admin/login', { method: 'POST', body: { access_key: key } })
      login('ADMIN', r.access_token)
      nav('/admin', { replace: true })
    } catch (ex) { setErr(ex.message) } finally { setBusy(false) }
  }
  return (
    <div className="wrap py-8">
      <div className="relative grid min-h-[600px] place-items-center overflow-hidden rounded-[36px] bg-navy px-4 py-16">
        <div className="blob -left-20 -top-20 h-80 w-80 bg-suit" />
        <div className="blob -bottom-20 -right-10 h-80 w-80 bg-tie/40" />
        <form onSubmit={submit} className="relative w-full max-w-md rounded-[32px] bg-white/5 p-10 text-white ring-1 ring-white/10 backdrop-blur">
          <Logo light />
          <Chip tone="tie" className="mt-8">관리자 전용</Chip>
          <h1 className="mt-3 text-3xl font-extrabold">관리자 로그인</h1>
          <p className="mt-2 text-sm text-white/60">서버 환경 변수 <code className="text-mint">ADMIN_ACCESS_KEY</code>와 일치하는 키로만 진입합니다. 모든 데이터의 생성·수정·삭제 권한이 부여됩니다.</p>
          <label className="mt-8 block text-xs font-semibold text-white/70" htmlFor="key">관리자 키</label>
          <input id="key" type="password" autoComplete="off" value={key} onChange={(e) => setKey(e.target.value)} required className="mt-1.5 h-12 w-full rounded-2xl bg-white/10 px-4 font-mono text-sm outline-none ring-1 ring-white/15 focus:ring-2 focus:ring-mint" />
          {err && <p className="mt-3 text-xs text-tie">{err}</p>}
          <Btn variant="mint" size="lg" disabled={busy || !key} className="mt-6 w-full">{busy ? '확인 중… (서버 기동 최대 1분)' : '관리자 진입'}</Btn>
          <p className="mt-6 text-[11px] text-white/40">5회 실패 시 15분간 잠깁니다. 테스트 관리자는 <Link to="/login" className="underline">로그인 화면</Link>에서 진입하세요.</p>
        </form>
      </div>
    </div>
  )
}
