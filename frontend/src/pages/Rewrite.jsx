import { useState } from 'react'
import { JourneyTracker } from '../components/Layout'
import { Badge, Card, Highlight } from '../components/ui'
import { useApp } from '../state'

export default function Rewrite() {
  const { essays, accepted, setAccepted, target, match } = useApp()
  const [i, setI] = useState(0)
  const [drafts, setDrafts] = useState({})
  const [versions, setVersions] = useState({})
  const e = essays[i]
  const words = [...new Set([...e.keywords, ...target.skills, ...target.values])]
  const isOn = !!accepted[e.id]
  const text = drafts[e.id] ?? (isOn ? e.suggestion : e.original)

  const apply = (on) => {
    setVersions({ ...versions, [e.id]: [...(versions[e.id] || []), { t: text, at: new Date().toLocaleTimeString('ko-KR') }] })
    setAccepted({ ...accepted, [e.id]: on })
    setDrafts({ ...drafts, [e.id]: on ? e.suggestion : e.original })
  }
  const hit = words.filter((w) => text.includes(w)).length

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <JourneyTracker />
      <h1 className="font-display text-2xl font-extrabold">Rewrite · 리라이팅 스튜디오</h1>
      <p className="mb-4 text-sm text-slate-500">목표 공고: {target.company} {target.title}. 제안을 수락하면 적합도가 올라갑니다 (현재 {match}%).</p>
      <div className="mb-4 flex flex-wrap gap-2">
        {essays.map((q, k) => (
          <button key={q.id} onClick={() => setI(k)} className={`rounded-xl border px-3 py-2 text-sm ${k === i ? 'border-brand bg-indigo-50 text-brand' : 'bg-white'}`}>
            문항 {k + 1} {accepted[q.id] && '✓'}
          </button>
        ))}
      </div>
      <h2 className="mb-3 font-bold">{e.title}</h2>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <div className="mb-2 flex items-center justify-between"><Badge tone="red">원문</Badge></div>
          <p className="text-sm leading-relaxed text-slate-700">{e.original}</p>
        </Card>
        <Card className="border-emerald-200">
          <div className="mb-2 flex items-center justify-between"><Badge tone="green">AI 제안</Badge><span className="text-xs text-slate-400">{e.reason}</span></div>
          <p className="text-sm leading-relaxed text-slate-700"><Highlight text={e.suggestion} words={words} /></p>
          <div className="mt-3 flex gap-2">
            <button onClick={() => apply(true)} disabled={isOn} className="rounded-lg bg-emerald-500 px-3 py-1.5 text-sm text-white disabled:opacity-40">수락</button>
            <button onClick={() => apply(false)} disabled={!isOn} className="rounded-lg border px-3 py-1.5 text-sm disabled:opacity-40">되돌리기</button>
          </div>
        </Card>
      </div>
      <Card className="mt-4">
        <div className="mb-2 flex items-center justify-between"><b>내 최종본</b><span className="text-xs text-slate-500">공고 키워드 {hit}/{words.length} 반영 · {text.length}자</span></div>
        <textarea value={text} onChange={(ev) => setDrafts({ ...drafts, [e.id]: ev.target.value })} rows={5} className="w-full rounded-xl border p-3 text-sm" aria-label="최종본" />
        <div className="mt-2 text-xs text-slate-500">반영 키워드: <Highlight text={words.filter((w) => text.includes(w)).join(', ') || '없음'} words={[]} /></div>
        <div className="mt-3 text-xs text-slate-400">파일 업로드(PDF·이미지 OCR)는 백엔드 연동 후 활성화됩니다.</div>
      </Card>
      {(versions[e.id] || []).length > 0 && (
        <Card className="mt-4">
          <b className="text-sm">버전 이력</b>
          <ul className="mt-2 space-y-1 text-xs text-slate-500">{versions[e.id].map((v, k) => <li key={k}>v{k + 1} · {v.at} · {v.t.slice(0, 40)}…</li>)}</ul>
        </Card>
      )}
    </div>
  )
}
