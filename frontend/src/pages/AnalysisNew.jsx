import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../api'
import ErrorBox from '../components/ErrorBox'
import { categoryIcon } from '../components/JobCard'
import { Button, EmptyState, PageHeader, Skeleton, Spinner } from '../components/ui'
import { useToast } from '../context/ToastContext'
import useAsync from '../hooks/useAsync'
import { cx, dDay, timeAgo } from '../lib/format'

const STAGES = [
  { icon: 'fa-solid fa-robot', label: '공고 자격요건·우대사항 정형화' },
  { icon: 'fa-solid fa-key', label: '핵심 키워드 매칭' },
  { icon: 'fa-solid fa-pen-nib', label: '문항별 문장 완성도 평가' },
  { icon: 'fa-solid fa-wand-magic-sparkles', label: '적합도 산출 및 수정 가이드 작성' },
]

function Running() {
  const [stage, setStage] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setStage((s) => Math.min(STAGES.length - 1, s + 1)), 700)
    return () => clearInterval(t)
  }, [])
  return (
    <div className="card mx-auto max-w-lg p-8 text-center" role="status" aria-live="polite">
      <div className="relative mx-auto grid h-24 w-24 place-items-center">
        <span className="absolute inset-0 animate-ping rounded-full bg-pick-200" />
        <span className="relative grid h-20 w-20 place-items-center rounded-full bg-gradient-to-br from-pick-500 to-match-500 text-3xl text-white shadow-glow">
          <i className="fa-solid fa-wand-magic-sparkles" />
        </span>
      </div>
      <p className="mt-6 font-display text-xl font-bold">AI가 자소서를 분석하고 있어요</p>
      <ul className="mt-6 space-y-3 text-left">
        {STAGES.map((s, i) => (
          <li key={s.label} className={cx('flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition', i < stage ? 'bg-match-50 text-match-600' : i === stage ? 'bg-pick-50 font-semibold text-pick-600' : 'text-ink-300')}>
            <i className={cx('w-4', i < stage ? 'fa-solid fa-check' : i === stage ? 'fa-solid fa-circle-notch fa-spin' : s.icon)} />
            {s.label}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function AnalysisNew() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const toast = useToast()
  const resumeId = Number(params.get('resume')) || null
  const jobId = Number(params.get('job')) || null
  const [q, setQ] = useState('')
  const [search, setSearch] = useState('')
  const [running, setRunning] = useState(false)
  const resumes = useAsync(() => api.resumes.list(), [])
  const jobs = useAsync(() => api.jobs.list({ q: search, size: 30 }), [search])
  const selectedJob = useAsync(() => (jobId ? api.jobs.get(jobId) : Promise.resolve(null)), [jobId])

  useEffect(() => {
    if (!resumeId && resumes.data?.length === 1) setParams((p) => ({ ...Object.fromEntries(p), resume: resumes.data[0].id }), { replace: true })
  }, [resumes.data, resumeId, setParams])

  const select = (key, value) => setParams((p) => ({ ...Object.fromEntries(p), [key]: value }), { replace: true })

  const run = async () => {
    setRunning(true)
    try {
      const [analysis] = await Promise.all([api.analyses.create(resumeId, jobId), new Promise((r) => setTimeout(r, 2200))])
      navigate(`/analysis/${analysis.id}`)
    } catch (e) {
      toast.error(e.message)
      setRunning(false)
    }
  }

  if (running) return <div className="container-page py-16"><Running /></div>
  if (resumes.error) return <div className="container-page py-14"><ErrorBox error={resumes.error} onRetry={resumes.reload} /></div>

  const jobList = jobs.data?.items || []
  const showJobs = selectedJob.data && !jobList.some((j) => j.id === selectedJob.data.id) ? [selectedJob.data, ...jobList] : jobList

  return (
    <div className="container-page py-10 md:py-14">
      <PageHeader eyebrow="NEW ANALYSIS" icon="fa-solid fa-wand-magic-sparkles" title="AI 적합도 분석" description="분석할 자소서와 지원할 공고를 선택하세요. 약 10초 안에 리포트가 만들어집니다." />
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-6">
          <h2 className="mb-4 flex items-center gap-2 font-bold">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-ink-900 text-xs text-white">1</span> 자소서 선택
          </h2>
          {resumes.loading ? (
            <Spinner />
          ) : resumes.data.length === 0 ? (
            <EmptyState icon="fa-solid fa-file-circle-plus" title="등록된 자소서가 없습니다" action={<Button to="/resumes/new" icon="fa-solid fa-plus">자소서 등록하기</Button>} />
          ) : (
            <ul className="max-h-[480px] space-y-2 overflow-y-auto pr-1">
              {resumes.data.map((r) => (
                <li key={r.id}>
                  <button onClick={() => select('resume', r.id)} aria-pressed={resumeId === r.id} className={cx('flex w-full items-center gap-4 rounded-xl border-2 p-4 text-left transition', resumeId === r.id ? 'border-pick-500 bg-pick-50' : 'border-transparent bg-ink-50 hover:border-ink-200')}>
                    <span className={cx('grid h-10 w-10 shrink-0 place-items-center rounded-lg', resumeId === r.id ? 'bg-pick-500 text-white' : 'bg-white text-ink-400')}>
                      <i className={resumeId === r.id ? 'fa-solid fa-check' : 'fa-solid fa-file-lines'} />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{r.title}</span>
                      <span className="text-xs text-ink-500">v{r.version} · 문항 {r.items.length}개 · {timeAgo(r.updated_at)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-6">
          <h2 className="mb-4 flex items-center gap-2 font-bold">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-ink-900 text-xs text-white">2</span> 공고 선택
          </h2>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              setSearch(q.trim())
            }}
            className="relative mb-3"
            role="search"
          >
            <i className="fa-solid fa-magnifying-glass absolute top-1/2 left-4 -translate-y-1/2 text-ink-300" />
            <input className="input pl-11" value={q} onChange={(e) => setQ(e.target.value)} placeholder="회사명·직무 검색 후 Enter" aria-label="공고 검색" />
          </form>
          {jobs.loading && !jobs.data ? (
            <div className="space-y-2">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-16" />)}</div>
          ) : (
            <ul className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
              {showJobs.map((j) => (
                <li key={j.id}>
                  <button onClick={() => select('job', j.id)} aria-pressed={jobId === j.id} className={cx('flex w-full items-center gap-4 rounded-xl border-2 p-4 text-left transition', jobId === j.id ? 'border-match-500 bg-match-50' : 'border-transparent bg-ink-50 hover:border-ink-200')}>
                    <span className={cx('grid h-10 w-10 shrink-0 place-items-center rounded-lg', jobId === j.id ? 'bg-match-500 text-white' : 'bg-white text-ink-400')}>
                      <i className={jobId === j.id ? 'fa-solid fa-check' : categoryIcon(j.job_category)} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{j.title}</span>
                      <span className="text-xs text-ink-500">{j.company} · {j.career}</span>
                    </span>
                    {dDay(j.deadline) && <span className="text-xs font-bold text-ink-400">{dDay(j.deadline)}</span>}
                  </button>
                </li>
              ))}
              {showJobs.length === 0 && <li className="py-10 text-center text-sm text-ink-400">검색 결과가 없습니다.</li>}
            </ul>
          )}
        </section>
      </div>
      <div className="sticky bottom-4 z-30 mt-8">
        <div className="card mx-auto flex max-w-3xl flex-col items-center justify-between gap-3 p-4 shadow-lift sm:flex-row">
          <p className="text-sm text-ink-500">
            {resumeId && jobId ? <><i className="fa-solid fa-circle-check mr-1 text-match-500" />자소서와 공고가 선택되었습니다.</> : '자소서와 공고를 모두 선택해 주세요.'}
          </p>
          <Button size="lg" disabled={!resumeId || !jobId} onClick={run} icon="fa-solid fa-wand-magic-sparkles">분석 시작</Button>
        </div>
      </div>
    </div>
  )
}
