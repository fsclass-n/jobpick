import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { IMG } from '../data/credits'
import { JOBS, PROFILE } from '../data/mock'
import { useApp } from '../state'
import { Btn, Chip, Icon, Monogram, Radar, Reveal, Ring, Tile, useCountUp } from '../components/ui'

const THRESHOLD = 110

function SwipeDeck() {
  const { fitOf, scraps, toggleScrap, coverage, role } = useApp()
  const [idx, setIdx] = useState(0)
  const [log, setLog] = useState([])
  const [drag, setDrag] = useState({ x: 0, active: false })
  const [fly, setFly] = useState(null)
  const start = useRef(0)
  const box = useRef(null)
  const cov = useCountUp(coverage)
  const done = idx >= JOBS.length
  const picks = log.filter((l) => l.dir === 'pick').length

  const decide = (dir) => {
    if (done || fly) return
    const job = JOBS[idx]
    const has = scraps.includes(job.id)
    if ((dir === 'pick') !== has) toggleScrap(job.id)
    setFly(dir)
    setTimeout(() => {
      setLog((l) => [...l, { id: job.id, dir, had: has }])
      setIdx((i) => i + 1)
      setFly(null)
      setDrag({ x: 0, active: false })
    }, 260)
  }
  const undo = () => {
    const last = log.at(-1)
    if (!last) return
    if (scraps.includes(last.id) !== last.had) toggleScrap(last.id)
    setLog((l) => l.slice(0, -1))
    setIdx((i) => i - 1)
  }
  const onDown = (e) => { if (fly) return; start.current = e.clientX; setDrag({ x: 0, active: true }); e.currentTarget.setPointerCapture(e.pointerId) }
  const onMove = (e) => { if (drag.active) setDrag({ x: e.clientX - start.current, active: true }) }
  const onUp = () => {
    if (!drag.active) return
    if (Math.abs(drag.x) > THRESHOLD) decide(drag.x > 0 ? 'pick' : 'pass')
    else setDrag({ x: 0, active: false })
  }
  useEffect(() => {
    const el = box.current
    const key = (e) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); decide('pick') }
      if (e.key === 'ArrowLeft') { e.preventDefault(); decide('pass') }
    }
    el?.addEventListener('keydown', key)
    return () => el?.removeEventListener('keydown', key)
  })

  const x = fly ? (fly === 'pick' ? 600 : -600) : drag.x
  const hint = fly || (drag.x > 40 ? 'pick' : drag.x < -40 ? 'pass' : null)

  return (
    <div ref={box} tabIndex={0} aria-label="오늘의 공고 카드. 왼쪽 방향키 패스, 오른쪽 방향키 Pick" className="relative mx-auto w-full max-w-[400px] outline-none">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="kicker text-tie">Today&apos;s deck</div>
          <div className="text-sm font-semibold">오늘의 공고 {Math.min(idx + 1, JOBS.length)} / {JOBS.length}</div>
        </div>
        <div className="flex items-center gap-3 rounded-full bg-white py-1.5 pl-1.5 pr-4 shadow-sm ring-1 ring-line">
          <Ring value={cov} size={36} stroke={12}><span className="num text-[10px] font-bold">{cov}</span></Ring>
          <div className="text-[11px] leading-tight"><b>역량 커버리지</b><br /><span className="text-sub">Pick {picks}건 반영</span></div>
        </div>
      </div>

      <div className="relative h-[440px] select-none">
        {done ? (
          <div className="pop tile flex h-full flex-col items-center justify-center p-8 text-center">
            <div className="grid h-16 w-16 place-items-center rounded-full bg-mint text-navy">{Icon.check('h-8 w-8')}</div>
            <div className="mt-5 text-2xl font-extrabold">오늘의 Pick 완료</div>
            <p className="mt-2 text-sm text-sub">{picks}개 공고를 골랐어요. 고른 공고들이 공통으로 요구하는 역량을 분석해 드릴게요.</p>
            <div className="mt-6 flex gap-2">
              <Link to={role ? '/gap' : '/login'} className="inline-flex h-11 items-center gap-2 rounded-full bg-navy px-5 text-sm font-semibold text-white">갭 분석 보기 {Icon.arrow()}</Link>
              <Btn variant="soft" onClick={() => { setIdx(0); setLog([]) }}>다시 보기</Btn>
            </div>
          </div>
        ) : JOBS.slice(idx, idx + 3).reverse().map((j, k, arr) => {
          const depth = arr.length - 1 - k
          const top = depth === 0
          const fit = fitOf(j)
          const owned = PROFILE.skills
          return (
            <article key={j.id}
              onPointerDown={top ? onDown : undefined} onPointerMove={top ? onMove : undefined} onPointerUp={top ? onUp : undefined} onPointerCancel={top ? onUp : undefined}
              className={`tile absolute inset-0 flex flex-col overflow-hidden ${top ? 'cursor-grab touch-pan-y active:cursor-grabbing' : ''}`}
              style={{
                transform: top ? `translateX(${x}px) rotate(${x / 18}deg)` : `translateY(${depth * 14}px) scale(${1 - depth * 0.05})`,
                transition: drag.active && !fly ? 'none' : 'transform .3s cubic-bezier(.22,1,.36,1)',
                zIndex: 10 - depth,
                opacity: depth > 1 ? 0.6 : 1,
              }}>
              <div className="relative h-36 shrink-0 bg-gradient-to-br from-sky via-white to-[#ffe6e0] p-5">
                <div className="flex items-start justify-between">
                  <Monogram name={j.company} seed={j.id} className="h-14 w-14 text-2xl shadow-sm" />
                  <Chip tone="white">{j.source}</Chip>
                </div>
                <div className="absolute bottom-4 left-5 flex gap-1"><Chip tone="navy">{j.size}</Chip><Chip tone="white">마감 {j.deadline}</Chip></div>
                {top && hint === 'pick' && <span className="stamp absolute right-5 top-16 rounded-xl border-4 border-mint px-3 py-1 text-2xl font-black text-mint">PICK</span>}
                {top && hint === 'pass' && <span className="stamp absolute right-5 top-16 rounded-xl border-4 border-tie px-3 py-1 text-2xl font-black text-tie">PASS</span>}
              </div>
              <div className="flex flex-1 flex-col p-5">
                <div className="text-xs font-semibold text-sub">{j.company} · {j.region} · {j.career}</div>
                <div className="mt-1 text-xl font-extrabold leading-snug">{j.title}</div>
                <div className="mt-4 flex items-center gap-4">
                  <Ring value={fit} size={64} stroke={11} label="적합도" />
                  <p className="text-sm leading-relaxed text-sub">요구역량 {j.skills.length}개 중 <b className="text-navy">{j.skills.filter((s) => owned.includes(s)).length}개</b>를 이미 갖추고 있어요.</p>
                </div>
                <div className="mt-auto flex flex-wrap gap-1.5 pt-4">
                  {j.skills.map((s) => <Chip key={s} tone={owned.includes(s) ? 'mint' : 'tie'}>{owned.includes(s) ? '✓' : '+'} {s}</Chip>)}
                </div>
              </div>
            </article>
          )
        })}
      </div>

      <div className="mt-6 flex items-center justify-center gap-4">
        <button onClick={() => decide('pass')} disabled={done} aria-label="패스" className="grid h-16 w-16 place-items-center rounded-full bg-white text-tie shadow-lg ring-1 ring-line transition hover:scale-105 disabled:opacity-30">{Icon.x('h-7 w-7')}</button>
        <button onClick={undo} disabled={!log.length} aria-label="되돌리기" className="grid h-11 w-11 place-items-center rounded-full bg-white text-sub shadow ring-1 ring-line transition hover:scale-105 disabled:opacity-30">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 14L4 9l5-5" /><path d="M4 9h11a5 5 0 0 1 0 10h-3" /></svg>
        </button>
        <button onClick={() => decide('pick')} disabled={done} aria-label="Pick" className="grid h-16 w-16 place-items-center rounded-full bg-mint text-navy shadow-lg transition hover:scale-105 disabled:opacity-30">{Icon.check('h-7 w-7')}</button>
      </div>
      <p className="mt-3 text-center text-[11px] text-sub">카드를 좌우로 밀거나 ← → 키를 눌러 보세요</p>
    </div>
  )
}

function Hero() {
  const { role } = useApp()
  return (
    <section className="relative overflow-hidden">
      <div className="blob -left-24 top-10 h-72 w-72 bg-[#c9ceff]" />
      <div className="blob right-0 top-40 h-80 w-80 bg-[#ffd2c7]" />
      <div className="blob bottom-0 left-1/3 h-64 w-64 bg-[#b9f3e1]" />
      <div className="wrap relative grid items-center gap-14 py-14 lg:grid-cols-[1.1fr_1fr] lg:py-20">
        <div>
          <Chip tone="white" className="shadow-sm ring-1 ring-line"><span className="h-2 w-2 rounded-full bg-mint" /> RPA가 오늘 160개 공고를 모았어요</Chip>
          <h1 className="mt-6 text-[clamp(40px,6vw,76px)] font-extrabold leading-[1.08] tracking-[-0.04em]">
            오늘의 공고,<br /><span className="relative inline-block">넘기고<svg viewBox="0 0 200 20" className="absolute -bottom-2 left-0 w-full" aria-hidden><path d="M3 14 Q100 2 197 12" fill="none" stroke="#ff5a3c" strokeWidth="6" strokeLinecap="round" /></svg></span> 고르세요.
          </h1>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-sub">
            마음에 드는 공고는 오른쪽으로. 고를수록 AI가 <b className="text-navy">부족한 역량</b>을 찾고, 자소서를 고치고, 면접까지 연습시켜 <b className="text-navy">합격까지의 거리</b>를 줄여 줍니다.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link to={role ? '/journey' : '/login'} className="inline-flex h-14 items-center gap-2 rounded-full bg-tie px-7 font-semibold text-white shadow-[0_14px_30px_-12px_rgba(255,90,60,.9)] hover:brightness-110">
              {role ? '내 여정 이어가기' : '무료로 시작하기'} {Icon.arrow()}
            </Link>
            <div className="flex items-center gap-3">
              <div className="flex -space-x-3">
                {[IMG.curly, IMG.office, IMG.hero].map((s) => <img key={s} src={s} alt="" className="h-10 w-10 rounded-full object-cover ring-2 ring-bg" />)}
              </div>
              <div className="text-xs leading-tight text-sub"><b className="text-sm text-navy">가입 없이 1분</b><br />샘플 데이터로 체험</div>
            </div>
          </div>
        </div>
        <SwipeDeck />
      </div>
    </section>
  )
}

function Bento() {
  const { target } = useApp()
  const bars = [['A/B 테스트', 2], ['Power BI', 1], ['ETL', 1], ['GA4', 1]]
  return (
    <section className="wrap py-16">
      <Reveal className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="kicker text-tie">How it works</div>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">고르면, 나머지는 jobpick이.</h2>
        </div>
        <p className="max-w-sm text-sm text-sub">Pick한 공고는 네 단계를 거쳐 하나의 Pick Score로 이어집니다.</p>
      </Reveal>
      <div className="grid auto-rows-[minmax(180px,auto)] gap-4 md:grid-cols-6 lg:grid-cols-12">
        <Reveal className="md:col-span-6 lg:col-span-7 lg:row-span-2">
          <Link to="/rehearse" className="group relative block h-full min-h-[380px] overflow-hidden rounded-[28px]">
            <img src={IMG.handshake} alt="면접관과 지원자가 악수하는 모습" className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-t from-navy/90 via-navy/30 to-transparent" />
            <div className="absolute left-6 right-6 top-6 space-y-2">
              <div className="glass max-w-[80%] rounded-3xl rounded-tl-md px-4 py-3 text-sm">자소서에 “열심히”가 많은데, 성과를 수치로 말해 볼까요?</div>
              <div className="ml-auto max-w-[75%] rounded-3xl rounded-tr-md bg-mint px-4 py-3 text-sm font-medium text-navy">이탈 구간 분석으로 재작업을 40% 줄였습니다.</div>
            </div>
            <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between text-white">
              <div><div className="kicker text-mint">04 · Rehearse</div><div className="mt-1 text-2xl font-extrabold">내 자소서로 만드는 압박 면접</div></div>
              <span className="grid h-12 w-12 place-items-center rounded-full bg-white text-navy transition group-hover:translate-x-1">{Icon.arrow('h-5 w-5')}</span>
            </div>
          </Link>
        </Reveal>
        <Reveal className="md:col-span-3 lg:col-span-5" delay={80}>
          <Link to="/match" className="tile flex h-full items-center gap-4 p-6 transition hover:-translate-y-1">
            <div className="flex-1"><div className="kicker text-tie">01 · Match</div><div className="mt-1 text-xl font-extrabold">공고별 적합도와<br />합격까지 남은 점수</div><p className="mt-2 text-xs text-sub">{target.company} · {target.title}</p></div>
            <div className="w-40"><Radar data={target.radar} size={200} /></div>
          </Link>
        </Reveal>
        <Reveal className="md:col-span-3 lg:col-span-5" delay={120}>
          <Link to="/gap" className="flex h-full flex-col rounded-[28px] bg-navy p-6 text-white transition hover:-translate-y-1">
            <div className="kicker text-mint">02 · Gap</div><div className="mt-1 text-xl font-extrabold">Pick한 공고들이 원하는데, 나에게 없는 것</div>
            <ul className="mt-4 space-y-2">
              {bars.map(([s, c]) => <li key={s} className="flex items-center gap-3 text-xs"><span className="w-20 text-white/70">{s}</span><span className="h-2 flex-1 rounded-full bg-white/10"><span className="block h-2 rounded-full bg-tie" style={{ width: `${c * 45}%` }} /></span></li>)}
            </ul>
          </Link>
        </Reveal>
        <Reveal className="md:col-span-3 lg:col-span-4" delay={60}>
          <Link to="/rewrite" className="tile flex h-full flex-col p-6 transition hover:-translate-y-1">
            <div className="kicker text-tie">03 · Rewrite</div>
            <p className="mt-3 text-sm text-sub line-through decoration-tie/70">입사하면 열심히 배워서 기여하겠습니다.</p>
            <p className="mt-2 text-base font-semibold leading-snug">A/B 테스트와 대시보드로 팀의 핵심 지표를 <mark className="rounded bg-mint/25 px-1">12% 개선</mark>하겠습니다.</p>
            <div className="mt-auto pt-4 text-xs font-semibold text-[#0b8a68]">적합도 +9점</div>
          </Link>
        </Reveal>
        <Reveal className="md:col-span-3 lg:col-span-4" delay={100}>
          <div className="flex h-full flex-col justify-between rounded-[28px] bg-mint p-6 text-navy">
            <div className="kicker">RPA · Today</div>
            <div><div className="num text-6xl font-bold">160</div><div className="text-sm font-semibold">오늘 수집한 공고</div></div>
            <div className="flex flex-wrap gap-1">{['공공데이터포털', '서울 열린데이터', '나라일터'].map((s) => <Chip key={s} tone="white">{s}</Chip>)}</div>
          </div>
        </Reveal>
        <Reveal className="md:col-span-6 lg:col-span-4" delay={140}>
          <div className="relative h-full min-h-[200px] overflow-hidden rounded-[28px]">
            <img src={IMG.team} alt="회의실에서 노트북으로 협업하는 팀" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-navy/80 to-transparent" />
            <div className="absolute bottom-5 left-5 right-5 text-white"><div className="text-lg font-extrabold">매일 06:00, 새 공고가 도착합니다</div><div className="text-xs text-white/70">수집 → AI 정형화 → 내 덱에 추가</div></div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

const PERSONAS = [
  [IMG.curly, '데이터 분석 신입', '김픽', 38, 81, '갭 로드맵으로 A/B 테스트 보완'],
  [IMG.office, 'BI 엔지니어 이직', '이커리어', 52, 84, '리라이팅으로 정량 성과 추가'],
  [IMG.presenter, '공공기관 데이터 기획', '박기획', 47, 79, '압박 면접 3회 연습'],
]

export default function Home() {
  const { role } = useApp()
  return (
    <>
      <Hero />
      <Bento />
      <section className="wrap py-16">
        <Reveal className="mb-8">
          <div className="kicker text-tie">Journeys</div>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">이렇게 합격선에 가까워져요</h2>
          <p className="mt-2 text-sm text-sub">서비스 흐름을 보여 주기 위한 가상 페르소나입니다.</p>
        </Reveal>
        <div className="grid gap-4 md:grid-cols-3">
          {PERSONAS.map(([img, role_, name, from, to, how], i) => (
            <Reveal key={name} delay={i * 80}>
              <article className="tile overflow-hidden">
                <div className="relative h-56"><img src={img} alt="" className="h-full w-full object-cover" /><Chip tone="white" className="absolute left-4 top-4">{role_}</Chip></div>
                <div className="p-6">
                  <div className="text-sm font-bold">{name}</div>
                  <div className="mt-3 flex items-end gap-3">
                    <span className="num text-2xl font-bold text-sub line-through decoration-2">{from}</span>
                    <span className="text-sub">{Icon.arrow('h-5 w-5')}</span>
                    <span className="num text-5xl font-bold text-navy">{to}</span>
                    <span className="mb-1 text-xs font-semibold text-sub">Pick Score</span>
                  </div>
                  <p className="mt-3 text-sm text-sub">{how}</p>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </section>
      <section className="wrap">
        <Reveal>
          <div className="relative overflow-hidden rounded-[40px]">
            <img src={IMG.startup} alt="밝은 스타트업 사무실에서 회의하는 사람들" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-navy via-navy/85 to-navy/30" />
            <div className="relative grid gap-6 p-10 text-white md:grid-cols-[1fr_auto] md:items-end md:p-16">
              <div>
                <h2 className="text-3xl font-extrabold leading-tight sm:text-5xl">공고 3개만 넘겨 보세요.<br /><span className="text-mint">거리</span>가 보이기 시작합니다.</h2>
                <p className="mt-4 max-w-md text-white/70">가입 없이 샘플 데이터로 바로 체험할 수 있어요.</p>
              </div>
              <Link to={role ? '/journey' : '/login'} className="inline-flex h-14 items-center gap-2 rounded-full bg-white px-7 font-semibold text-navy hover:bg-mint">{role ? '내 여정 보기' : '무료로 시작하기'} {Icon.arrow()}</Link>
            </div>
          </div>
        </Reveal>
      </section>
    </>
  )
}
