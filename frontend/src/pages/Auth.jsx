import { useEffect, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { IMG } from '../data/credits'
import { useApp } from '../state'
import { Btn, Chip, Icon, LogoMark } from '../components/ui'

const RULES = [
  ['8자 이상', (p) => p.length >= 8],
  ['대문자', (p) => /[A-Z]/.test(p)],
  ['소문자', (p) => /[a-z]/.test(p)],
  ['숫자', (p) => /\d/.test(p)],
  ['특수문자', (p) => /[^A-Za-z0-9]/.test(p)],
]
const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')
const SOCIAL = [
  { id: 'google', label: 'Google', icon: <span className="text-[15px] font-black leading-none text-[#4285F4]">G</span> },
  { id: 'naver', label: 'Naver', icon: <span className="grid h-4 w-4 place-items-center rounded-[4px] bg-[#03c75a] text-[10px] font-black leading-none text-white">N</span> },
  { id: 'kakao', label: 'Kakao', icon: <span className="grid h-4 w-4 place-items-center rounded-[4px] bg-[#fee500] text-[#3c1e1e]"><svg viewBox="0 0 24 24" className="h-2.5 w-2.5" fill="currentColor" aria-hidden><path d="M12 4C6.9 4 3 6.9 3 10.5c0 2.3 1.5 4.3 3.8 5.5l-1 3.4c-.1.3.3.6.5.4l4-2.6c.6.1 1.1.1 1.7.1 5.1 0 9-2.9 9-6.4S17.1 4 12 4Z" /></svg></span> },
]
const field = 'mt-1.5 h-12 w-full rounded-2xl bg-bg px-4 text-sm outline-none ring-1 ring-line transition focus:bg-white focus:ring-2 focus:ring-navy'

export function Login() {
  const { login, role, isAdmin } = useApp()
  const nav = useNavigate()
  const from = useLocation().state?.from || '/journey'
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [oauthErr, setOauthErr] = useState('')

  // 소셜 로그인 완료 후 /login#token=... 형태로 돌아오는 콜백 처리
  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1))
    const token = hash.get('token')
    const error = hash.get('error')
    if (!token && !error) return
    window.history.replaceState(null, '', window.location.pathname + window.location.search)
    if (token) {
      login('USER', token, { name: hash.get('name') || '', provider: hash.get('provider') || '' })
      nav(from, { replace: true })
    } else {
      setOauthErr(error)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (role === 'USER') return <Navigate to={from} replace />
  if (isAdmin) return <Navigate to="/admin" replace />

  const enterUser = () => { login('USER'); nav(from, { replace: true }) }
  const enterEmail = async () => {
    if (!API_BASE) { enterUser(); return }
    setBusy(true); setErr('')
    try {
      const r = await api('/api/auth/login', { method: 'POST', body: { email, password: pw } })
      login(r.role, r.access_token)
      nav(r.role === 'USER' ? from : '/admin', { replace: true })
    } catch (e) { setErr(e.message) } finally { setBusy(false) }
  }
  const social = (id) => {
    if (!API_BASE) { enterUser(); return }
    window.location.href = `${API_BASE}/api/auth/oauth/${id}/login`
  }
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
          <form onSubmit={(e) => { e.preventDefault(); enterEmail() }}>
            <label className="text-xs font-semibold" htmlFor="email">이메일</label>
            <input id="email" value={email} onChange={(e) => setEmail(e.target.value)} type="email" required autoComplete="username" placeholder="you@example.com" className={field} />
            <label className="mt-4 block text-xs font-semibold" htmlFor="pw">비밀번호</label>
            <input id="pw" value={pw} onChange={(e) => setPw(e.target.value)} type="password" required autoComplete="current-password" className={field} />
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {RULES.map(([l, f]) => <li key={l}><Chip tone={f(pw) ? 'mint' : 'line'}>{f(pw) ? '✓' : '·'} {l}</Chip></li>)}
            </ul>
            <Btn type="submit" disabled={!email || !pw || busy} size="lg" className="mt-6 w-full">{busy ? '확인 중…' : '이메일로 로그인'}</Btn>
          </form>
          {err && <p className="mt-2 text-xs text-tie">{err}</p>}
          <p className="mt-3 text-[11px] leading-relaxed text-sub">처음 사용하는 이메일은 자동으로 가입됩니다. 관리자 계정 이메일로 로그인하면 관리자 콘솔로 이동합니다.</p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {SOCIAL.map((s) => (
              <button
                key={s.id}
                onClick={() => social(s.id)}
                className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-white text-sm font-bold text-navy ring-1 ring-line transition hover:bg-navy hover:text-white hover:ring-navy"
              >
                {s.icon}
                {s.label}
              </button>
            ))}
          </div>
          {oauthErr && <p className="mt-2 text-xs text-tie">{oauthErr}</p>}

          <div className="mt-8 rounded-3xl bg-bg p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs"><b className="text-sm">QA · 시연용 테스트 관리자</b><br /><span className="text-sub">관리자 화면 전체를 읽기 전용으로 둘러봅니다</span></div>
              <Btn variant="soft" size="sm" onClick={enterTestAdmin} disabled={busy}>{busy ? '서버 연결 중…' : '테스트 관리자 로그인'}</Btn>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
