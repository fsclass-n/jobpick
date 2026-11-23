import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import sampleJobs from '../../../rpa/data/sample_jobs.json'
import { api } from '../api'
import { SAMPLE_RESUME } from '../api/mock'
import MatchStage from '../components/home/MatchStage'
import JobCard from '../components/JobCard'
import ReportView from '../components/ReportView'
import { Button, Skeleton } from '../components/ui'
import { CountUp, Reveal } from '../components/ui/motion'
import { useAuth } from '../context/AuthContext'
import { analyzeRuleBased, KEYWORD_SYNONYMS } from '../lib/analyzer'
import { cx } from '../lib/format'

const STEPS = [
  { icon: 'fa-solid fa-robot', title: '공고 자동 수집', desc: 'RPA가 공공 채용정보 API와 채용 게시판에서 공고를 모아 자격요건·우대사항·인재상으로 정리합니다.', color: 'from-pick-500 to-pick-400' },
  { icon: 'fa-solid fa-file-arrow-up', title: '자소서 등록', desc: '텍스트로 붙여 넣거나 PDF·이미지를 올리면 OCR이 문항별로 나눠 줍니다. 수정할 때마다 버전이 쌓입니다.', color: 'from-pick-400 to-match-400' },
  { icon: 'fa-solid fa-wand-magic-sparkles', title: 'AI 대조 분석', desc: '생성형 AI가 공고와 자소서를 맞대어 키워드·요건·문장 완성도를 평가하고 적합도 점수를 매깁니다.', color: 'from-match-400 to-match-500' },
  { icon: 'fa-solid fa-pen-nib', title: '수정 가이드', desc: '문항별로 무엇을 더 쓰고 무엇을 덜어낼지, 예시 문장과 함께 구체적인 수정 방향을 제시합니다.', color: 'from-match-500 to-sun-400' },
]

function Hero() {
  const { user } = useAuth()
  const [jobTotal, setJobTotal] = useState(null)
  useEffect(() => {
    api.jobs.list({ size: 1 }).then((r) => setJobTotal(r.total)).catch(() => setJobTotal(0))
  }, [])
  return (
    <section
      className="relative overflow-hidden bg-ink-950 text-white"
      style={{ marginTop: 'calc(-1 * var(--header-h, 80px))', paddingTop: 'var(--header-h, 80px)' }}
    >
      <div className="bg-grid absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" aria-hidden="true" />
      <div className="absolute -top-40 -left-40 h-[520px] w-[520px] rounded-full bg-pick-500/30 blur-[120px]" aria-hidden="true" />
      <div className="absolute -right-40 -bottom-40 h-[480px] w-[480px] rounded-full bg-match-500/20 blur-[120px]" aria-hidden="true" />
      <div className="container-page relative grid gap-14 py-16 md:py-24 lg:grid-cols-[1.05fr_1fr] lg:items-center">
        <div className="text-center lg:text-left">
          <p className="inline-flex animate-fade-up items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-semibold text-white/80">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-match-400" />
            RPA × 생성형 AI 맞춤형 커리어 컨설팅
          </p>
          <h1 className="mt-6 animate-fade-up text-4xl leading-[1.15] font-bold [animation-delay:100ms] sm:text-5xl lg:text-[56px]">
            공고와 나를 맞대면,
            <br />
            <span className="text-gradient">합격</span>이 보입니다
          </h1>
          <p className="mx-auto mt-6 max-w-xl animate-fade-up text-base leading-relaxed text-white/70 [animation-delay:200ms] md:text-lg lg:mx-0">
            jobpick은 RPA가 수집한 채용 공고를 AI가 내 자기소개서와 한 줄씩 대조해 <strong className="text-white">합격 가능성</strong>을 점수로 보여 주고,
            문항마다 <strong className="text-white">수정 가이드라인</strong>을 써 드립니다.
          </p>
          <div className="mt-9 flex animate-fade-up flex-col justify-center gap-3 [animation-delay:300ms] sm:flex-row lg:justify-start">
            {user ? (
              <Button to="/dashboard" size="lg" icon="fa-solid fa-gauge">내 대시보드로 이동</Button>
            ) : (
              <Button to="/signup" size="lg" icon="fa-solid fa-bolt">무료로 분석 시작하기</Button>
            )}
            <Button href="#sample" size="lg" variant="ghost" className="border border-white/15 text-white hover:bg-white/10 hover:text-white" icon="fa-solid fa-file-lines">
              샘플 리포트 보기
            </Button>
          </div>
          <dl className="mt-12 grid animate-fade-up grid-cols-3 gap-4 border-t border-white/10 pt-8 [animation-delay:400ms]">
            {[
              { label: '수집된 채용 공고', value: jobTotal, suffix: '건' },
              { label: '분석 키워드 사전', value: Object.keys(KEYWORD_SYNONYMS).length, suffix: '개' },
              { label: '평가 항목', value: 5, suffix: '개 영역' },
            ].map((s) => (
              <div key={s.label}>
                <dt className="text-xs text-white/50">{s.label}</dt>
                <dd className="mt-1 font-display text-2xl font-bold md:text-3xl">
                  {s.value === null ? <span className="inline-block h-7 w-12 animate-pulse rounded bg-white/10" /> : <CountUp value={s.value} />}
                  <span className="ml-1 text-sm font-medium text-white/50">{s.suffix}</span>
                </dd>
              </div>
            ))}
          </dl>
        </div>
        <MatchStage />
      </div>
    </section>
  )
}

function Steps() {
  return (
    <section className="container-page py-24">
      <Reveal className="mx-auto max-w-2xl text-center">
        <p className="text-sm font-bold tracking-[0.2em] text-pick-500">HOW IT WORKS</p>
        <h2 className="mt-3 text-3xl font-bold md:text-4xl">네 단계로 끝나는 맞춤 컨설팅</h2>
        <p className="mt-4 text-ink-500">공고를 찾아 헤매고 자소서를 혼자 고치던 시간을, 데이터에 기반한 피드백으로 바꿉니다.</p>
      </Reveal>
      <div className="relative mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="absolute top-10 right-[12%] left-[12%] hidden h-0.5 bg-gradient-to-r from-pick-200 via-match-100 to-sun-400/40 lg:block" aria-hidden="true" />
        {STEPS.map((s, i) => (
          <Reveal key={s.title} delay={i * 120} className="relative">
            <div className="card h-full p-6 transition hover:-translate-y-1 hover:shadow-lift">
              <div className={cx('relative grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br text-xl text-white shadow-glow', s.color)}>
                <i className={s.icon} />
                <span className="absolute -top-2 -right-2 grid h-6 w-6 place-items-center rounded-full bg-ink-900 text-[11px] font-bold">{i + 1}</span>
              </div>
              <h3 className="mt-5 text-lg font-bold">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-500">{s.desc}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  )
}

function RecentJobs() {
  const [jobs, setJobs] = useState(null)
  useEffect(() => {
    api.jobs.list({ size: 6 }).then((r) => setJobs(r.items)).catch(() => setJobs([]))
  }, [])
  return (
    <section className="bg-white py-24">
      <div className="container-page">
        <Reveal className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-bold tracking-[0.2em] text-pick-500">LATEST JOBS</p>
            <h2 className="mt-3 text-3xl font-bold md:text-4xl">방금 수집된 채용 공고</h2>
            <p className="mt-3 text-ink-500">RPA가 매일 수집하고 AI가 정리한 공고입니다. 마음에 드는 공고로 바로 분석해 보세요.</p>
          </div>
          <Button to="/jobs" variant="secondary" icon="fa-solid fa-arrow-right">전체 공고 보기</Button>
        </Reveal>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {jobs === null
            ? Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-52" />)
            : jobs.map((job, i) => (
                <Reveal key={job.id} delay={i * 60}>
                  <JobCard job={job} />
                </Reveal>
              ))}
        </div>
      </div>
    </section>
  )
}

function Keywords() {
  const [data, setData] = useState(null)
  const [tab, setTab] = useState('전체')
  useEffect(() => {
    api.jobs.popularKeywords().then(setData).catch(() => setData({ overall: [], by_category: {} }))
  }, [])
  const max = Math.max(1, ...(data?.overall || []).map((k) => k.count))
  const tabs = ['전체', ...Object.keys(data?.by_category || {})]
  const list = tab === '전체' ? data?.overall || [] : (data?.by_category[tab] || []).map((k, i) => ({ keyword: k, count: 5 - i }))
  const localMax = tab === '전체' ? max : 5
  return (
    <section className="container-page py-24">
      <div className="grid gap-12 lg:grid-cols-[1fr_1.3fr] lg:items-center">
        <Reveal>
          <p className="text-sm font-bold tracking-[0.2em] text-pick-500">TRENDING SKILLS</p>
          <h2 className="mt-3 text-3xl font-bold md:text-4xl">요즘 공고가 원하는 키워드</h2>
          <p className="mt-4 leading-relaxed text-ink-500">
            수집된 공고의 자격요건과 우대사항을 pandas로 집계한 결과입니다. 자소서에 이 키워드가 <strong className="text-ink-800">경험과 함께</strong> 드러나는지가 적합도 점수의 35%를 차지합니다.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {tabs.map((t) => (
              <button key={t} onClick={() => setTab(t)} className={cx('rounded-full px-3.5 py-1.5 text-sm font-semibold transition', t === tab ? 'bg-ink-900 text-white' : 'bg-white text-ink-500 hover:text-ink-900')}>
                {t}
              </button>
            ))}
          </div>
        </Reveal>
        <Reveal delay={150} className="card flex min-h-64 flex-wrap content-center items-center justify-center gap-3 p-8">
          {list.map((k, i) => {
            const ratio = k.count / localMax
            return (
              <span
                key={k.keyword}
                className={cx('animate-pop rounded-2xl px-4 py-2 font-display font-semibold transition hover:-translate-y-0.5', ratio > 0.7 ? 'bg-pick-500 text-white' : ratio > 0.4 ? 'bg-pick-100 text-pick-700' : 'bg-ink-100 text-ink-600')}
                style={{ fontSize: `${14 + ratio * 12}px`, animationDelay: `${i * 40}ms` }}
              >
                #{k.keyword}
                {tab === '전체' && <span className="ml-1.5 text-xs opacity-60">{k.count}</span>}
              </span>
            )
          })}
        </Reveal>
      </div>
    </section>
  )
}

function SampleReport() {
  const analysis = useMemo(() => {
    const raw = sampleJobs[0]
    const result = analyzeRuleBased(raw, SAMPLE_RESUME)
    return { score: result.score, keyword_match_rate: result.keyword_match_rate, result, engine: 'rule', company: raw.company, job_title: raw.title, resume_title: '샘플 자소서 (백엔드 지원)', resume_version: 1 }
  }, [])
  return (
    <section id="sample" className="scroll-mt-24 bg-gradient-to-b from-pick-50/60 to-ink-50 py-24">
      <div className="container-page">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-bold tracking-[0.2em] text-pick-500">SAMPLE REPORT</p>
          <h2 className="mt-3 text-3xl font-bold md:text-4xl">이런 리포트를 받아 보게 됩니다</h2>
          <p className="mt-4 text-ink-500">실제 분석 엔진으로 샘플 자소서를 분석한 결과입니다.</p>
        </Reveal>
        <Reveal delay={100} className="mx-auto mt-12 max-w-5xl">
          <ReportView analysis={analysis} compact />
        </Reveal>
      </div>
    </section>
  )
}

function Cta() {
  const { user } = useAuth()
  return (
    <section className="container-page pt-24">
      <Reveal className="relative overflow-hidden rounded-3xl bg-ink-900 px-6 py-14 text-center text-white md:px-12">
        <div className="absolute -top-24 left-1/2 h-64 w-[600px] -translate-x-1/2 rounded-full bg-pick-500/40 blur-[100px]" aria-hidden="true" />
        <div className="relative">
          <h2 className="text-3xl font-bold md:text-4xl">다음 지원서는 <span className="text-gradient">근거 있게</span></h2>
          <p className="mx-auto mt-4 max-w-xl text-white/70">공고 하나, 자소서 하나면 충분합니다. 지금 바로 적합도를 확인하고 수정 방향을 받아 보세요.</p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button to={user ? '/analysis/new' : '/signup'} size="lg" icon="fa-solid fa-wand-magic-sparkles">{user ? '새 분석 시작하기' : '무료로 분석 시작하기'}</Button>
            <Button to="/jobs" size="lg" variant="ghost" className="border border-white/15 text-white hover:bg-white/10 hover:text-white">공고 둘러보기</Button>
          </div>
          {!user && <p className="mt-5 text-xs text-white/50">이미 계정이 있나요? <Link to="/login" className="font-semibold text-white underline underline-offset-2">로그인</Link></p>}
        </div>
      </Reveal>
    </section>
  )
}

export default function Home() {
  return (
    <>
      <Hero />
      <Steps />
      <RecentJobs />
      <Keywords />
      <SampleReport />
      <Cta />
    </>
  )
}
