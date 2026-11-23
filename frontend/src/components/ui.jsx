import { useEffect, useRef, useState } from 'react'

export const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

export function useCountUp(target, duration = 1600, start = true) {
  const [v, setV] = useState(0)
  useEffect(() => {
    if (!start) return
    if (reduced()) return setV(target)
    let raf
    const t0 = performance.now()
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / duration)
      setV(Math.round(target * (1 - Math.pow(1 - p, 3))))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, duration, start])
  return start ? v : 0
}

export function Check({ className = 'h-5 w-5' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  )
}

export function Logo({ light }) {
  return (
    <span className={`font-display flex items-center gap-2 text-xl font-extrabold tracking-tight ${light ? 'text-white' : 'text-ink'}`}>
      <span className="grid h-7 w-7 place-items-center rounded-lg bg-brand text-white"><Check className="h-4 w-4" /></span>
      job<span className="text-brand">pick</span>
    </span>
  )
}

export function Gauge({ value, size = 120, label }) {
  const r = 44, c = 2 * Math.PI * r
  const color = value >= 80 ? '#10b981' : value >= 60 ? '#6366f1' : '#f59e0b'
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="-rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#e2e8f0" strokeWidth="9" />
        <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="9" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - value / 100)} style={{ transition: 'stroke-dashoffset .8s ease' }} />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div><div className="font-display text-2xl font-extrabold">{value}</div>{label && <div className="text-[11px] text-slate-500">{label}</div>}</div>
      </div>
    </div>
  )
}

export function Radar({ data, size = 220 }) {
  const keys = Object.keys(data), n = keys.length, cx = size / 2, cy = size / 2, R = size / 2 - 34
  const pt = (i, v) => {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2
    return [cx + Math.cos(a) * R * (v / 100), cy + Math.sin(a) * R * (v / 100)]
  }
  const poly = keys.map((k, i) => pt(i, data[k]).join(',')).join(' ')
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="mx-auto w-full max-w-[260px]" role="img" aria-label="적합도 레이더 차트">
      {[25, 50, 75, 100].map((g) => (
        <polygon key={g} points={keys.map((_, i) => pt(i, g).join(',')).join(' ')} fill="none" stroke="#e2e8f0" />
      ))}
      <polygon points={poly} fill="rgba(79,70,229,.18)" stroke="#4f46e5" strokeWidth="2" />
      {keys.map((k, i) => {
        const [x, y] = pt(i, 118)
        return <text key={k} x={x} y={y} textAnchor="middle" dominantBaseline="middle" className="fill-slate-600 text-[10px]">{k}</text>
      })}
    </svg>
  )
}

export function Line({ data, height = 120 }) {
  const w = 300, max = 100
  const pts = data.map((v, i) => [(i / (data.length - 1)) * (w - 20) + 10, height - 10 - (v / max) * (height - 20)])
  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="w-full" role="img" aria-label="Pick Score 추이">
      <polyline points={pts.map((p) => p.join(',')).join(' ')} fill="none" stroke="#4f46e5" strokeWidth="3" strokeLinejoin="round" />
      {pts.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="4" fill="#4f46e5" />)}
    </svg>
  )
}

export function Reveal({ children, className = '' }) {
  const ref = useRef(null)
  const [on, setOn] = useState(false)
  useEffect(() => {
    if (reduced()) return setOn(true)
    const io = new IntersectionObserver(([e]) => e.isIntersecting && (setOn(true), io.disconnect()), { threshold: 0.15 })
    io.observe(ref.current)
    return () => io.disconnect()
  }, [])
  return <div ref={ref} className={`reveal ${on ? 'on' : ''} ${className}`}>{children}</div>
}

export function Highlight({ text, words }) {
  if (!words.length) return text
  const re = new RegExp(`(${words.map((w) => w.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')).join('|')})`, 'g')
  return text.split(re).map((p, i) => (words.includes(p) ? <mark key={i} className="rounded bg-amber-200 px-0.5">{p}</mark> : p))
}

export const Card = ({ children, className = '' }) => (
  <div className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md ${className}`}>{children}</div>
)

export const Badge = ({ children, tone = 'slate' }) => {
  const t = { slate: 'bg-slate-100 text-slate-600', brand: 'bg-indigo-100 text-indigo-700', green: 'bg-emerald-100 text-emerald-700', amber: 'bg-amber-100 text-amber-700', red: 'bg-rose-100 text-rose-700' }
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${t[tone]}`}>{children}</span>
}
