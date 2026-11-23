import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useApp } from '../state'
import { Check, Logo } from '../components/ui'

const RULES = [
  ['8자 이상', (p) => p.length >= 8],
  ['영문 대문자', (p) => /[A-Z]/.test(p)],
  ['영문 소문자', (p) => /[a-z]/.test(p)],
  ['숫자', (p) => /\d/.test(p)],
  ['특수문자', (p) => /[^A-Za-z0-9]/.test(p)],
]
const SOCIAL = [['Google', 'bg-white text-slate-700 border'], ['Naver', 'bg-[#03c75a] text-white'], ['Kakao', 'bg-[#fee500] text-slate-900']]

export function Login() {
  const { login, role } = useApp()
  const nav = useNavigate()
  const from = useLocation().state?.from || '/journey'
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const ok = RULES.every(([, f]) => f(pw))
  if (role === 'USER') return <Navigate to={from} replace />
  const enter = () => { login('USER'); nav(from, { replace: true }) }
  return (
    <div className="mx-auto grid min-h-[70vh] max-w-6xl lg:grid-cols-2">
      <div className="hidden flex-col justify-center bg-gradient-to-br from-brand to-indigo-900 p-12 text-white lg:flex">
        <Logo light />
        <h2 className="font-display mt-8 text-3xl font-extrabold leading-snug">공고와 나를 맞대어,<br />딱 맞는 기회를 Pick</h2>
        <ul className="mt-6 space-y-2 text-indigo-100">
          {['공고 매칭 · 합격 거리', '갭 로드맵', '자소서 리라이팅', '모의면접'].map((t) => <li key={t} className="flex items-center gap-2"><Check className="h-4 w-4" />{t}</li>)}
        </ul>
      </div>
      <div className="flex flex-col justify-center p-8 sm:p-12">
        <h1 className="font-display text-2xl font-extrabold">로그인</h1>
        <button onClick={enter} className="mt-6 rounded-xl bg-emerald-500 py-3 font-medium text-white hover:bg-emerald-600">샘플 데이터로 체험하기 (가입 불필요)</button>
        <div className="my-5 text-center text-xs text-slate-400">또는 이메일로 로그인</div>
        <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="이메일" className="mb-3 rounded-xl border px-4 py-3" />
        <input value={pw} onChange={(e) => setPw(e.target.value)} type="password" placeholder="비밀번호" className="rounded-xl border px-4 py-3" />
        <ul className="mt-2 flex flex-wrap gap-2 text-xs">
          {RULES.map(([l, f]) => <li key={l} className={f(pw) ? 'text-emerald-600' : 'text-slate-400'}>{f(pw) ? '✓' : '○'} {l}</li>)}
        </ul>
        <button disabled={!ok || !email} onClick={enter} className="mt-4 rounded-xl bg-brand py-3 font-medium text-white enabled:hover:bg-indigo-700 disabled:opacity-40">로그인</button>
        <div className="mt-5 grid grid-cols-3 gap-2">
          {SOCIAL.map(([n, c]) => <button key={n} onClick={enter} className={`rounded-xl py-2.5 text-sm font-medium ${c}`}>{n}</button>)}
        </div>
        <p className="mt-4 text-xs text-slate-400">데모 환경에서는 입력값과 관계없이 Mock 인증으로 동작합니다.</p>
      </div>
    </div>
  )
}

export function AdminLogin() {
  const { login, role } = useApp()
  const nav = useNavigate()
  const [step, setStep] = useState(1)
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [code, setCode] = useState('')
  if (role === 'ADMIN') return <Navigate to="/admin" replace />
  return (
    <div className="grid min-h-[70vh] place-items-center bg-slate-950 px-4 py-16">
      <div className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 p-8 text-slate-100">
        <div className="mb-1 text-xs font-bold tracking-widest text-rose-400">ADMIN ONLY</div>
        <h1 className="font-display text-2xl font-extrabold">관리자 로그인</h1>
        {step === 1 ? (
          <form className="mt-6 space-y-3" onSubmit={(e) => { e.preventDefault(); setStep(2) }}>
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required placeholder="관리자 이메일" className="w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-3" />
            <input value={pw} onChange={(e) => setPw(e.target.value)} type="password" required placeholder="비밀번호" className="w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-3" />
            <button className="w-full rounded-lg bg-rose-600 py-3 font-medium hover:bg-rose-700">다음 (TOTP)</button>
          </form>
        ) : (
          <form className="mt-6 space-y-3" onSubmit={(e) => { e.preventDefault(); login('ADMIN'); nav('/admin', { replace: true }) }}>
            <p className="text-sm text-slate-400">인증 앱의 6자리 코드를 입력하세요.</p>
            <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" placeholder="000000" className="w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-3 text-center text-2xl tracking-[0.5em]" />
            <button disabled={code.length !== 6} className="w-full rounded-lg bg-rose-600 py-3 font-medium enabled:hover:bg-rose-700 disabled:opacity-40">로그인</button>
          </form>
        )}
        <p className="mt-5 text-xs text-slate-500">데모 환경: Mock 인증입니다. 실제 관리자 인증은 백엔드 연동 후 활성화됩니다.</p>
      </div>
    </div>
  )
}
