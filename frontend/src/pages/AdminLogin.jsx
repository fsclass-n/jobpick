import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { api, USE_MOCK } from '../api'
import { MOCK_ACCOUNTS } from '../api/mock'
import { FormError, PasswordField } from '../components/AuthSplit'
import { Button } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { isValidEmail, isValidPassword, PASSWORD_RULE_MESSAGE } from '../lib/password'

/** 정식 관리자 전용 로그인 (/admin/login) - GNB/일반 로그인 페이지에 링크를 노출하지 않음 */
export default function AdminLogin() {
  const { adminSession, loginAdmin } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [config, setConfig] = useState(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [otp, setOtp] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    api.adminAuth.config().then(setConfig).catch(() => setConfig({ enabled: false }))
  }, [])

  if (adminSession) return <Navigate to={params.get('next') || '/admin'} replace />

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (!isValidEmail(email)) return setError('올바른 이메일 주소를 입력해 주세요.')
    if (!isValidPassword(password)) return setError(PASSWORD_RULE_MESSAGE)
    if (config?.otp_required && !/^\d{6}$/.test(otp)) return setError('6자리 2단계 인증 코드를 입력해 주세요.')
    setLoading(true)
    try {
      await loginAdmin(email, password, otp)
      toast.success('정식 관리자 콘솔에 접속했습니다.')
      navigate(params.get('next') || '/admin', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="relative overflow-hidden bg-ink-950 py-16 text-white md:py-24">
      <div className="bg-grid absolute inset-0 opacity-50" aria-hidden="true" />
      <div className="absolute top-0 right-0 h-96 w-96 rounded-full bg-match-500/10 blur-[120px]" aria-hidden="true" />
      <div className="container-page relative grid items-center gap-12 lg:grid-cols-2">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold tracking-wider">
            <i className="fa-solid fa-shield-halved text-match-400" /> ADMINISTRATOR ONLY
          </span>
          <h1 className="mt-5 text-3xl font-bold md:text-4xl">정식 관리자 콘솔</h1>
          <p className="mt-4 max-w-md leading-relaxed text-white/60">
            실서비스 운영 데이터에 접근하는 최고 관리 권한 전용 경로입니다. 테스트 관리자 계정과 세션, 권한 범위가 완전히 분리되어 있습니다.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-white/70">
            <li><i className="fa-solid fa-key mr-2 w-4 text-pick-300" />관리자 전용 서명키로 발급된 별도 토큰 사용</li>
            <li><i className="fa-solid fa-hourglass-half mr-2 w-4 text-pick-300" />세션 유지 {config?.session_minutes ?? 30}분 · 탭을 닫으면 자동 만료</li>
            <li><i className="fa-solid fa-lock mr-2 w-4 text-pick-300" />로그인 5회 실패 시 일정 시간 잠금</li>
            <li><i className="fa-solid fa-clipboard-list mr-2 w-4 text-pick-300" />모든 접속 및 변경 작업은 접속 로그로 기록</li>
          </ul>
        </div>
        <div className="rounded-3xl border border-white/10 bg-ink-900/80 p-6 shadow-lift backdrop-blur sm:p-10">
          {USE_MOCK && (
            <div className="mb-6 rounded-xl border border-sun-400/30 bg-sun-400/10 px-4 py-3 text-xs leading-relaxed text-sun-400">
              <i className="fa-solid fa-circle-info mr-1" /> 데모 환경에서는 Mock 인증으로 화면 흐름만 확인할 수 있습니다.
              <br />
              데모 계정: {MOCK_ACCOUNTS.admin.email} / {MOCK_ACCOUNTS.admin.password}
            </div>
          )}
          {config && !config.enabled ? (
            <FormError message="정식 관리자 로그인이 아직 설정되지 않았습니다. 서버 환경 변수(ADMIN_JWT_SECRET)를 확인해 주세요." />
          ) : (
            <form onSubmit={submit} className="space-y-4 [&_.input]:border-white/10 [&_.input]:bg-white/5 [&_.input]:text-white [&_.label]:text-white/80" noValidate>
              <div>
                <label htmlFor="admin-email" className="label">관리자 이메일</label>
                <input id="admin-email" type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" required />
              </div>
              <PasswordField id="admin-password" value={password} onChange={setPassword} showRules={false} />
              {config?.otp_required && (
                <div>
                  <label htmlFor="otp" className="label">2단계 인증 코드</label>
                  <input id="otp" inputMode="numeric" maxLength={6} className="input tracking-[0.5em]" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} autoComplete="one-time-code" placeholder="000000" />
                </div>
              )}
              <FormError message={error} />
              <Button type="submit" variant="match" size="lg" className="w-full text-ink-950" loading={loading} icon="fa-solid fa-right-to-bracket">
                관리자 로그인
              </Button>
            </form>
          )}
        </div>
      </div>
    </section>
  )
}
