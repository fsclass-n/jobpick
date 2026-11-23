import { Link } from 'react-router-dom'
import JourneyBar from '../components/JourneyBar'
import { Btn, Chip, Monogram, PageHead, Ring, Tile } from '../components/ui'
import { SKILL_PLAN } from '../data/mock'
import { useApp } from '../state'

export default function Gap() {
  const { gaps, freq, owned, setOwned, scraps, coverage, jobs } = useApp()
  const n = scraps.length
  let week = 1
  const plan = gaps.map(([s, c]) => {
    const p = SKILL_PLAN[s] || { weeks: 1, task: `${s} 기초 학습과 미니 프로젝트` }
    const item = { s, c, ...p, from: week, to: week + p.weeks - 1 }
    week += p.weeks
    return item
  })
  const max = Math.max(1, ...Object.values(freq))
  const all = Object.entries(freq).sort((a, b) => b[1] - a[1])
  const picked = jobs.filter((j) => scraps.includes(j.id))

  return (
    <div className="wrap pb-10">
      <JourneyBar />
      <PageHead step="Step 02 · Gap" title="갭 로드맵" desc="Pick한 공고들이 공통으로 요구하는 역량을 모아, 부족한 것부터 주차별 계획으로 바꿨어요."
        aside={<div className="flex -space-x-2">{picked.map((j) => <Monogram key={j.id} name={j.company} seed={j.id} className="h-11 w-11 text-base ring-4 ring-bg" />)}</div>} />
      {n === 0 ? (
        <Tile className="p-12 text-center">아직 Pick한 공고가 없어요. <Link to="/" className="font-semibold text-tie underline">메인에서 공고를 넘겨 보세요</Link></Tile>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[320px_1fr_1fr]">
          <Tile className="flex flex-col items-center justify-center p-8 text-center">
            <Ring value={coverage} size={160} stroke={10} label="역량 커버리지" />
            <p className="mt-4 text-sm text-sub">공고 {n}개 · 요구역량 {all.length}종 중<br /><b className="text-navy">{all.filter(([s]) => owned.includes(s)).length}종</b> 보유</p>
          </Tile>
          <Tile className="p-6">
            <h2 className="font-extrabold">시장이 원하는 역량</h2>
            <ul className="mt-4 space-y-3">
              {all.map(([s, c]) => {
                const have = owned.includes(s)
                return (
                  <li key={s} className="text-sm">
                    <div className="mb-1 flex justify-between"><span className="font-semibold">{s}</span><span className="text-xs text-sub">{c}/{n}개 공고 · {have ? <b className="text-[#0b8a68]">보유</b> : <b className="text-tie">부족</b>}</span></div>
                    <div className="h-2.5 rounded-full bg-bg"><div className={`h-2.5 rounded-full ${have ? 'bg-mint' : 'bg-tie'}`} style={{ width: `${(c / max) * 100}%`, transition: 'width .6s' }} /></div>
                  </li>
                )
              })}
            </ul>
          </Tile>
          <Tile className="p-6">
            <div className="flex items-center justify-between"><h2 className="font-extrabold">보완 로드맵</h2><Chip tone="navy">총 {week - 1}주</Chip></div>
            {plan.length === 0 ? <p className="mt-6 text-sm text-[#0b8a68]">모든 요구역량을 갖췄어요!</p> : (
              <ol className="mt-4 space-y-3">
                {plan.map((p) => (
                  <li key={p.s} className="rounded-3xl bg-bg p-4">
                    <div className="flex items-center justify-between"><span className="num text-xs font-bold text-tie">{p.from === p.to ? `W${p.from}` : `W${p.from}–W${p.to}`}</span><span className="text-[11px] text-sub">공고 {p.c}/{n}</span></div>
                    <div className="mt-1 font-bold">{p.s}</div>
                    <p className="mt-0.5 text-xs text-sub">{p.task}</p>
                    <Btn size="sm" variant="soft" onClick={() => setOwned([...owned, p.s])} className="mt-3">완료 → 점수 반영</Btn>
                  </li>
                ))}
              </ol>
            )}
          </Tile>
        </div>
      )}
    </div>
  )
}
