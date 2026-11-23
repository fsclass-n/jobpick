import { useState } from 'react'
import JourneyBar from '../components/JourneyBar'
import { Btn, Chip, PageHead, Tile } from '../components/ui'
import { IMG } from '../data/credits'
import { PERSONAS, QUESTIONS } from '../data/mock'
import { useApp } from '../state'

const FACES = { hr: IMG.office, lead: IMG.presenter, pressure: IMG.curly }

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
  const persona = PERSONAS.find((p) => p.id === pid)

  const start = (id) => {
    setPid(id); setInterview([]); setAns('')
    setChat([{ who: 'ai', text: QUESTIONS[id][0].q, kw: QUESTIONS[id][0].kw }])
  }
  const send = () => {
    if (!ans.trim() || !current) return
    const s = score(ans, current.kw)
    const fb = s >= 70 ? '구체적이고 직무와 연결된 답변입니다.' : `조금 추상적이에요. "${current.kw.slice(0, 2).join(', ')}" 같은 근거와 수치를 넣어 보세요.`
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
      <PageHead step="Step 04 · Rehearse" title="모의면접" desc="자소서의 약점과 공고 인재상에서 뽑은 질문이에요. 답변 점수가 면접 준비도(Pick Score 20%)에 반영됩니다." />
      <div className="grid gap-4 sm:grid-cols-3">
        {PERSONAS.map((p) => (
          <button key={p.id} onClick={() => start(p.id)} className={`group relative h-44 overflow-hidden rounded-[28px] text-left text-white transition hover:-translate-y-1 ${pid === p.id ? 'ring-4 ring-tie' : ''}`}>
            <img src={FACES[p.id]} alt="" className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-t from-navy/90 to-navy/10" />
            <div className="absolute bottom-4 left-5 right-5">
              <Chip tone={p.id === 'pressure' ? 'tie' : 'white'}>{p.tone}</Chip>
              <div className="mt-2 text-lg font-extrabold">{p.name}</div>
              <div className="text-xs text-white/70">{p.desc}</div>
            </div>
          </button>
        ))}
      </div>
      <Tile className="mt-4 p-6">
        {!pid ? <p className="py-12 text-center text-sm text-sub">면접관을 선택하면 세션이 시작됩니다.</p> : (
          <div className="space-y-4" aria-live="polite">
            {chat.map((m, k) => (
              <div key={k} className={`flex items-end gap-2 ${m.who === 'me' ? 'justify-end' : ''}`}>
                {m.who === 'ai' && <img src={FACES[pid]} alt="" className="h-8 w-8 rounded-full object-cover" />}
                <div className={`max-w-[80%] px-4 py-3 text-sm leading-relaxed ${m.who === 'ai' ? 'rounded-3xl rounded-bl-md bg-bg' : m.who === 'me' ? 'rounded-3xl rounded-br-md bg-navy text-white' : 'rounded-3xl bg-mint/15 text-navy'}`}>
                  {m.who === 'ai' && <div className="mb-1 text-[10px] font-bold text-sub">{persona.name} · {m.follow ? '꼬리 질문' : '질문'}</div>}
                  {m.who === 'fb' && <b className="num mr-2 text-lg">{m.score}점</b>}{m.text}
                </div>
              </div>
            ))}
            {done ? (
              <div className="flex items-center justify-between rounded-3xl bg-navy p-5 text-white"><span className="font-semibold">세션 완료</span><span className="num text-3xl font-bold">평균 {avg}점</span></div>
            ) : (
              <div className="flex gap-2 border-t border-line pt-4">
                <textarea value={ans} onChange={(e) => setAns(e.target.value)} rows={2} placeholder="답변을 입력하세요" className="flex-1 rounded-3xl bg-bg p-4 text-sm outline-none ring-1 ring-line focus:bg-white focus:ring-2 focus:ring-navy" aria-label="답변" />
                <Btn variant="tie" onClick={send} className="self-end">제출</Btn>
              </div>
            )}
          </div>
        )}
      </Tile>
    </div>
  )
}
