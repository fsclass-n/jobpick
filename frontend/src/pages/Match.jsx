import { useState } from 'react'
import { JobFilterBar } from './parts'
import { JourneyTracker } from '../components/Layout'
import { Badge, Card, Gauge, Radar } from '../components/ui'
import { JOBS } from '../data/mock'
import { useApp } from '../state'

export default function Match() {
  const { fitOf, targetId, setTargetId, scraps, setScraps, cutoff } = useApp()
  const [f, setF] = useState({ q: '', region: '', career: '', size: '' })
  const list = JOBS.filter((j) =>
    (!f.q || (j.title + j.company + j.skills.join()).toLowerCase().includes(f.q.toLowerCase())) &&
    (!f.region || j.region === f.region) && (!f.career || j.career === f.career) && (!f.size || j.size === f.size))
  const target = JOBS.find((j) => j.id === targetId)
  const toggle = (id) => setScraps(scraps.includes(id) ? scraps.filter((x) => x !== id) : [...scraps, id])
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <JourneyTracker />
      <h1 className="font-display text-2xl font-extrabold">Match · 공고 매칭</h1>
      <p className="mb-4 text-sm text-slate-500">RPA가 수집한 공고와 내 프로필의 적합도, 그리고 합격선({cutoff}점)까지의 거리를 확인하세요.</p>
      <JobFilterBar f={f} setF={setF} />
      <div className="mt-4 grid gap-6 lg:grid-cols-5">
        <div className="space-y-3 lg:col-span-3">
          {list.length === 0 && <Card>조건에 맞는 공고가 없습니다.</Card>}
          {list.map((j) => {
            const fit = fitOf(j)
            return (
              <Card key={j.id} className={`cursor-pointer ${j.id === targetId ? 'ring-2 ring-brand' : ''}`}>
                <div className="flex items-start justify-between gap-3" onClick={() => setTargetId(j.id)}>
                  <div>
                    <div className="font-bold">{j.title}</div>
                    <div className="text-sm text-slate-500">{j.company} · {j.region} · {j.career} · {j.size}</div>
                    <div className="mt-2 flex flex-wrap gap-1">{j.skills.map((s) => <Badge key={s}>{s}</Badge>)}</div>
                    <div className="mt-2 text-xs text-slate-400">마감 {j.deadline} · 출처 {j.source}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-display text-2xl font-extrabold text-brand">{fit}%</div>
                    <div className={`text-xs ${fit >= cutoff ? 'text-emerald-600' : 'text-amber-600'}`}>{fit >= cutoff ? '합격선 도달' : `거리 ${cutoff - fit}`}</div>
                  </div>
                </div>
                <button onClick={() => toggle(j.id)} className={`mt-3 rounded-lg border px-3 py-1 text-xs ${scraps.includes(j.id) ? 'border-brand bg-indigo-50 text-brand' : 'text-slate-500'}`}>
                  {scraps.includes(j.id) ? '★ 스크랩됨' : '☆ 스크랩'}
                </button>
              </Card>
            )
          })}
        </div>
        <Card className="h-fit lg:col-span-2 lg:sticky lg:top-24">
          <div className="text-xs text-slate-500">선택한 목표 공고</div>
          <div className="font-bold">{target.company} · {target.title}</div>
          <Radar data={target.radar} />
          <div className="mt-2 flex items-center justify-center gap-4"><Gauge value={fitOf(target)} size={90} label="적합도" /></div>
          <div className="mt-3 text-sm text-slate-600"><b>인재상</b> {target.values.join(' · ')}</div>
        </Card>
      </div>
    </div>
  )
}
