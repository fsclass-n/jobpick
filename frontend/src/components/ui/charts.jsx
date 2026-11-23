import { useState } from 'react'
import { cx, scoreTone } from '../../lib/format'
import { useCountUp, useInView } from './motion'

/** 적합도 점수 원형 게이지 */
export function ScoreRing({ score = 0, size = 160, stroke = 14, label = '적합도', animate = true }) {
  const [ref, inView] = useInView()
  const value = useCountUp(score, inView && animate ? 1200 : 0, inView || !animate)
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const tone = scoreTone(score)
  return (
    <div ref={ref} className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e7e9f3" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={tone.ring}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (c * Math.min(100, value)) / 100}
        />
      </svg>
      <div className="absolute text-center">
        <p className={cx('font-display font-bold leading-none', tone.text)} style={{ fontSize: size * 0.26 }}>
          {Math.round(value)}
        </p>
        <p className="mt-1 text-xs font-medium text-ink-400">{label}</p>
      </div>
      <span className="sr-only">{`${label} ${score}점`}</span>
    </div>
  )
}

/** 가로 진행 막대 */
export function ProgressBar({ value, tone, className }) {
  const t = tone || scoreTone(value).bg
  return (
    <div className={cx('h-2 w-full overflow-hidden rounded-full bg-ink-100', className)}>
      <div className={cx('h-full rounded-full transition-[width] duration-1000', t)} style={{ width: `${Math.max(2, Math.min(100, value))}%` }} />
    </div>
  )
}

/** 누적 막대 차트: series = [{ key, label, color }] */
export function StackedBarChart({ data, series, height = 220, xKey = 'date' }) {
  const [hover, setHover] = useState(null)
  const max = Math.max(1, ...data.map((d) => series.reduce((s, x) => s + (d[x.key] || 0), 0)))
  return (
    <div>
      <div className="relative flex items-end gap-1.5 sm:gap-2" style={{ height }}>
        {[0.25, 0.5, 0.75, 1].map((g) => (
          <div key={g} className="pointer-events-none absolute inset-x-0 border-t border-dashed border-ink-100" style={{ bottom: `${g * 100}%` }} />
        ))}
        {data.map((d, i) => {
          const total = series.reduce((s, x) => s + (d[x.key] || 0), 0)
          return (
            <div
              key={i}
              className="group relative flex h-full flex-1 flex-col justify-end"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            >
              <div className="flex flex-col-reverse overflow-hidden rounded-t-md transition-all duration-700" style={{ height: `${(total / max) * 100}%` }}>
                {series.map((s) => (
                  <div key={s.key} style={{ height: total ? `${((d[s.key] || 0) / total) * 100}%` : 0, background: s.color }} />
                ))}
              </div>
              {hover === i && (
                <div className="absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-ink-900 px-3 py-2 text-xs text-white shadow-lift">
                  <p className="mb-1 font-semibold">{d[xKey]}</p>
                  {series.map((s) => (
                    <p key={s.key} className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                      {s.label}: {d[s.key] || 0}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
      <div className="mt-2 flex gap-1.5 sm:gap-2">
        {data.map((d, i) => (
          <span key={i} className={cx('flex-1 text-center text-[10px] text-ink-400', i % 2 && 'max-sm:invisible')}>
            {d[xKey]}
          </span>
        ))}
      </div>
      <Legend series={series} />
    </div>
  )
}

export function Legend({ series }) {
  return (
    <div className="mt-4 flex flex-wrap gap-4">
      {series.map((s) => (
        <span key={s.key || s.label} className="flex items-center gap-1.5 text-xs text-ink-500">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} />
          {s.label}
        </span>
      ))}
    </div>
  )
}

/** 꺾은선 차트 (점수 추이) */
export function LineChart({ data, yKey = 'score', xKey = 'date', height = 200, max = 100, color = '#5b5bf7' }) {
  const [hover, setHover] = useState(null)
  if (!data.length) return null
  const w = 600
  const h = height
  const pad = 24
  const x = (i) => (data.length === 1 ? w / 2 : pad + (i * (w - pad * 2)) / (data.length - 1))
  const y = (v) => h - pad - (v / max) * (h - pad * 2)
  const path = data.map((d, i) => `${i ? 'L' : 'M'}${x(i)},${y(d[yKey])}`).join(' ')
  const area = `${path} L${x(data.length - 1)},${h - pad} L${x(0)},${h - pad} Z`
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label="점수 추이 그래프">
        <defs>
          <linearGradient id="lc-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor={color} stopOpacity="0.25" />
            <stop offset="1" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 25, 50, 75, 100].map((g) => (
          <g key={g}>
            <line x1={pad} x2={w - pad} y1={y(g)} y2={y(g)} stroke="#e7e9f3" strokeDasharray="4 4" />
            <text x={4} y={y(g) + 4} fontSize="10" fill="#a3a9c4">{g}</text>
          </g>
        ))}
        <path d={area} fill="url(#lc-fill)" />
        <path d={path} fill="none" stroke={color} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
        {data.map((d, i) => (
          <g key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
            <circle cx={x(i)} cy={y(d[yKey])} r="14" fill="transparent" />
            <circle cx={x(i)} cy={y(d[yKey])} r={hover === i ? 7 : 5} fill="#fff" stroke={color} strokeWidth="3" />
          </g>
        ))}
      </svg>
      {hover !== null && (
        <div
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded-lg bg-ink-900 px-3 py-2 text-xs text-white shadow-lift"
          style={{ left: `${(x(hover) / w) * 100}%`, top: `${(y(data[hover][yKey]) / h) * 100}%` }}
        >
          <p className="font-semibold">{data[hover][yKey]}점</p>
          <p className="text-ink-300">{data[hover].label || data[hover][xKey]}</p>
        </div>
      )}
      <div className="flex justify-between px-4 text-[10px] text-ink-400">
        {data.map((d, i) => (
          <span key={i}>{d[xKey]}</span>
        ))}
      </div>
    </div>
  )
}

/** 도넛 차트: data = [{ label, value, color }] */
export function DonutChart({ data, size = 160, stroke = 22, center }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  let offset = 0
  return (
    <div className="flex flex-col items-center gap-5">
      <div className="relative grid place-items-center" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f5f6fb" strokeWidth={stroke} />
          {data.map((d) => {
            const len = (d.value / total) * c
            const el = (
              <circle key={d.label} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={d.color} strokeWidth={stroke} strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-offset} />
            )
            offset += len
            return el
          })}
        </svg>
        {center && <div className="absolute text-center">{center}</div>}
      </div>
      <ul className="w-full space-y-2">
        {data.map((d) => (
          <li key={d.label} className="flex items-center gap-2 text-sm">
            <span className="h-3 w-3 rounded-sm" style={{ background: d.color }} />
            <span className="text-ink-600">{d.label}</span>
            <span className="ml-auto pl-4 font-semibold text-ink-900">{d.value}</span>
            <span className="w-12 text-right text-xs text-ink-400">{Math.round((d.value / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** 가로 막대 목록 */
export function HBarList({ data, labelKey, valueKey, color = 'bg-pick-500', format = (v) => v }) {
  const max = Math.max(1, ...data.map((d) => d[valueKey]))
  return (
    <ul className="space-y-3">
      {data.map((d) => (
        <li key={d[labelKey]}>
          <div className="mb-1 flex justify-between text-sm">
            <span className="text-ink-600">{d[labelKey]}</span>
            <span className="font-semibold text-ink-900">{format(d[valueKey], d)}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-ink-100">
            <div className={cx('h-full rounded-full transition-[width] duration-1000', color)} style={{ width: `${(d[valueKey] / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  )
}
