import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useApp } from '../state'
import { Btn, Check, Logo } from '../components/ui'

const RULES = [
  ['8자 이상', (p) => p.length >= 8],
  ['대문자', (p) => /[A-Z]/.test(p)],
  ['소문자', (p) => /[a-z]/.test(p)],
  ['숫자', (p) => /\d/.test(p)],
  ['특수문자', (p) => /[^A-Za-z0-9]/.test(p)],
]
const SOCIAL = [['Google', 'border border-ink bg-white'], ['Naver', 'bg-[#03c75a] text-white'], ['Kakao', 'bg-[#fee500]']]

export function Login() {
  const { login, role, isAdmin } = useApp()
  const nav = useNavigate()
  const from = useLocation().state?.from || '/journey'
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [busy, setBusy] = useState('')
  const [err, setErr] = useState('')
  const ok = RULES.every(([, f]) => f(pw))
  if (role === 'USER') return <Navigate to={from} replace />
  if (isAdmin) return <Navigate to="/admin" replace />

  const enterUser = () => { login('USER'); nav(from, { replace: true }) }
  const enterTestAdmin = async () => {
    setBusy('test'); setErr('')
    try {
      const r = await api('/api/auth/test-admin', { method: 'POST' })
      login('TEST_ADMIN', r.access_token)
      nav('/admin', { replace: true })
    } catch (e) { setErr(e.message) } finally { setBusy('') }
  }

  return (
    <div className="mx-auto grid min-h-[78vh] max-w-[1280px] border-x border-ink lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-ink p-12 text-paper lg:flex">
        <Logo light />
        <div>
          <div className="eyebrow text-paper/60">Career editorial</div>
          <h2 className="display mt-4 text-6xl">공고와 나를<br />맞대어,<br /><span className="text-pick">Pick.</span></h2>
        </div>
        <ul className="space-y-2 text-sm text-paper/80">
          {['01 공고 매칭 · 합격 거리', '02 갭 로드맵', '03 리라이팅 스튜디오', '04 모의면접'].map((t) => <li key={t} className="flex items-center gap-2"><Check className="h-4 w-4 text-pick" />{t}</li>)}
        </ul>
      </div>
      <div className="flex flex-col justify-center bg-paper p-8 sm:p-14">
        <div className="eyebrow text-mute">Sign in</div>
        <h1 className="display mt-2 text-4xl">로그인</h1>

        <div className="mt-8 grid gap-2 sm:grid-cols-2">
          <Btn variant="pick" onClick={enterUser} className="border border-ink">일반 사용자 체험하기</Btn>
          <Btn variant="line" onClick={enterTestAdmin} disabled={busy === 'test'}>{busy === 'test' ? '서버 연결 중…' : '테스트 관리자 (읽기 전용)'}</Btn>
        </div>
        {err && <p className="mt-2 text-xs text-alert">{err}</p>}

        <div className="my-6 flex items-center gap-3 text-[11px] text-mute"><span className="h-px flex-1 bg-line" />또는 이메일<span className="h-px flex-1 bg-line" /></div>
        <label className="eyebrow text-[10px]" htmlFor="email">Email</label>
        <input id="email" value={email} onChange={(e) => setEmail(e.target.value)} type="email" className="mb-4 mt-1 border-b border-ink bg-transparent py-2 outline-none focus:border-b-2" />
        <label className="eyebrow text-[10px]" htmlFor="pw">Password</label>
        <input id="pw" value={pw} onChange={(e) => setPw(e.target.value)} type="password" className="mt-1 border-b border-ink bg-transparent py-2 outline-none focus:border-b-2" />
        <ul className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px]">
          {RULES.map(([l, f]) => <li key={l} className={f(pw) ? 'font-semibold text-ink' : 'text-mute'}>{f(pw) ? '●' : '○'} {l}</li>)}
        </ul>
        <Btn disabled={!ok || !email} onClick={enterUser} className="mt-6 w-full">로그인</Btn>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {SOCIAL.map(([n, c]) => <button key={n} onClick={enterUser} className={`py-3 text-xs font-bold ${c}`}>{n}</button>)}
        </div>
        <p className="mt-6 text-[11px] text-mute">데모 환경에서 일반 사용자는 Mock 인증, 테스트 관리자는 서버에서 읽기 전용 토큰을 발급받습니다.</p>
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
    <div className="grid min-h-[78vh] place-items-center bg-ink px-4 py-16">
      <form onSubmit={submit} className="w-full max-w-md border border-paper/20 p-10 text-paper">
        <Logo light small />
        <div className="eyebrow mt-10 text-pick">Restricted · Admin only</div>
        <h1 className="display mt-2 text-4xl">관리자 로그인</h1>
        <p className="mt-3 text-sm text-paper/60">서버 환경 변수 <code className="text-pick">ADMIN_ACCESS_KEY</code>와 일치하는 관리자 키로만 진입합니다. 모든 데이터의 생성·수정·삭제 권한이 부여됩니다.</p>
        <label className="eyebrow mt-8 block text-[10px] text-paper/60" htmlFor="key">Admin access key</label>
        <input id="key" type="password" autoComplete="off" value={key} onChange={(e) => setKey(e.target.value)} required className="mt-1 w-full border-b border-paper/40 bg-transparent py-3 font-mono outline-none focus:border-pick" />
        {err && <p className="mt-3 text-xs text-alert">{err}</p>}
        <Btn variant="pick" disabled={busy || !key} className="mt-8 w-full">{busy ? '확인 중… (서버가 깨어나는 데 최대 1분)' : '관리자 진입'}</Btn>
        <p className="mt-6 text-[11px] text-paper/40">{5}회 실패 시 일정 시간 잠깁니다. 테스트 관리자는 <Link to="/login" className="underline">일반 로그인</Link>에서 진입하세요.</p>
      </form>
    </div>
  )
}
