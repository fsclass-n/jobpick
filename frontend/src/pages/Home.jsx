import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { JOBS } from '../data/mock'
import { useApp } from '../state'
import { Badge, Card, Check, Gauge, Reveal, useCountUp } from '../components/ui'

const KW = ['SQL', 'Python', '데이터 기반 의사결정', 'A/B 테스트']

function Hero() {
  const [go, setGo] = useState(false)
  const [linked, setLinked] = useState(false)
  useEffect(() => {
    const a = setTimeout(() => setGo(true), 300)
    const b = setTimeout(() => setLinked(true), 1500)
    return () => { clearTimeout(a); clearTimeout(b) }
  }, [])
  const score = useCountUp(87, 1800, linked)
  const side = (dir) => `hero-card ${go ? 'translate-x-0 opacity-100' : dir === 'l' ? '-translate-x-32 opacity-0' : 'translate-x-32 opacity-0'}`
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-indigo-50 to-slate-50">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 lg:grid-cols-2 lg:py-24">
        <div>
          <Badge tone="brand">공고 매칭 · 갭 로드맵 · 리라이팅 · 모의면접</Badge>
          <h1 className="font-display mt-4 text-4xl font-extrabold leading-tight sm:text-5xl">
            합격까지의 <span className="text-brand">거리</span>를<br />줄여 드립니다
          </h1>
          <p className="mt-4 max-w-md text-slate-600">
            RPA가 모은 공고를 AI가 읽고, 내 자소서와 맞대어 부족한 역량을 찾고, 문항을 고치고, 면접까지 연습시켜요.
            모든 과정이 하나의 <b>Pick Score</b>로 이어집니다.
          </p>
          <Cta />
        </div>
        <div className="relative mx-auto h-[340px] w-full max-w-md" aria-label="공고 카드와 자소서 카드가 겹쳐 키워드가 연결되는 애니메이션">
          <div className={`absolute left-0 top-6 w-44 rounded-2xl border bg-white p-4 shadow-lg ${side('l')}`}>
            <div className="text-xs text-slate-400">채용 공고</div>
            <div className="font-bold">한빛데이터</div>
            <div className="mb-3 text-xs text-slate-500">데이터 분석가</div>
            {KW.map((k) => <div key={k} className={`mb-1 rounded px-2 py-1 text-xs ${linked ? 'bg-amber-200' : 'bg-slate-100'} transition`}>{k}</div>)}
          </div>
          <div className={`absolute right-0 top-14 w-44 rounded-2xl border bg-white p-4 shadow-lg ${side('r')}`}>
            <div className="text-xs text-slate-400">내 자소서</div>
            <div className="font-bold">김픽</div>
            <div className="mb-3 text-xs text-slate-500">지원 동기</div>
            {KW.map((k) => <div key={k} className={`mb-1 rounded px-2 py-1 text-xs ${linked ? 'bg-amber-200' : 'bg-slate-100'} transition`}>{k}</div>)}
          </div>
          {linked && (
            <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 400 340" aria-hidden>
              {[0, 1, 2, 3].map((i) => <line key={i} x1="176" y1={133 + i * 29} x2="224" y2={153 + i * 29} stroke="#4f46e5" strokeWidth="2" className="hero-line" style={{ animationDelay: `${i * 0.15}s` }} />)}
            </svg>
          )}
          <div className="absolute bottom-0 left-1/2 flex -translate-x-1/2 items-center gap-3 rounded-2xl border bg-white px-5 py-3 shadow-xl">
            <Gauge value={score} size={64} />
            <div>
              <div className="text-xs text-slate-500">Pick Score</div>
              <div className="font-display text-xl font-extrabold">{score}%</div>
            </div>
            {score >= 87 && <span className="hero-pick grid h-9 w-9 place-items-center rounded-full bg-emerald-500 text-white"><Check /></span>}
          </div>
        </div>
      </div>
    </section>
  )
}

function Cta() {
  const { role } = useApp()
  return (
    <div className="mt-8 flex flex-wrap gap-3">
      <Link to={role ? '/journey' : '/login'} className="rounded-xl bg-brand px-6 py-3 font-medium text-white shadow hover:bg-indigo-700">
        {role ? '내 여정으로 이동' : '무료로 체험 시작하기'}
      </Link>
      <a href="#journey" className="rounded-xl border border-slate-300 bg-white px-6 py-3 font-medium hover:bg-slate-50">Pick 여정 보기</a>
    </div>
  )
}

const STEPS = [
  ['01', 'Match', '공고 매칭', '수집 공고와 내 프로필을 대조해 적합도와 합격 거리를 계산합니다.', '/match'],
  ['02', 'Gap', '갭 로드맵', '관심 공고 N개가 공통으로 요구하는데 내게 없는 역량을 집계해 주차별 계획으로 바꿉니다.', '/gap'],
  ['03', 'Rewrite', '리라이팅 스튜디오', '문항별 원문 vs AI 제안 diff. 고칠 때마다 점수가 변합니다.', '/rewrite'],
  ['04', 'Rehearse', '모의면접', '자소서의 약점에서 압박·꼬리 질문을 만들어 답변을 채점합니다.', '/rehearse'],
]

export default function Home() {
  const kw = {}
  JOBS.forEach((j) => j.skills.forEach((s) => (kw[s] = (kw[s] || 0) + 1)))
  const top = Object.entries(kw).sort((a, b) => b[1] - a[1]).slice(0, 8)
  return (
    <>
      <Hero />
      <section id="journey" className="mx-auto max-w-6xl scroll-mt-20 px-4 pt-20">
        <Reveal>
          <h2 className="font-display text-3xl font-extrabold">하나의 Pick 여정, 네 단계</h2>
          <p className="mt-2 text-slate-600">공고 하나를 분석하고 끝나는 서비스가 아닙니다. 단계마다 점수가 쌓입니다.</p>
        </Reveal>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(([n, en, ko, d, to]) => (
            <Reveal key={n}>
              <Link to={to}><Card className="h-full hover:-translate-y-1">
                <div className="font-display text-sm font-bold text-brand">{n} · {en}</div>
                <div className="mt-1 text-lg font-bold">{ko}</div>
                <p className="mt-2 text-sm text-slate-600">{d}</p>
              </Card></Link>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-20 grid max-w-6xl gap-8 px-4 lg:grid-cols-3">
        <Reveal className="lg:col-span-2">
          <h2 className="font-display text-2xl font-extrabold">최근 수집 공고</h2>
          <div className="mt-4 space-y-3">
            {JOBS.slice(0, 4).map((j) => (
              <Card key={j.id} className="flex items-center justify-between gap-3">
                <div><div className="font-bold">{j.title}</div><div className="text-sm text-slate-500">{j.company} · {j.region} · {j.career}</div></div>
                <Badge tone="slate">{j.source}</Badge>
              </Card>
            ))}
          </div>
        </Reveal>
        <Reveal>
          <h2 className="font-display text-2xl font-extrabold">직무별 인기 키워드</h2>
          <Card className="mt-4">
            <div className="mb-2 text-xs text-slate-500">데이터 분석 직군 · 공고 노출 횟수</div>
            <div className="flex flex-wrap gap-2">{top.map(([k, c]) => <Badge key={k} tone="brand">{k} {c}</Badge>)}</div>
          </Card>
          <h2 className="font-display mt-6 text-2xl font-extrabold">리포트 샘플</h2>
          <Card className="mt-4 flex items-center gap-4"><Gauge value={72} size={80} label="Pick" /><div className="text-sm text-slate-600">합격선까지 <b>8점</b>. 가장 큰 갭은 <b>A/B 테스트</b> 역량입니다.</div></Card>
        </Reveal>
      </section>
    </>
  )
}
