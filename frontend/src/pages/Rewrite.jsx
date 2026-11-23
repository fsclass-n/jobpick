import { useState } from 'react'
import JourneyBar from '../components/JourneyBar'
import { Btn, Chip, Highlight, PageHead, Ring, Tile, useCountUp } from '../components/ui'
import { useApp } from '../state'

export default function Rewrite() {
  const { essays, accepted, setAccepted, target, match } = useApp()
  const [i, setI] = useState(0)
  const [drafts, setDrafts] = useState({})
  const [versions, setVersions] = useState({})
  const fit = useCountUp(match)
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
      <PageHead step="Step 03 · Rewrite" title="리라이팅 스튜디오" desc={`목표 공고 ${target.company} · ${target.title} 기준으로 문항을 고쳐요.`}
        aside={<div className="flex items-center gap-3 rounded-full bg-white py-2 pl-2 pr-5 ring-1 ring-line"><Ring value={fit} size={48} stroke={12}><span className="num text-xs font-bold">{fit}</span></Ring><span className="text-sm font-semibold">서류 적합도</span></div>} />

      <div className="mb-4 flex gap-2 overflow-x-auto">
        {essays.map((q, k) => (
          <button key={q.id} onClick={() => setI(k)} className={`flex h-11 shrink-0 items-center gap-2 rounded-full px-5 text-sm font-semibold transition ${k === i ? 'bg-navy text-white' : 'bg-white ring-1 ring-line'}`}>
            문항 {k + 1} {accepted[q.id] && <span className="h-2 w-2 rounded-full bg-mint" />}
          </button>
        ))}
      </div>

      <Tile className="overflow-hidden">
        <div className="border-b border-line px-6 py-4 font-extrabold">{e.title}</div>
        <div className="grid md:grid-cols-2">
          <div className="border-b border-line p-6 md:border-b-0 md:border-r">
            <Chip tone="tie">원문</Chip>
            <p className="mt-4 leading-relaxed text-sub line-through decoration-tie/50">{e.original}</p>
          </div>
          <div className="bg-[#f3fdf9] p-6">
            <div className="flex items-start justify-between gap-3"><Chip tone="mint">AI 제안</Chip><span className="text-right text-[11px] text-sub">{e.reason}</span></div>
            <p className="mt-4 leading-relaxed"><Highlight text={e.suggestion} words={words} /></p>
            <div className="mt-6 flex gap-2">
              <Btn onClick={() => apply(true)} disabled={isOn}>수락하고 +3점</Btn>
              <Btn variant="soft" onClick={() => apply(false)} disabled={!isOn}>되돌리기</Btn>
            </div>
          </div>
        </div>
      </Tile>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_300px]">
        <Tile className="p-6">
          <div className="mb-3 flex items-center justify-between"><b>내 최종본</b><span className="text-xs text-sub">{text.length}자</span></div>
          <textarea value={text} onChange={(ev) => setDrafts({ ...drafts, [e.id]: ev.target.value })} rows={6} className="w-full rounded-3xl bg-bg p-5 text-sm leading-relaxed outline-none ring-1 ring-line focus:bg-white focus:ring-2 focus:ring-navy" aria-label="최종본" />
          <p className="mt-2 text-[11px] text-sub">PDF·이미지 업로드(OCR)는 백엔드 연동 후 활성화됩니다.</p>
        </Tile>
        <Tile className="p-6">
          <div className="text-xs font-semibold text-sub">공고 키워드 반영</div>
          <div className="num mt-1 text-4xl font-bold">{used.length}<span className="text-lg text-sub">/{words.length}</span></div>
          <div className="mt-3 flex flex-wrap gap-1">{words.map((w) => <Chip key={w} tone={used.includes(w) ? 'mint' : 'line'}>{w}</Chip>)}</div>
          {(versions[e.id] || []).length > 0 && (
            <div className="mt-5 border-t border-line pt-4">
              <div className="text-xs font-semibold text-sub">버전 이력</div>
              <ul className="mt-2 space-y-1 text-[11px] text-sub">{versions[e.id].map((v, k) => <li key={k}>v{k + 1} · {v.at} · {v.t.slice(0, 22)}…</li>)}</ul>
            </div>
          )}
        </Tile>
      </div>
    </div>
  )
}
