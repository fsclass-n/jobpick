import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { cx, ROLE_LABEL } from '../../lib/format'

const VARIANTS = {
  primary: 'bg-pick-500 text-white shadow-glow hover:bg-pick-600 active:bg-pick-700',
  dark: 'bg-ink-900 text-white hover:bg-ink-800',
  secondary: 'border border-ink-200 bg-white text-ink-800 hover:border-pick-300 hover:text-pick-600',
  ghost: 'text-ink-600 hover:bg-ink-100 hover:text-ink-900',
  danger: 'bg-coral-500 text-white hover:bg-coral-600',
  match: 'bg-match-500 text-white hover:bg-match-600',
}
const SIZES = {
  sm: 'h-9 px-3.5 text-sm gap-1.5',
  md: 'h-11 px-5 text-sm gap-2',
  lg: 'h-13 px-7 text-base gap-2.5',
}

export function Button({ to, href, variant = 'primary', size = 'md', loading, icon, className, children, disabled, ...props }) {
  const cls = cx(
    'inline-flex shrink-0 items-center justify-center rounded-xl font-semibold transition duration-200 disabled:cursor-not-allowed disabled:opacity-50',
    VARIANTS[variant],
    SIZES[size],
    className,
  )
  const content = (
    <>
      {loading ? <i className="fa-solid fa-circle-notch fa-spin" /> : icon && <i className={icon} />}
      {children}
    </>
  )
  if (to) return <Link to={to} className={cls} {...props}>{content}</Link>
  if (href) return <a href={href} className={cls} {...props}>{content}</a>
  return (
    <button className={cls} disabled={disabled || loading} {...props}>
      {content}
    </button>
  )
}

const BADGE_TONES = {
  gray: 'bg-ink-100 text-ink-600',
  pick: 'bg-pick-50 text-pick-600',
  match: 'bg-match-50 text-match-600',
  coral: 'bg-coral-50 text-coral-600',
  sun: 'bg-sun-50 text-sun-500',
  dark: 'bg-ink-900 text-white',
}

export function Badge({ tone = 'gray', icon, className, children }) {
  return (
    <span className={cx('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold', BADGE_TONES[tone], className)}>
      {icon && <i className={icon} />}
      {children}
    </span>
  )
}

export function RoleBadge({ role, className }) {
  const tone = { USER: 'gray', TEST_ADMIN: 'sun', ADMIN: 'dark' }[role] || 'gray'
  const icon = { USER: 'fa-solid fa-user', TEST_ADMIN: 'fa-solid fa-flask', ADMIN: 'fa-solid fa-shield-halved' }[role]
  return <Badge tone={tone} icon={icon} className={className}>{ROLE_LABEL[role] || role}</Badge>
}

export function Spinner({ label = '불러오는 중...', className }) {
  return (
    <div className={cx('flex flex-col items-center justify-center gap-3 py-16 text-ink-400', className)} role="status">
      <i className="fa-solid fa-circle-notch fa-spin text-2xl text-pick-500" />
      <span className="text-sm">{label}</span>
    </div>
  )
}

export function EmptyState({ icon = 'fa-regular fa-folder-open', title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-ink-200 bg-white/60 px-6 py-14 text-center">
      <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-pick-50 text-xl text-pick-500">
        <i className={icon} />
      </div>
      <p className="font-display text-lg font-semibold text-ink-900">{title}</p>
      {description && <p className="mt-1.5 max-w-sm text-sm text-ink-500">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function PageHeader({ eyebrow, title, description, actions, icon }) {
  return (
    <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        {eyebrow && (
          <p className="mb-2 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-pick-500">
            {icon && <i className={icon} />}
            {eyebrow}
          </p>
        )}
        <h1 className="text-2xl font-bold text-ink-900 md:text-3xl">{title}</h1>
        {description && <p className="mt-2 text-sm text-ink-500 md:text-base">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

export function Modal({ open, onClose, title, children, footer, size = 'md' }) {
  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-ink-950/50 backdrop-blur-sm" onClick={onClose} />
      <div className={cx('relative max-h-[90vh] w-full animate-fade-up overflow-y-auto rounded-t-3xl bg-white shadow-lift sm:rounded-3xl', size === 'lg' ? 'sm:max-w-3xl' : 'sm:max-w-lg')}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-ink-100 bg-white px-6 py-4">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-lg text-ink-400 hover:bg-ink-100" aria-label="닫기">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-ink-100 px-6 py-4">{footer}</div>}
      </div>
    </div>
  )
}

export function Pagination({ page, total, size, onChange }) {
  const pages = Math.max(1, Math.ceil(total / size))
  if (pages <= 1) return null
  const nums = Array.from({ length: pages }, (_, i) => i + 1).filter((n) => Math.abs(n - page) <= 2 || n === 1 || n === pages)
  return (
    <nav className="mt-8 flex items-center justify-center gap-1" aria-label="페이지 이동">
      <button disabled={page === 1} onClick={() => onChange(page - 1)} className="grid h-9 w-9 place-items-center rounded-lg text-ink-500 hover:bg-white disabled:opacity-30" aria-label="이전 페이지">
        <i className="fa-solid fa-chevron-left text-xs" />
      </button>
      {nums.map((n, i) => (
        <span key={n} className="flex items-center">
          {i > 0 && nums[i - 1] !== n - 1 && <span className="px-1 text-ink-300">…</span>}
          <button
            onClick={() => onChange(n)}
            aria-current={n === page ? 'page' : undefined}
            className={cx('h-9 min-w-9 rounded-lg px-2 text-sm font-semibold', n === page ? 'bg-ink-900 text-white' : 'text-ink-600 hover:bg-white')}
          >
            {n}
          </button>
        </span>
      ))}
      <button disabled={page === pages} onClick={() => onChange(page + 1)} className="grid h-9 w-9 place-items-center rounded-lg text-ink-500 hover:bg-white disabled:opacity-30" aria-label="다음 페이지">
        <i className="fa-solid fa-chevron-right text-xs" />
      </button>
    </nav>
  )
}

export function Skeleton({ className }) {
  return <div className={cx('skeleton', className)} />
}

export function StatCard({ icon, label, value, suffix, hint, tone = 'pick' }) {
  const tones = {
    pick: 'bg-pick-50 text-pick-500',
    match: 'bg-match-50 text-match-600',
    sun: 'bg-sun-50 text-sun-500',
    coral: 'bg-coral-50 text-coral-500',
    dark: 'bg-ink-900 text-white',
  }
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-ink-500">{label}</p>
        <span className={cx('grid h-9 w-9 place-items-center rounded-xl', tones[tone])}>
          <i className={icon} />
        </span>
      </div>
      <p className="mt-3 font-display text-3xl font-bold text-ink-900">
        {value}
        {suffix && <span className="ml-1 text-base font-semibold text-ink-400">{suffix}</span>}
      </p>
      {hint && <p className="mt-1 text-xs text-ink-400">{hint}</p>}
    </div>
  )
}

export function KeywordChip({ children, matched, className }) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold',
        matched === true && 'bg-match-50 text-match-600',
        matched === false && 'bg-coral-50 text-coral-600',
        matched === undefined && 'bg-ink-100 text-ink-600',
        className,
      )}
    >
      {matched === true && <i className="fa-solid fa-check text-[10px]" />}
      {matched === false && <i className="fa-solid fa-plus text-[10px]" />}
      {children}
    </span>
  )
}
