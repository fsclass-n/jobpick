import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { JOBS } from '../data/mock'
import { useApp } from '../state'
import { Check, Cover, Heart, Reveal, Tag, useCountUp } from '../components/ui'
import { NAV } from '../components/Layout'

const KW = ['SQL', 'Python', 'A/B 테스트', '데이터 기반 의사결정']

function CoverStory() {
  const { role } = useApp()
  const [go, setGo] = useState(false)
  const [linked, setLinked] = useState(false)
  useEffect(() => {
    const a = setTimeout(() => { setGo(true) }, 250)
    const b = setTimeout(() => { setLinked(true) }, 1400)
    return () => { clearTimeout(a); clearTimeout(b) }
  }, [])
  const score = useCountUp(87, 1700, linked)
  const card = (side) => `cover-card ${go ? 'translate-x-0 opacity-100' : side === 'l' ? '-translate-x-24 opacity-0' : 'translate-x-24 opacity-0'}`
  return (
    <section className="border-b border-ink">
      <div className="wrap grid lg:grid-cols-12">
        <div className="border-ink py-12 lg:col-span-7 lg:border-r lg:py-20 lg:pr-12">
          <div className="flex items-center gap-3"><span className="eyebrow">Issue 01</span><span className="h-px flex-1 bg-ink" /><span className="eyebrow">Winter 2026</span></div>
          <h1 className="display mt-8 text-[clamp(48px,8vw,112px)]">
            Pick your<br />next <em className="bg-[linear-gradient(transparent_58%,#d4ff3a_58%)] px-1 not-italic">chapter</em>.
          </h1>
          <p className="mt-8 max-w-lg text-lg leading-relaxed">
            공고를 고르는 서비스가 아니라, <b>합격까지의 거리</b>를 줄이는 서비스.
            RPA가 모은 공고를 AI가 읽고, 내 자소서와 맞대어 부족한 역량을 찾고, 문장을 고치고, 면접까지 연습시킵니다.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link to={role ? '/journey' : '/login'} className="bg-ink px-7 py-4 text-sm font-bold tracking-wider text-paper hover:bg-black">
              {role ? '내 여정으로 이동 →' : '무료로 체험 시작하기 →'}
            </Link>
            <a href="#journey" className="border border-ink px-7 py-4 text-sm font-bold tracking-wider hover:bg-pick">Pick 여정 보기</a>
          </div>
        </div>
        <div className="relative py-12 lg:col-span-5 lg:py-20 lg:pl-12" aria-label="공고 카드와 자소서 카드가 겹치며 일치 키워드가 연결되는 인터랙션">
          <div className="relative mx-auto h-[400px] max-w-sm">
            <div className={`absolute left-0 top-0 w-[58%] border border-ink bg-white ${card('l')}`}>
              <div className="eyebrow border-b border-ink bg-ink px-3 py-2 text-[9px] text-paper">Job posting</div>
              <div className="p-3">
                <div className="font-serif text-lg font-black">한빛데이터</div>
                <div className="mb-3 text-xs text-mute">데이터 분석가 · 신입</div>
                {KW.map((k) => <div key={k} className={`mb-1 border px-2 py-1 text-[11px] transition ${linked ? 'border-ink bg-pick' : 'border-line'}`}>{k}</div>)}
              </div>
            </div>
            <div className={`absolute right-0 top-16 w-[58%] border border-ink bg-white ${card('r')}`}>
              <div className="eyebrow border-b border-ink px-3 py-2 text-[9px]">My essay</div>
              <div className="p-3">
                <div className="font-serif text-lg font-black">김픽</div>
                <div className="mb-3 text-xs text-mute">지원 동기 · 문항 1</div>
                {KW.map((k) => <div key={k} className={`mb-1 border px-2 py-1 text-[11px] transition ${linked ? 'border-ink bg-pick' : 'border-line'}`}>{k}</div>)}
              </div>
            </div>
            {linked && (
              <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 384 400" aria-hidden>
                {[0, 1, 2, 3].map((i) => <line key={i} x1="222" y1={128 + i * 29} x2="162" y2={192 + i * 29} stroke="#141414" strokeWidth="1.5" strokeDasharray="4 3" className="cover-line" style={{ animationDelay: `${i * 0.12}s` }} />)}
              </svg>
            )}
            <div className="absolute bottom-0 left-1/2 flex w-[84%] -translate-x-1/2 items-center justify-between border border-ink bg-ink px-5 py-4 text-paper">
              <div>
                <div className="eyebrow text-[9px] text-paper/60">Pick score</div>
                <div className="font-serif text-5xl font-black">{score}<span className="text-xl">%</span></div>
              </div>
              {score >= 87 && <span className="cover-stamp grid h-16 w-16 place-items-center rounded-full border-2 border-pick text-[10px] font-black tracking-widest text-pick">PICK<br /><Check className="h-4 w-4" /></span>}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function JobLook({ j, i }) {
  const { scraps, toggleScrap, fitOf, role } = useApp()
  return (
    <article className="group">
      <div className="relative">
        <Link to={role ? '/match' : '/login'}>
          <Cover seed={i} label={j.company[0]}>
            <div className="absolute left-3 top-3 flex gap-1"><Tag tone="ink">{j.size}</Tag><Tag tone="pick">D-{10 + i * 3}</Tag></div>
          </Cover>
        </Link>
        <button onClick={() => toggleScrap(j.id)} aria-label="관심 공고" className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-paper/90">
          <Heart on={scraps.includes(j.id)} />
        </button>
      </div>
      <div className="mt-3">
        <div className="eyebrow text-[10px]">{j.company}</div>
        <div className="mt-1 truncate text-[15px] font-medium group-hover:underline">{j.title}</div>
        <div className="mt-1 flex items-baseline gap-2"><span className="font-serif text-xl font-black">{fitOf(j)}%</span><span className="text-xs text-mute">적합도 · {j.region}</span></div>
      </div>
    </article>
  )
}

export default function Home() {
  const kw = {}
  JOBS.forEach((j) => j.skills.forEach((s) => { kw[s] = (kw[s] || 0) + 1 }))
  const rank = Object.entries(kw).sort((a, b) => b[1] - a[1]).slice(0, 8)
  return (
    <>
      <CoverStory />

      <section id="journey" className="wrap scroll-mt-28 py-20">
        <Reveal className="flex items-end justify-between border-b border-ink pb-4">
          <h2 className="h-section">The Pick Journey</h2><span className="eyebrow hidden text-mute sm:block">4 chapters · 1 score</span>
        </Reveal>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['공고와 내 프로필을 대조해 적합도와 합격 거리를 계산합니다.'],
            ['관심 공고 N개가 공통으로 요구하는데 나에게 없는 역량을 주차별 계획으로.'],
            ['원문 vs AI 제안을 나란히. 고칠 때마다 점수가 움직입니다.'],
            ['자소서 약점에서 뽑은 압박·꼬리 질문으로 실전 연습.'],
          ].map(([d], i) => {
            const [to, no, en, ko] = NAV[i]
            return (
              <Reveal key={to} className={`border-b border-line sm:border-b-0 ${i ? 'lg:border-l' : ''} ${i % 2 ? 'sm:border-l' : ''} border-line`}>
                <Link to={to} className="group block p-6 hover:bg-white">
                  <div className="font-serif text-6xl font-black text-line transition group-hover:text-ink">{no}</div>
                  <div className="eyebrow mt-4 text-mute">{en}</div>
                  <div className="mt-1 text-xl font-bold">{ko}</div>
                  <p className="mt-2 text-sm leading-relaxed text-mute">{d}</p>
                  <div className="mt-4 text-sm font-semibold group-hover:underline">자세히 →</div>
                </Link>
              </Reveal>
            )
          })}
        </div>
      </section>

      <section className="border-y border-ink bg-white py-20">
        <div className="wrap">
          <Reveal className="flex items-end justify-between border-b border-ink pb-4">
            <h2 className="h-section">This Week&apos;s Picks</h2>
            <Link to="/match" className="text-sm font-semibold underline">전체 공고 보기</Link>
          </Reveal>
          <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:grid-cols-6">
            {JOBS.map((j, i) => <Reveal key={j.id}><JobLook j={j} i={i} /></Reveal>)}
          </div>
        </div>
      </section>

      <section className="wrap grid gap-12 py-20 lg:grid-cols-12">
        <Reveal className="lg:col-span-5">
          <div className="flex items-end justify-between border-b border-ink pb-4"><h2 className="h-section">Skill Ranking</h2><span className="eyebrow text-mute">데이터 직군</span></div>
          <ol>
            {rank.map(([k, c], i) => (
              <li key={k} className="flex items-center gap-4 border-b border-line py-3">
                <span className={`font-serif w-8 text-2xl font-black ${i < 3 ? '' : 'text-line'}`}>{i + 1}</span>
                <span className="flex-1 font-medium">{k}</span>
                <span className="text-xs text-mute">공고 {c}건</span>
              </li>
            ))}
          </ol>
        </Reveal>
        <Reveal className="lg:col-span-7">
          <div className="flex items-end justify-between border-b border-ink pb-4"><h2 className="h-section">Report Preview</h2><span className="eyebrow text-mute">sample</span></div>
          <div className="mt-6 grid border border-ink md:grid-cols-2">
            <div className="bg-ink p-8 text-paper">
              <div className="eyebrow text-paper/60">Pick score</div>
              <div className="font-serif text-8xl font-black text-pick">72</div>
              <p className="mt-4 text-sm text-paper/80">합격선까지 <b className="text-pick">8점</b>. 가장 큰 갭은 <b>A/B 테스트</b>입니다.</p>
            </div>
            <div className="bg-white p-8">
              <blockquote className="font-serif text-xl font-bold leading-snug">“열심히 하겠습니다”를<br />“이탈률 12% 개선”으로.</blockquote>
              <p className="mt-4 text-sm text-mute">리라이팅 스튜디오는 추상적인 문장을 공고 키워드와 정량 성과로 바꿔 제안합니다.</p>
              <Link to="/rewrite" className="mt-6 inline-block text-sm font-semibold underline">스튜디오 열기 →</Link>
            </div>
          </div>
        </Reveal>
      </section>
    </>
  )
}
