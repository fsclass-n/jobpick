import { Link } from 'react-router-dom'
import { JourneyBar } from '../components/Layout'
import { Btn, PageHead, Panel, Tag } from '../components/ui'
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
  const names = JOBS.filter((j) => scraps.includes(j.id)).map((j) => j.company)

  return (
    <div className="wrap pb-10">
      <JourneyBar />
      <PageHead no="02" en="Gap" ko="갭 로드맵" desc={`스크랩한 공고 ${n}개(${names.join(', ') || '없음'})가 요구하는 역량을 집계했습니다.`}>
        <div className="text-right"><div className="eyebrow text-mute">Coverage</div><div className="font-serif text-5xl font-black">{coverage}%</div></div>
      </PageHead>
      {n === 0 ? (
        <Panel className="mt-8 p-10 text-center">공고를 스크랩하면 갭을 분석합니다. <Link to="/match" className="font-semibold underline">공고 매칭으로 →</Link></Panel>
      ) : (
        <div className="grid gap-8 pt-8 lg:grid-cols-2">
          <section>
            <h2 className="eyebrow mb-4 border-b border-ink pb-2">Market demand · 공고 노출 빈도</h2>
            <ul>
              {all.map(([s, c]) => {
                const have = owned.includes(s)
                return (
                  <li key={s} className="grid grid-cols-[110px_1fr_48px_56px] items-center gap-3 border-b border-line py-3 text-sm">
                    <span className="font-medium">{s}</span>
                    <div className="h-2 bg-line"><div className={`h-2 ${have ? 'bg-ink' : 'bg-alert'}`} style={{ width: `${(c / max) * 100}%`, transition: 'width .6s' }} /></div>
                    <span className="text-right text-xs text-mute">{c}/{n}</span>
                    <Tag tone={have ? 'pick' : 'alert'}>{have ? '보유' : '부족'}</Tag>
                  </li>
                )
              })}
            </ul>
          </section>
          <section>
            <h2 className="eyebrow mb-4 border-b border-ink pb-2">Roadmap · 총 {week - 1}주</h2>
            {plan.length === 0 ? <Panel className="p-6 text-sm">모든 요구역량을 보유했습니다.</Panel> : (
              <ol>
                {plan.map((p) => (
                  <li key={p.s} className="grid grid-cols-[84px_1fr] gap-4 border-b border-line py-4">
                    <div className="font-serif text-lg font-black">{p.from === p.to ? `W${p.from}` : `W${p.from}–${p.to}`}</div>
                    <div>
                      <div className="flex items-center gap-2"><span className="font-bold">{p.s}</span><span className="text-xs text-mute">공고 {p.c}/{n}</span></div>
                      <p className="mt-1 text-sm text-mute">{p.task}</p>
                      <Btn variant="line" onClick={() => setOwned([...owned, p.s])} className="mt-3 px-3 py-1.5 text-xs">완료 처리 → 점수 반영</Btn>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
