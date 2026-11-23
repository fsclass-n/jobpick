import { useState } from 'react'
import { JourneyBar } from '../components/Layout'
import { Btn, PageHead, Panel, Tag } from '../components/ui'
import { PERSONAS, QUESTIONS } from '../data/mock'
import { useApp } from '../state'

function score(answer, kw) {
  const hits = kw.filter((k) => answer.includes(k)).length
  return Math.min(100, 20 + hits * 10 + (/\d/.test(answer) ? 15 : 0) + Math.min(35, Math.floor(answer.length / 4)))
}

export default function Rehearse() {
  const { interview, setInterview } = useApp()
  const [pid, setPid] = useState(null)
  const [chat, setChat] = useState([])
  const [ans, setAns] = useState('')
  const qs = pid ? QUESTIONS[pid] : []
  const idx = chat.filter((m) => m.who === 'me' && !m.follow).length
  const last = chat[chat.length - 1]
  const current = last && last.who === 'ai' ? last : null

  const start = (id) => {
    setPid(id); setInterview([]); setAns('')
    setChat([{ who: 'ai', text: QUESTIONS[id][0].q, kw: QUESTIONS[id][0].kw }])
  }
  const send = () => {
    if (!ans.trim() || !current) return
    const s = score(ans, current.kw)
    const fb = s >= 70 ? '구체적이고 직무와 연결된 답변입니다.' : `추상적입니다. "${current.kw.slice(0, 2).join(', ')}" 같은 근거와 수치를 넣어 보세요.`
    const next = [...chat, { who: 'me', text: ans, follow: current.follow }, { who: 'fb', text: fb, score: s }]
    setInterview([...interview, s])
    if (s < 70 && !current.follow) next.push({ who: 'ai', follow: true, text: '그 부분을 구체적인 사례와 수치로 다시 설명해 주시겠어요?', kw: current.kw })
    else if (idx + 1 < qs.length) next.push({ who: 'ai', text: qs[idx + 1].q, kw: qs[idx + 1].kw })
    setChat(next); setAns('')
  }
  const done = chat.length > 0 && !current
  const avg = interview.length ? Math.round(interview.reduce((a, b) => a + b, 0) / interview.length) : 0

  return (
    <div className="wrap pb-10">
      <JourneyBar />
      <PageHead no="04" en="Rehearse" ko="모의면접" desc="자소서의 약점과 공고 인재상에서 뽑은 질문입니다. 답변 점수가 면접 준비도(Pick Score 20%)에 반영됩니다." />
      <div className="mt-8 grid border border-ink sm:grid-cols-3">
        {PERSONAS.map((p, k) => (
          <button key={p.id} onClick={() => start(p.id)} className={`p-6 text-left transition ${k ? 'border-t border-ink sm:border-l sm:border-t-0' : ''} ${pid === p.id ? 'bg-ink text-paper' : 'bg-white hover:bg-pick'}`}>
            <div className="eyebrow text-[10px] opacity-60">Interviewer 0{k + 1}</div>
            <div className="font-serif mt-2 text-xl font-black">{p.name}</div>
            <div className="mt-1 text-sm opacity-70">{p.desc}</div>
            <div className="mt-3"><Tag tone={p.id === 'pressure' ? 'alert' : pid === p.id ? 'pick' : 'line'}>{p.tone}</Tag></div>
          </button>
        ))}
      </div>
      <Panel className="mt-6 p-6">
        {!pid ? <p className="py-10 text-center text-sm text-mute">면접관을 선택하면 세션이 시작됩니다.</p> : (
          <div className="space-y-4" aria-live="polite">
            {chat.map((m, k) => (
              <div key={k} className={m.who === 'me' ? 'flex justify-end' : 'flex'}>
                <div className={`max-w-[85%] px-4 py-3 text-sm leading-relaxed ${m.who === 'ai' ? 'border border-ink bg-paper' : m.who === 'me' ? 'bg-ink text-paper' : 'bg-pick'}`}>
                  {m.who === 'ai' && <div className="eyebrow mb-1 text-[9px] text-mute">{m.follow ? 'Follow-up' : 'Question'}</div>}
                  {m.who === 'fb' && <b className="font-serif mr-2 text-lg">{m.score}</b>}{m.text}
                </div>
              </div>
            ))}
            {done ? (
              <div className="flex items-center justify-between border-t border-ink pt-4"><span className="eyebrow">Session complete</span><span className="font-serif text-3xl font-black">평균 {avg}점</span></div>
            ) : (
              <div className="flex gap-2 border-t border-line pt-4">
                <textarea value={ans} onChange={(e) => setAns(e.target.value)} rows={2} placeholder="답변을 입력하세요" className="flex-1 border border-line bg-paper p-3 text-sm outline-none focus:border-ink" aria-label="답변" />
                <Btn onClick={send}>제출</Btn>
              </div>
            )}
          </div>
        )}
      </Panel>
    </div>
  )
}
