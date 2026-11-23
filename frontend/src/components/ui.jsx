import { useEffect, useRef, useState } from 'react'

export const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

export function useCountUp(target, duration = 1600, start = true) {
  const [v, setV] = useState(0)
  useEffect(() => {
    if (!start) return undefined
    if (reduced()) { setV(target); return undefined }
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

export function TagMark({ className = 'h-7 w-7' }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <path d="M20 6h34a4 4 0 0 1 4 4v44a4 4 0 0 1-4 4H20L6 44V20Z" fill="currentColor" />
      <circle cx="17" cy="32" r="4" fill="#d4ff3a" />
      <path d="M28 33l7 7 14-16" fill="none" stroke="#d4ff3a" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function Logo({ light, small }) {
  return (
    <span className={`flex items-center gap-2 ${light ? 'text-white' : 'text-ink'}`}>
      <TagMark className={small ? 'h-6 w-6' : 'h-8 w-8'} />
      <span className={`font-serif font-black tracking-tight ${small ? 'text-xl' : 'text-[26px]'}`}>
        jobpick<span className="text-pick [-webkit-text-stroke:1px_#141414]">.</span>
      </span>
    </span>
  )
}

export function Check({ className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  )
}

export function Heart({ on, className = 'h-5 w-5' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill={on ? '#141414' : 'none'} stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M12 20.5s-7.5-4.6-7.5-10.3A4.2 4.2 0 0 1 12 7.6a4.2 4.2 0 0 1 7.5 2.6c0 5.7-7.5 10.3-7.5 10.3Z" />
    </svg>
  )
}

const HUES = [['#d4ff3a', '#141414'], ['#141414', '#d4ff3a'], ['#e9e4d8', '#141414'], ['#2b2b2b', '#f6f4ef'], ['#c9d8ff', '#141414'], ['#ffd9c9', '#141414']]

export function Cover({ seed = 0, label, ratio = 'aspect-[4/5]', children }) {
  const [bg, fg] = HUES[seed % HUES.length]
  return (
    <div className={`relative overflow-hidden ${ratio}`} style={{ background: bg, color: fg }}>
      <svg viewBox="0 0 100 125" className="absolute inset-0 h-full w-full opacity-[.14]" preserveAspectRatio="none" aria-hidden>
        {Array.from({ length: 9 }).map((_, i) => <line key={i} x1={-20 + i * 16} y1="0" x2={20 + i * 16} y2="125" stroke={fg} strokeWidth=".6" />)}
      </svg>
      <span className="font-serif absolute -bottom-6 -right-2 text-[150px] font-black leading-none opacity-90">{label}</span>
      {children}
    </div>
  )
}

export function Gauge({ value, size = 120, label, dark }) {
  const r = 44, c = 2 * Math.PI * r
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="-rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke={dark ? '#333' : '#e3dfd6'} strokeWidth="8" />
        <circle cx="50" cy="50" r={r} fill="none" stroke={dark ? '#d4ff3a' : '#141414'} strokeWidth="8"
          strokeDasharray={c} strokeDashoffset={c * (1 - value / 100)} style={{ transition: 'stroke-dashoffset .8s ease' }} />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <div className="font-serif font-black leading-none" style={{ fontSize: size / 3.6 }}>{value}</div>
          {label && <div className="eyebrow mt-1 text-[9px] text-mute">{label}</div>}
        </div>
      </div>
    </div>
  )
}

export function Radar({ data, size = 240 }) {
  const keys = Object.keys(data), n = keys.length, cx = size / 2, cy = size / 2, R = size / 2 - 36
  const pt = (i, v) => {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2
    return [cx + Math.cos(a) * R * (v / 100), cy + Math.sin(a) * R * (v / 100)]
  }
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="mx-auto w-full max-w-[280px]" role="img" aria-label="적합도 레이더 차트">
      {[25, 50, 75, 100].map((g) => <polygon key={g} points={keys.map((_, i) => pt(i, g).join(',')).join(' ')} fill="none" stroke="#e3dfd6" />)}
      <polygon points={keys.map((k, i) => pt(i, data[k]).join(',')).join(' ')} fill="rgba(212,255,58,.55)" stroke="#141414" strokeWidth="1.5" />
      {keys.map((k, i) => {
        const [x, y] = pt(i, 120)
        return <text key={k} x={x} y={y} textAnchor="middle" dominantBaseline="middle" className="fill-ink text-[10px] font-semibold">{k}</text>
      })}
    </svg>
  )
}

export function Line({ data, height = 140 }) {
  const w = 320
  const pts = data.map((v, i) => [(i / (data.length - 1)) * (w - 24) + 12, height - 12 - (v / 100) * (height - 24)])
  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="w-full" role="img" aria-label="Pick Score 추이">
      <polyline points={pts.map((p) => p.join(',')).join(' ')} fill="none" stroke="#141414" strokeWidth="2" />
      {pts.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={i === pts.length - 1 ? 6 : 3.5} fill={i === pts.length - 1 ? '#d4ff3a' : '#141414'} stroke="#141414" />)}
    </svg>
  )
}

export function Reveal({ children, className = '', as: Tag = 'div' }) {
  const ref = useRef(null)
  const [on, setOn] = useState(false)
  useEffect(() => {
    if (reduced() || !ref.current) { setOn(true); return undefined }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setOn(true); io.disconnect() } }, { threshold: 0, rootMargin: '0px 0px -8% 0px' })
    io.observe(ref.current)
    return () => io.disconnect()
  }, [])
  return <Tag ref={ref} className={`reveal ${on ? 'on' : ''} ${className}`}>{children}</Tag>
}

export function Highlight({ text, words }) {
  if (!words.length) return text
  const re = new RegExp(`(${words.map((w) => w.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')).join('|')})`, 'g')
  return text.split(re).map((p, i) => (words.includes(p) ? <mark key={i} className="bg-pick px-0.5 text-ink">{p}</mark> : p))
}

export const Panel = ({ children, className = '' }) => <div className={`border border-ink bg-white ${className}`}>{children}</div>

export const Tag = ({ children, tone = 'line' }) => {
  const t = { line: 'border border-line text-ink', ink: 'bg-ink text-paper', pick: 'bg-pick text-ink', alert: 'bg-alert text-white', mute: 'bg-line text-ink' }
  return <span className={`inline-flex items-center px-2 py-0.5 text-[11px] font-semibold tracking-wide ${t[tone]}`}>{children}</span>
}

export const Btn = ({ children, variant = 'ink', className = '', ...p }) => {
  const v = {
    ink: 'bg-ink text-paper hover:bg-black',
    pick: 'bg-pick text-ink hover:brightness-95',
    line: 'border border-ink text-ink hover:bg-ink hover:text-paper',
    ghost: 'text-ink hover:bg-line',
  }
  return <button className={`inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-35 ${v[variant]} ${className}`} {...p}>{children}</button>
}

export function PageHead({ no, en, ko, desc, children }) {
  return (
    <div className="border-b border-ink pb-6 pt-10">
      <div className="eyebrow text-mute">{no} — {en}</div>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <h1 className="display text-4xl sm:text-5xl">{ko}</h1>
        {children}
      </div>
      {desc && <p className="mt-3 max-w-2xl text-sm text-mute">{desc}</p>}
    </div>
  )
}
