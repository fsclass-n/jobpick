import { useState } from 'react'
import { cx, scoreTone } from '../lib/format'
import { PASSWORD_RULES } from '../lib/password'

/** 로그인/회원가입 공통 Split 레이아웃 (좌측: 브랜드 그래픽, 우측: 폼) */
export default function AuthSplit({ title, subtitle, children }) {
  return (
    <section className="container-page py-10 md:py-16">
      <div className="card grid overflow-hidden lg:grid-cols-2">
        <BrandPanel />
        <div className="flex flex-col justify-center px-6 py-10 sm:px-12 lg:px-16">
          <h1 className="text-2xl font-bold md:text-3xl">{title}</h1>
          {subtitle && <p className="mt-2 text-sm text-ink-500">{subtitle}</p>}
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </section>
  )
}

function BrandPanel() {
  const bars = [
    { label: '핵심 키워드', v: 86 },
    { label: '자격요건', v: 74 },
    { label: '문장 완성도', v: 58 },
  ]
  return (
    <div className="relative hidden overflow-hidden bg-ink-950 p-12 text-white lg:flex lg:flex-col lg:justify-between">
      <div className="bg-grid absolute inset-0 opacity-60" aria-hidden="true" />
      <div className="absolute -top-24 -left-24 h-80 w-80 rounded-full bg-pick-500/40 blur-[90px]" aria-hidden="true" />
      <div className="absolute -right-20 -bottom-24 h-72 w-72 rounded-full bg-match-500/30 blur-[90px]" aria-hidden="true" />
      <div className="relative">
        <p className="text-sm font-semibold text-pick-200">AI CAREER CONSULTING</p>
        <h2 className="mt-3 text-3xl leading-tight font-bold">
          수집은 RPA가,
          <br />
          분석은 AI가,
          <br />
          <span className="text-gradient">합격은 당신이.</span>
        </h2>
      </div>
      <div className="relative mx-auto my-10 w-full max-w-sm">
        <div className="absolute -top-16 -left-2 z-10 w-44 rotate-[-6deg] animate-float rounded-2xl border border-white/15 bg-ink-800/80 p-4 shadow-lift backdrop-blur-md">
          <p className="text-[11px] text-white/60"><i className="fa-solid fa-robot mr-1" />오늘 수집된 공고</p>
          <p className="mt-1 font-display text-2xl font-bold">+128</p>
        </div>
        <div className="relative mt-4 ml-12 rounded-3xl bg-white p-6 text-ink-900 shadow-lift">
          <div className="flex items-center gap-4">
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-match-50 font-display text-2xl font-bold text-match-600">82</div>
            <div>
              <p className="text-xs text-ink-400">넥스트웨이브 · 백엔드 개발자</p>
              <p className="font-semibold">합격 가능성 높음</p>
            </div>
          </div>
          <div className="mt-5 space-y-3">
            {bars.map((b) => (
              <div key={b.label}>
                <div className="mb-1 flex justify-between text-xs text-ink-500"><span>{b.label}</span><span>{b.v}</span></div>
                <div className="h-1.5 rounded-full bg-ink-100"><div className={cx('h-full rounded-full', scoreTone(b.v).bg)} style={{ width: `${b.v}%` }} /></div>
              </div>
            ))}
          </div>
        </div>
        <div className="absolute -right-2 -bottom-8 rotate-[5deg] animate-float rounded-2xl bg-sun-400 px-4 py-3 text-xs font-semibold text-ink-950 shadow-lift [animation-delay:1.5s]">
          <i className="fa-solid fa-pen-nib mr-1" />문항 2에 정량 성과를 추가하세요
        </div>
      </div>
      <p className="relative text-sm text-white/50">공고 수집 → 자소서 대조 → 적합도 분석 → 수정 가이드</p>
    </div>
  )
}

export function PasswordField({ id = 'password', value, onChange, label = '비밀번호', showRules = true, autoComplete = 'current-password', placeholder = '비밀번호 입력' }) {
  const [visible, setVisible] = useState(false)
  return (
    <div>
      <label htmlFor={id} className="label">{label}</label>
      <div className="relative">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          className="input pr-12"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          placeholder={placeholder}
          required
        />
        <button type="button" onClick={() => setVisible((v) => !v)} className="absolute top-1/2 right-3 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-ink-400 hover:bg-ink-50" aria-label={visible ? '비밀번호 숨기기' : '비밀번호 보기'}>
          <i className={visible ? 'fa-regular fa-eye-slash' : 'fa-regular fa-eye'} />
        </button>
      </div>
      {showRules && (
        <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1" aria-label="비밀번호 조건">
          {PASSWORD_RULES.map((r) => {
            const ok = r.test(value)
            return (
              <li key={r.key} className={cx('flex items-center gap-1 text-xs transition', ok ? 'text-match-600' : value ? 'text-coral-500' : 'text-ink-400')}>
                <i className={cx('fa-solid text-[10px]', ok ? 'fa-circle-check' : 'fa-circle')} />
                {r.label}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export function FormError({ message }) {
  if (!message) return null
  return (
    <div className="flex items-start gap-2 rounded-xl bg-coral-50 px-4 py-3 text-sm text-coral-600" role="alert">
      <i className="fa-solid fa-circle-exclamation mt-0.5" />
      <span className="whitespace-pre-line">{message}</span>
    </div>
  )
}
