import { useState } from 'react'
import { JourneyBar } from '../components/Layout'
import { Btn, Highlight, PageHead, Panel, Tag } from '../components/ui'
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
  const used = words.filter((w) => text.includes(w))

  const apply = (on) => {
    setVersions({ ...versions, [e.id]: [...(versions[e.id] || []), { t: text, at: new Date().toLocaleTimeString('ko-KR') }] })
    setAccepted({ ...accepted, [e.id]: on })
    setDrafts({ ...drafts, [e.id]: on ? e.suggestion : e.original })
  }

  return (
    <div className="wrap pb-10">
      <JourneyBar />
      <PageHead no="03" en="Rewrite" ko="리라이팅 스튜디오" desc={`목표 공고 ${target.company} · ${target.title}. 제안을 수락하면 서류 적합도가 올라갑니다.`}>
        <div className="text-right"><div className="eyebrow text-mute">Fit</div><div className="font-serif text-5xl font-black">{match}%</div></div>
      </PageHead>

      <div className="mt-6 flex overflow-x-auto border-b border-ink">
        {essays.map((q, k) => (
          <button key={q.id} onClick={() => setI(k)} className={`whitespace-nowrap px-5 py-3 text-sm font-semibold ${k === i ? 'bg-ink text-paper' : 'hover:bg-line'}`}>
            Q{k + 1} {accepted[q.id] && <span className="ml-1 text-pick">●</span>}
          </button>
        ))}
      </div>
      <h2 className="font-serif mt-6 text-2xl font-black">{e.title}</h2>

      <div className="mt-4 grid border border-ink md:grid-cols-2">
        <div className="border-b border-ink p-6 md:border-b-0 md:border-r">
          <Tag tone="mute">ORIGINAL</Tag>
          <p className="mt-4 leading-relaxed text-mute line-through decoration-alert/60">{e.original}</p>
        </div>
        <div className="bg-white p-6">
          <div className="flex items-center justify-between gap-2"><Tag tone="pick">AI SUGGESTION</Tag><span className="text-right text-[11px] text-mute">{e.reason}</span></div>
          <p className="mt-4 leading-relaxed"><Highlight text={e.suggestion} words={words} /></p>
          <div className="mt-6 flex gap-2">
            <Btn onClick={() => apply(true)} disabled={isOn} className="px-4 py-2">수락</Btn>
            <Btn variant="line" onClick={() => apply(false)} disabled={!isOn} className="px-4 py-2">되돌리기</Btn>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_280px]">
        <Panel className="p-6">
          <div className="mb-3 flex items-center justify-between"><span className="eyebrow">My final draft</span><span className="text-xs text-mute">{text.length}자</span></div>
          <textarea value={text} onChange={(ev) => setDrafts({ ...drafts, [e.id]: ev.target.value })} rows={6} className="w-full border border-line bg-paper p-4 text-sm leading-relaxed outline-none focus:border-ink" aria-label="최종본" />
          <p className="mt-2 text-[11px] text-mute">PDF·이미지 업로드(OCR)는 백엔드 연동 후 활성화됩니다.</p>
        </Panel>
        <Panel className="p-6">
          <div className="eyebrow">Keywords</div>
          <div className="font-serif mt-1 text-4xl font-black">{used.length}<span className="text-lg text-mute">/{words.length}</span></div>
          <div className="mt-3 flex flex-wrap gap-1">{words.map((w) => <Tag key={w} tone={used.includes(w) ? 'pick' : 'line'}>{w}</Tag>)}</div>
          {(versions[e.id] || []).length > 0 && (
            <div className="mt-6 border-t border-line pt-4">
              <div className="eyebrow mb-2">Versions</div>
              <ul className="space-y-1 text-[11px] text-mute">{versions[e.id].map((v, k) => <li key={k}>v{k + 1} · {v.at} · {v.t.slice(0, 24)}…</li>)}</ul>
            </div>
          )}
        </Panel>
      </div>
    </div>
  )
}
