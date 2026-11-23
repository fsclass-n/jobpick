import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { api, USE_MOCK } from '../api'
import AuthSplit, { FormError, PasswordField } from '../components/AuthSplit'
import { Button } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { cx } from '../lib/format'
import { isValidEmail, isValidPassword, PASSWORD_RULE_MESSAGE } from '../lib/password'

const SOCIAL = [
  { id: 'google', label: 'Google', icon: <i className="fa-brands fa-google" /> },
  { id: 'naver', label: 'Naver', icon: <span className="font-display text-sm leading-none font-black">N</span> },
  { id: 'kakao', label: 'Kakao', icon: <i className="fa-solid fa-comment" /> },
]
const TEST_STYLE = {
  user: { icon: 'fa-solid fa-user', desc: '서비스 이용 권한', cls: 'hover:border-pick-300 hover:bg-pick-50' },
  sandbox: { icon: 'fa-solid fa-flask', desc: '샌드박스 관리자 콘솔', cls: 'hover:border-sun-400 hover:bg-sun-50' },
}

export const afterLoginPath = (session, next) => next || (session === 'sandbox' ? '/sandbox/admin' : '/dashboard')

export default function Login() {
  const { userSession, login, applyUser } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const next = params.get('next')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(null)
  const [testAccounts, setTestAccounts] = useState([])

  useEffect(() => {
    api.auth.testAccounts().then((r) => setTestAccounts(r.enabled ? r.accounts : [])).catch(() => setTestAccounts([]))
    const hash = new URLSearchParams(window.location.hash.slice(1))
    if (hash.get('error')) {
      setError(hash.get('error'))
      window.history.replaceState(null, '', window.location.pathname + window.location.search)
    }
  }, [])

  if (userSession) return <Navigate to={afterLoginPath(userSession.session, next)} replace />

  const submit = async (e, creds) => {
    e?.preventDefault()
    const em = creds?.email ?? email
    const pw = creds?.password ?? password
    setError('')
    if (!isValidEmail(em)) return setError('올바른 이메일 주소를 입력해 주세요.')
    if (!isValidPassword(pw)) return setError(PASSWORD_RULE_MESSAGE)
    setLoading(creds?.type || 'form')
    try {
      const session = await login(em, pw)
      toast.success(`${session.user.name}님, 환영합니다!`)
      navigate(afterLoginPath(session.session, next), { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(null)
    }
  }

  // 테스트 계정 버튼: 입력란에 자동 입력되는 모션을 보여 준 뒤 로그인
  const quickLogin = async (account) => {
    setLoading(account.type)
    for (let i = 1; i <= account.email.length; i += 3) {
      setEmail(account.email.slice(0, i))
      await new Promise((r) => setTimeout(r, 12))
    }
    setEmail(account.email)
    setPassword(account.password)
    await new Promise((r) => setTimeout(r, 150))
    submit(null, account)
  }

  const social = async (provider) => {
    setLoading(provider)
    try {
      const result = await api.auth.oauthStart(provider)
      if (result?.access_token) {
        const session = applyUser(result)
        toast.info('데모 환경에서는 소셜 로그인을 모의로 처리합니다.')
        navigate(afterLoginPath(session.session, next), { replace: true })
      }
    } catch (err) {
      setError(err.message)
      setLoading(null)
    }
  }

  return (
    <AuthSplit title="로그인" subtitle="jobpick 계정으로 로그인하고 맞춤 분석을 이어가세요.">
      {testAccounts.length > 0 && (
        <div className="mb-6">
          <p className="mb-2 text-xs font-semibold text-ink-400">테스트 계정 간편 로그인</p>
          <div className="grid grid-cols-2 gap-2">
            {testAccounts.map((a) => (
              <button
                key={a.type}
                onClick={() => quickLogin(a)}
                disabled={!!loading}
                className={cx('flex items-center gap-3 rounded-xl border border-ink-200 px-3 py-3 text-left transition disabled:opacity-60', TEST_STYLE[a.type]?.cls)}
              >
                <span className={cx('grid h-9 w-9 shrink-0 place-items-center rounded-lg', a.type === 'sandbox' ? 'bg-sun-50 text-sun-500' : 'bg-pick-50 text-pick-500')}>
                  <i className={loading === a.type ? 'fa-solid fa-circle-notch fa-spin' : TEST_STYLE[a.type]?.icon} />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">{a.label}</span>
                  <span className="block truncate text-[11px] text-ink-400">{TEST_STYLE[a.type]?.desc}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={submit} className="space-y-4" noValidate>
        <div>
          <label htmlFor="email" className="label">이메일</label>
          <input id="email" type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="you@example.com" required />
        </div>
        <PasswordField value={password} onChange={setPassword} />
        <FormError message={error} />
        <Button type="submit" className="w-full" size="lg" loading={loading === 'form'} disabled={!!loading}>
          로그인
        </Button>
      </form>

      <div className="my-6 flex items-center gap-3 text-xs text-ink-300">
        <span className="h-px flex-1 bg-ink-100" />
        또는 소셜 계정으로 로그인
        <span className="h-px flex-1 bg-ink-100" />
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        {SOCIAL.map((s) => (
          <button
            key={s.id}
            onClick={() => social(s.id)}
            disabled={!!loading}
            className="flex h-11 items-center justify-center gap-2 rounded-lg border border-ink-200 bg-white text-sm font-semibold text-ink-700 transition hover:border-ink-900 hover:bg-ink-900 hover:text-white disabled:opacity-60"
          >
            {loading === s.id ? <i className="fa-solid fa-circle-notch fa-spin" /> : s.icon}
            {s.label}
          </button>
        ))}
      </div>

      <p className="mt-8 text-center text-sm text-ink-500">
        아직 계정이 없으신가요?{' '}
        <Link to={`/signup${next ? `?next=${encodeURIComponent(next)}` : ''}`} className="font-semibold text-pick-600 hover:underline">회원가입</Link>
      </p>
      {USE_MOCK && <p className="mt-3 text-center text-xs text-ink-400">데모 환경: 로그인 정보는 이 브라우저에만 저장됩니다.</p>}
    </AuthSplit>
  )
}
