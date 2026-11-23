import { NavLink } from 'react-router-dom'
import { useApp } from '../state'
import { Icon, Ring, useCountUp } from './ui'

export default function JourneyBar() {
  const { pick, distance, cutoff, match, coverage, rehearse } = useApp()
  const p = useCountUp(pick)
  const steps = [['/match', '매칭', match], ['/gap', '갭', coverage], ['/rewrite', '리라이팅', match], ['/rehearse', '면접', rehearse]]
  return (
    <div className="mt-6 flex flex-wrap items-center gap-4 rounded-[28px] bg-navy p-3 pr-4 text-white">
      <div className="flex items-center gap-3 rounded-[22px] bg-white/5 py-2 pl-2 pr-5">
        <Ring value={p} size={60} stroke={10} track="rgba(255,255,255,.12)"><span className="num text-lg font-bold">{p}</span></Ring>
        <div>
          <div className="text-[11px] text-white/60">합격선 {cutoff}점까지</div>
          <div className="text-lg font-extrabold">{distance > 0 ? <>{distance}점 남음</> : <span className="text-mint">도달 {Icon.check('inline h-4 w-4')}</span>}</div>
        </div>
      </div>
      <ol className="flex flex-1 flex-wrap gap-2">
        {steps.map(([to, l, v], i) => (
          <li key={to} className="flex-1">
            <NavLink to={to} className={({ isActive }) => `flex min-w-[96px] items-center justify-between gap-2 rounded-2xl px-4 py-3 transition ${isActive ? 'bg-white text-navy' : 'bg-white/5 hover:bg-white/10'}`}>
              <span className="text-xs font-semibold"><span className="opacity-50">0{i + 1}</span> {l}</span><span className="num text-lg font-bold">{v}</span>
            </NavLink>
          </li>
        ))}
      </ol>
    </div>
  )
}
