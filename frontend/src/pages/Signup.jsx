import { useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import AuthSplit, { FormError, PasswordField } from '../components/AuthSplit'
import { Button } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { isValidEmail, isValidPassword, PASSWORD_RULE_MESSAGE } from '../lib/password'

const JOBS = ['백엔드', '프론트엔드', '데이터', 'AI', '기획', '마케팅', '디자인', '경영지원', '영업', '기타']

export default function Signup() {
  const { userSession, signup } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '', desired_job: '', agree: false })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  if (userSession) return <Navigate to="/dashboard" replace />
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }))

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.name.trim()) return setError('이름을 입력해 주세요.')
    if (!isValidEmail(form.email)) return setError('올바른 이메일 주소를 입력해 주세요.')
    if (!isValidPassword(form.password)) return setError(PASSWORD_RULE_MESSAGE)
    if (form.password !== form.confirm) return setError('비밀번호 확인이 일치하지 않습니다.')
    if (!form.agree) return setError('이용약관 및 개인정보 수집·이용에 동의해 주세요.')
    setLoading(true)
    try {
      await signup({ name: form.name.trim(), email: form.email, password: form.password, desired_job: form.desired_job || null })
      toast.success('가입을 환영합니다! 첫 자소서를 등록해 보세요.')
      navigate(params.get('next') || '/resumes/new', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthSplit title="회원가입" subtitle="1분이면 충분합니다. 가입 후 바로 자소서 분석을 시작할 수 있어요.">
      <form onSubmit={submit} className="space-y-4" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="name" className="label">이름</label>
            <input id="name" className="input" value={form.name} onChange={(e) => set('name')(e.target.value)} autoComplete="name" placeholder="홍길동" required />
          </div>
          <div>
            <label htmlFor="desired_job" className="label">희망 직무 <span className="font-normal text-ink-400">(선택)</span></label>
            <select id="desired_job" className="input" value={form.desired_job} onChange={(e) => set('desired_job')(e.target.value)}>
              <option value="">선택 안 함</option>
              {JOBS.map((j) => <option key={j}>{j}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label htmlFor="email" className="label">이메일</label>
          <input id="email" type="email" className="input" value={form.email} onChange={(e) => set('email')(e.target.value)} autoComplete="email" placeholder="you@example.com" required />
        </div>
        <PasswordField value={form.password} onChange={set('password')} autoComplete="new-password" placeholder="영문 대소문자·숫자·특수문자 8자 이상" />
        <div>
          <PasswordField id="confirm" label="비밀번호 확인" value={form.confirm} onChange={set('confirm')} showRules={false} autoComplete="new-password" placeholder="비밀번호 다시 입력" />
          {form.confirm && (
            <p className={`mt-1.5 text-xs ${form.confirm === form.password ? 'text-match-600' : 'text-coral-500'}`}>
              {form.confirm === form.password ? '비밀번호가 일치합니다.' : '비밀번호가 일치하지 않습니다.'}
            </p>
          )}
        </div>
        <label className="flex items-start gap-2.5 text-sm text-ink-600">
          <input type="checkbox" checked={form.agree} onChange={(e) => set('agree')(e.target.checked)} className="mt-0.5 h-4 w-4 accent-pick-500" />
          <span>
            <Link to="/terms" className="font-semibold underline" target="_blank">이용약관</Link> 및{' '}
            <Link to="/privacy" className="font-semibold underline" target="_blank">개인정보 수집·이용</Link>에 동의합니다. (필수)
          </span>
        </label>
        <FormError message={error} />
        <Button type="submit" size="lg" className="w-full" loading={loading}>가입하고 시작하기</Button>
      </form>
      <p className="mt-8 text-center text-sm text-ink-500">
        이미 계정이 있으신가요? <Link to="/login" className="font-semibold text-pick-600 hover:underline">로그인</Link>
      </p>
    </AuthSplit>
  )
}
