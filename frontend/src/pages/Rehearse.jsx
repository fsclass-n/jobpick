import { useState } from 'react'
import { JourneyTracker } from '../components/Layout'
import { Badge, Card } from '../components/ui'
import { PERSONAS, QUESTIONS } from '../data/mock'
import { useApp } from '../state'

function score(answer, kw) {
  const hits = kw.filter((k) => answer.includes(k)).length
  const num = /\d/.test(answer) ? 15 : 0
  const len = Math.min(35, Math.floor(answer.length / 4))
  return Math.min(100, 20 + hits * 10 + num + len)
}

export default function Rehearse() {
  const { interview, setInterview } = useApp()
  const [pid, setPid] = useState('hr')
  const [chat, setChat] = useState([])
  const [ans, setAns] = useState('')
  const qs = QUESTIONS[pid]
  const idx = chat.filter((m) => m.who === 'me' && !m.follow).length
  const current = chat.length && chat[chat.length - 1].who === 'ai' ? chat[chat.length - 1] : null

  const start = (id) => {
    setPid(id); setInterview([]); setAns('')
    setChat([{ who: 'ai', text: QUESTIONS[id][0].q, kw: QUESTIONS[id][0].kw }])
  }
  const send = () => {
    if (!ans.trim() || !current) return
    const s = score(ans, current.kw)
    const fb = s >= 70 ? '구체적이고 직무와 연결된 답변입니다.' : `답변이 추상적입니다. "${current.kw.slice(0, 2).join(', ')}" 같은 근거와 수치를 넣어 보세요.`
    const next = [...chat, { who: 'me', text: ans, follow: current.follow }, { who: 'fb', text: fb, score: s }]
    setInterview([...interview, s])
    if (s < 70 && !current.follow) next.push({ who: 'ai', follow: true, text: '그 부분을 구체적인 사례와 수치로 다시 설명해 주시겠어요?', kw: current.kw })
    else if (idx + 1 < qs.length && !current.follow) next.push({ who: 'ai', text: qs[idx + 1].q, kw: qs[idx + 1].kw })
    else if (current.follow && idx + 1 < qs.length) next.push({ who: 'ai', text: qs[idx + 1].q, kw: qs[idx + 1].kw })
    setChat(next); setAns('')
  }
  const done = chat.length > 0 && !current
  const avg = interview.length ? Math.round(interview.reduce((a, b) => a + b, 0) / interview.length) : 0

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <JourneyTracker />
      <h1 className="font-display text-2xl font-extrabold">Rehearse · 모의면접</h1>
      <p className="mb-4 text-sm text-slate-500">자소서의 약점과 공고 인재상에서 뽑은 질문입니다. 답변 점수가 면접 준비도(Pick Score 20%)에 반영됩니다.</p>
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        {PERSONAS.map((p) => (
          <button key={p.id} onClick={() => start(p.id)} className={`rounded-2xl border bg-white p-4 text-left transition hover:shadow-md ${pid === p.id && chat.length ? 'ring-2 ring-brand' : ''}`}>
            <div className="font-bold">{p.name}</div><div className="text-xs text-slate-500">{p.desc}</div><Badge tone={p.id === 'pressure' ? 'red' : 'brand'}>{p.tone}</Badge>
          </button>
        ))}
      </div>
      <Card>
        {chat.length === 0 ? <p className="text-sm text-slate-500">면접관을 선택하면 시작합니다.</p> : (
          <div className="space-y-3" aria-live="polite">
            {chat.map((m, k) => (
              <div key={k} className={m.who === 'me' ? 'text-right' : ''}>
                <span className={`inline-block max-w-[85%] rounded-2xl px-4 py-2 text-left text-sm ${m.who === 'ai' ? 'bg-indigo-50' : m.who === 'me' ? 'bg-brand text-white' : 'bg-amber-50 text-amber-800'}`}>
                  {m.who === 'fb' && <b>{m.score}점 · </b>}{m.text}
                </span>
              </div>
            ))}
            {done ? <div className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">세션 종료 · 평균 {avg}점</div> : (
              <div className="flex gap-2">
                <textarea value={ans} onChange={(e) => setAns(e.target.value)} rows={2} placeholder="답변을 입력하세요" className="flex-1 rounded-xl border p-3 text-sm" />
                <button onClick={send} className="rounded-xl bg-brand px-5 text-sm text-white">제출</button>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  )
}
