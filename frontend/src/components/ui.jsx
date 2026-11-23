import { useEffect, useRef, useState } from 'react'

export const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

export function useCountUp(target, duration = 1200) {
  const [v, setV] = useState(target)
  const prev = useRef(target)
  useEffect(() => {
    const from = prev.current
    prev.current = target
    if (reduced() || from === target) { setV(target); return undefined }
    let raf
    const t0 = performance.now()
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / duration)
      setV(Math.round(from + (target - from) * (1 - Math.pow(1 - p, 3))))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])
  return v
}

export function LogoMark({ className = 'h-9 w-9' }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <defs><clipPath id="lm"><rect width="64" height="64" rx="18" /></clipPath></defs>
      <g clipPath="url(#lm)">
        <rect width="64" height="64" fill="#0f1033" />
        <path d="M19 7h26L32 52Z" fill="#fff" />
        <path d="M19 7l12 6-5.5 9.5Z M45 7l-12 6 5.5 9.5Z" fill="#dfe2ff" />
        <path d="M28.4 13.2h7.2l-1.5 6.1h-4.2Z" fill="#e2401f" />
        <path d="M29.9 19.3h4.2l3.2 20.5L32 47l-5.3-7.2Z" fill="#ff5a3c" />
        <path d="M-2 22L19 7l13 45v14H-2Z M66 22L45 7 32 52v14h34Z" fill="#26286a" />
        <path d="M9.5 39.5l3.2 3.2 6.3-6.8" fill="none" stroke="#19d3a2" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  )
}

export function Logo({ light }) {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark />
      <span className={`num text-[22px] font-bold ${light ? 'text-white' : 'text-navy'}`}>job<span className="text-tie">pick</span></span>
    </span>
  )
}

export const Icon = {
  check: (c = 'h-5 w-5') => <svg viewBox="0 0 24 24" className={c} fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>,
  x: (c = 'h-5 w-5') => <svg viewBox="0 0 24 24" className={c} fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6L6 18" /></svg>,
  arrow: (c = 'h-4 w-4') => <svg viewBox="0 0 24 24" className={c} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 12h14M13 6l6 6-6 6" /></svg>,
  up: (c = 'h-5 w-5') => <svg viewBox="0 0 24 24" className={c} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 19V5M6 11l6-6 6 6" /></svg>,
  heart: (on, c = 'h-5 w-5') => <svg viewBox="0 0 24 24" className={c} fill={on ? '#ff5a3c' : 'none'} stroke={on ? '#ff5a3c' : 'currentColor'} strokeWidth="1.8" aria-hidden><path d="M12 20.5s-7.5-4.6-7.5-10.3A4.2 4.2 0 0 1 12 7.6a4.2 4.2 0 0 1 7.5 2.6c0 5.7-7.5 10.3-7.5 10.3Z" /></svg>,
  user: (c = 'h-5 w-5') => <svg viewBox="0 0 24 24" className={c} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></svg>,
}

const HUES = [['#e9ebff', '#26286a'], ['#ffe6e0', '#c2361b'], ['#d9f7ee', '#0f7a5c'], ['#fff3d6', '#8a5a00'], ['#efe6ff', '#5b2bb5'], ['#e0f2ff', '#0b5c8f']]
export function Monogram({ name, seed = 0, className = 'h-12 w-12 text-lg' }) {
  const [bg, fg] = HUES[seed % HUES.length]
  return <span className={`num grid shrink-0 place-items-center rounded-2xl font-bold ${className}`} style={{ background: bg, color: fg }}>{name[0]}</span>
}

const SOURCE_STYLE = {
  '나라일터': ['#e0f2ff', '#0b5c8f', '나라일터'],
  '서울 일자리플러스': ['#d9f7ee', '#0f7a5c', '서울 일자리'],
  '경기 잡아바': ['#e0f7f4', '#0e7d6e', '경기 잡아바'],
  '사람인': ['#e9ebff', '#26286a', '사람인'],
  '워크넷': ['#fff3d6', '#8a5a00', '워크넷'],
  'HRD-Net': ['#efe6ff', '#5b2bb5', 'HRD-Net'],
}
export function SourceBadge({ source = '', className = 'h-12 w-14 px-1 text-[10px]' }) {
  const [bg, fg, label] = SOURCE_STYLE[source] || ['#eef0f6', '#4a4d6b', source || '기타']
  return <span className={`grid shrink-0 place-items-center rounded-2xl text-center font-bold leading-tight ${className}`} style={{ background: bg, color: fg }}>{label}</span>
}

export function Ring({ value, size = 120, stroke = 9, label, color = '#19d3a2', track = '#e6e7f0', children }) {
  const r = 50 - stroke / 2, c = 2 * Math.PI * r
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="-rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(100, value) / 100)} style={{ transition: 'stroke-dashoffset .8s cubic-bezier(.22,1,.36,1)' }} />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        {children || <div><div className="num font-bold leading-none" style={{ fontSize: size / 3.4 }}>{value}</div>{label && <div className="mt-0.5 text-[10px] font-semibold text-sub">{label}</div>}</div>}
      </div>
    </div>
  )
}

export function Radar({ data, size = 240 }) {
  const keys = Object.keys(data), n = keys.length, cx = size / 2, cy = size / 2, R = size / 2 - 38
  const pt = (i, v) => {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2
    return [cx + Math.cos(a) * R * (v / 100), cy + Math.sin(a) * R * (v / 100)]
  }
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="mx-auto w-full max-w-[260px]" role="img" aria-label="적합도 레이더 차트">
      {[33, 66, 100].map((g) => <polygon key={g} points={keys.map((_, i) => pt(i, g).join(',')).join(' ')} fill={g === 100 ? '#f5f5fa' : 'none'} stroke="#e6e7f0" />)}
      <polygon points={keys.map((k, i) => pt(i, data[k]).join(',')).join(' ')} fill="rgba(25,211,162,.25)" stroke="#19d3a2" strokeWidth="2" strokeLinejoin="round" />
      {keys.map((k, i) => <circle key={k} cx={pt(i, data[k])[0]} cy={pt(i, data[k])[1]} r="3.5" fill="#19d3a2" />)}
      {keys.map((k, i) => {
        const [x, y] = pt(i, 124)
        return <text key={k} x={x} y={y} textAnchor="middle" dominantBaseline="middle" className="fill-sub text-[10px] font-semibold">{k}</text>
      })}
    </svg>
  )
}

export function Spark({ data, height = 150 }) {
  const w = 320
  const pts = data.map((v, i) => [(i / (data.length - 1)) * (w - 24) + 12, height - 14 - (v / 100) * (height - 28)])
  const d = pts.map((p, i) => (i ? 'L' : 'M') + p.join(',')).join(' ')
  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="w-full" role="img" aria-label="Pick Score 추이">
      <defs><linearGradient id="sg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#19d3a2" stopOpacity=".35" /><stop offset="1" stopColor="#19d3a2" stopOpacity="0" /></linearGradient></defs>
      <path d={`${d} L${pts.at(-1)[0]},${height} L${pts[0][0]},${height} Z`} fill="url(#sg)" />
      <path d={d} fill="none" stroke="#19d3a2" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
      {pts.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={i === pts.length - 1 ? 6 : 3} fill={i === pts.length - 1 ? '#ff5a3c' : '#fff'} stroke={i === pts.length - 1 ? '#fff' : '#19d3a2'} strokeWidth="2" />)}
    </svg>
  )
}

export function Reveal({ children, className = '', delay = 0 }) {
  const ref = useRef(null)
  const [on, setOn] = useState(false)
  useEffect(() => {
    if (reduced() || !ref.current) { setOn(true); return undefined }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setOn(true); io.disconnect() } }, { threshold: 0, rootMargin: '0px 0px -8% 0px' })
    io.observe(ref.current)
    return () => io.disconnect()
  }, [])
  return <div ref={ref} className={`reveal ${on ? 'on' : ''} ${className}`} style={{ transitionDelay: `${delay}ms` }}>{children}</div>
}

export function Highlight({ text, words }) {
  if (!words.length) return text
  const re = new RegExp(`(${words.map((w) => w.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')).join('|')})`, 'g')
  return text.split(re).map((p, i) => (words.includes(p) ? <mark key={i} className="rounded-md bg-mint/25 px-1 font-semibold text-navy">{p}</mark> : p))
}

export const Tile = ({ children, className = '' }) => <div className={`tile ${className}`}>{children}</div>

export const Chip = ({ children, tone = 'line', className = '' }) => {
  const t = { line: 'bg-bg text-navy ring-1 ring-line', navy: 'bg-navy text-white', mint: 'bg-mint/15 text-[#0b8a68]', tie: 'bg-tie/12 text-tie', sky: 'bg-sky text-suit', white: 'bg-white/90 text-navy' }
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${t[tone]} ${className}`}>{children}</span>
}

export const Btn = ({ children, variant = 'navy', size = 'md', className = '', ...p }) => {
  const v = {
    navy: 'bg-navy text-white hover:bg-suit',
    tie: 'bg-tie text-white hover:brightness-110 shadow-[0_10px_24px_-10px_rgba(255,90,60,.8)]',
    mint: 'bg-mint text-navy hover:brightness-105',
    soft: 'bg-white text-navy ring-1 ring-line hover:ring-navy',
    ghost: 'text-navy hover:bg-sky',
  }
  const s = { sm: 'h-9 px-4 text-xs', md: 'h-11 px-5 text-sm', lg: 'h-14 px-7 text-base' }
  return <button className={`inline-flex items-center justify-center gap-2 rounded-full font-semibold transition active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-35 ${v[variant]} ${s[size]} ${className}`} {...p}>{children}</button>
}

export function PageHead({ step, title, desc, aside }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-6 pb-6 pt-8">
      <div>
        {step && <div className="kicker text-tie">{step}</div>}
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">{title}</h1>
        {desc && <p className="mt-2 max-w-2xl text-sm text-sub">{desc}</p>}
      </div>
      {aside}
    </div>
  )
}
