import { cx } from '../../lib/format'

export default function Logo({ light = false, className }) {
  return (
    <span className={cx('flex items-center gap-2.5', className)}>
      <svg viewBox="0 0 64 64" className="h-9 w-9" aria-hidden="true">
        <defs>
          <linearGradient id="logo-g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#5b5bf7" />
            <stop offset="1" stopColor="#18c99a" />
          </linearGradient>
        </defs>
        <rect width="64" height="64" rx="16" fill={light ? 'rgba(255,255,255,0.08)' : '#0f1430'} />
        <circle cx="27" cy="27" r="13" fill="none" stroke="url(#logo-g)" strokeWidth="6" />
        <path d="M36 36l12 12" stroke="url(#logo-g)" strokeWidth="6" strokeLinecap="round" />
        <path d="M21 27l4 4 8-8" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className={cx('font-display text-xl font-bold tracking-tight', light ? 'text-white' : 'text-ink-900')}>
        job<span className="text-gradient">pick</span>
      </span>
    </span>
  )
}
