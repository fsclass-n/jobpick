import { JourneyTracker } from '../components/Layout'
import { Badge, Card } from '../components/ui'
import { JOBS, SKILL_PLAN } from '../data/mock'
import { useApp } from '../state'

export default function Gap() {
  const { gaps, freq, owned, setOwned, scraps, coverage } = useApp()
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
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <JourneyTracker />
      <h1 className="font-display text-2xl font-extrabold">Gap · 커리어 갭 로드맵</h1>
      <p className="mb-6 text-sm text-slate-500">스크랩한 공고 {n}개({JOBS.filter((j) => scraps.includes(j.id)).map((j) => j.company).join(', ') || '없음'})가 요구하는 역량을 집계했어요. 현재 커버리지 <b>{coverage}%</b></p>
      {n === 0 ? <Card>Match 화면에서 공고를 스크랩하면 갭을 분석합니다.</Card> : (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <h2 className="mb-3 font-bold">시장 요구역량 (공고 노출 빈도)</h2>
            <ul className="space-y-2">
              {all.map(([s, c]) => {
                const have = owned.includes(s)
                return (
                  <li key={s} className="flex items-center gap-3 text-sm">
                    <span className="w-28 shrink-0">{s}</span>
                    <div className="h-3 flex-1 rounded-full bg-slate-100"><div className={`h-3 rounded-full ${have ? 'bg-emerald-400' : 'bg-amber-400'}`} style={{ width: `${(c / max) * 100}%`, transition: 'width .6s' }} /></div>
                    <span className="w-14 text-right text-xs text-slate-500">{c}/{n}</span>
                    <Badge tone={have ? 'green' : 'amber'}>{have ? '보유' : '부족'}</Badge>
                  </li>
                )
              })}
            </ul>
          </Card>
          <Card>
            <h2 className="mb-3 font-bold">주차별 보완 계획 <span className="text-xs font-normal text-slate-400">(총 {week - 1}주)</span></h2>
            {plan.length === 0 ? <p className="text-sm text-emerald-600">모든 요구역량을 보유했습니다.</p> : (
              <ol className="relative space-y-4 border-l-2 border-indigo-100 pl-5">
                {plan.map((p) => (
                  <li key={p.s}>
                    <span className="absolute -left-[7px] mt-1 h-3 w-3 rounded-full bg-brand" />
                    <div className="text-xs font-bold text-brand">{p.from === p.to ? `${p.from}주차` : `${p.from}~${p.to}주차`} · 노출 {p.c}/{n}</div>
                    <div className="font-medium">{p.s}</div>
                    <div className="text-sm text-slate-600">{p.task}</div>
                    <button onClick={() => setOwned([...owned, p.s])} className="mt-1 rounded-lg border px-2 py-0.5 text-xs hover:bg-indigo-50">완료 처리 → 점수 반영</button>
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </div>
      )}
    </div>
  )
}
