import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import ErrorBox from '../components/ErrorBox'
import { Button, EmptyState, Modal, PageHeader, Skeleton } from '../components/ui'
import { LineChart, ProgressBar } from '../components/ui/charts'
import useAsync from '../hooks/useAsync'
import { cx, formatDate, scoreTone } from '../lib/format'

const SECTIONS = { keyword: '키워드', requirements: '자격요건', preferred: '우대사항', talent: '인재상', writing: '문장 완성도' }

function CompareModal({ ids, onClose }) {
  const data = useAsync(() => Promise.all(ids.map((id) => api.analyses.get(id))), [ids.join(',')])
  const [a, b] = (data.data || []).sort((x, y) => new Date(x.created_at) - new Date(y.created_at))
  return (
    <Modal open onClose={onClose} title="분석 결과 비교" size="lg">
      {!a || !b ? (
        <Skeleton className="h-64" />
      ) : (
        <div>
          <div className="grid grid-cols-2 gap-4">
            {[a, b].map((x, i) => (
              <div key={x.id} className="rounded-2xl bg-ink-50 p-4">
                <p className="text-xs font-semibold text-ink-400">{i === 0 ? '이전' : '이후'} · {formatDate(x.created_at, true)}</p>
                <p className="mt-1 truncate font-semibold">{x.company} · {x.job_title}</p>
                <p className="truncate text-xs text-ink-500">{x.resume_title} v{x.resume_version}</p>
                <p className={cx('mt-3 font-display text-4xl font-bold', scoreTone(x.score).text)}>{Math.round(x.score)}</p>
              </div>
            ))}
          </div>
          <ul className="mt-6 space-y-4">
            {Object.entries(SECTIONS).map(([key, label]) => {
              const va = a.result.section_scores?.[key] ?? 0
              const vb = b.result.section_scores?.[key] ?? 0
              const d = Math.round(vb - va)
              return (
                <li key={key}>
                  <div className="mb-1.5 flex justify-between text-sm">
                    <span className="text-ink-600">{label}</span>
                    <span className={cx('font-semibold', d > 0 ? 'text-match-600' : d < 0 ? 'text-coral-600' : 'text-ink-400')}>
                      {Math.round(va)} → {Math.round(vb)} ({d > 0 ? '+' : ''}{d})
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <ProgressBar value={va} tone="bg-ink-300" />
                    <ProgressBar value={vb} />
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </Modal>
  )
}

export default function History() {
  const list = useAsync(() => api.analyses.list({ limit: 200 }), [])
  const [resumeFilter, setResumeFilter] = useState('')
  const [selected, setSelected] = useState([])
  const [compare, setCompare] = useState(false)

  const resumes = useMemo(() => {
    const map = new Map()
    ;(list.data || []).forEach((a) => a.resume_id && map.set(a.resume_id, a.resume_title))
    return [...map.entries()]
  }, [list.data])
  const items = (list.data || []).filter((a) => !resumeFilter || a.resume_id === Number(resumeFilter))
  const trend = [...items].reverse().slice(-12).map((a) => ({ date: formatDate(a.created_at).slice(5), score: a.score, label: `${a.company} · v${a.resume_version}` }))
  const toggle = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s.slice(-1), id]))

  return (
    <div className="container-page py-10 md:py-14">
      <PageHeader
        eyebrow="HISTORY"
        icon="fa-solid fa-chart-line"
        title="분석 이력"
        description="자소서를 고칠수록 점수가 어떻게 바뀌었는지 확인하고, 두 결과를 비교해 보세요."
        actions={<Button to="/analysis/new" icon="fa-solid fa-plus">새 분석</Button>}
      />
      {list.error ? (
        <ErrorBox error={list.error} onRetry={list.reload} />
      ) : list.loading ? (
        <Skeleton className="h-80" />
      ) : list.data.length === 0 ? (
        <EmptyState icon="fa-solid fa-chart-line" title="아직 분석 이력이 없습니다" description="자소서와 공고를 골라 첫 분석을 시작해 보세요." action={<Button to="/analysis/new" icon="fa-solid fa-wand-magic-sparkles">분석 시작하기</Button>} />
      ) : (
        <>
          <section className="card mb-6 p-6">
            <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <h2 className="font-bold">점수 변화 추이</h2>
              <select className="input w-auto py-2" value={resumeFilter} onChange={(e) => setResumeFilter(e.target.value)} aria-label="자소서 필터">
                <option value="">전체 자소서</option>
                {resumes.map(([id, title]) => <option key={id} value={id}>{title}</option>)}
              </select>
            </div>
            {trend.length > 1 ? <LineChart data={trend} /> : <p className="py-10 text-center text-sm text-ink-400">분석이 2건 이상이면 추이 그래프가 표시됩니다.</p>}
          </section>

          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm text-ink-500">총 <strong className="text-ink-900">{items.length}</strong>건 · 비교할 리포트 2개를 선택하세요</p>
            <Button size="sm" variant="secondary" disabled={selected.length !== 2} onClick={() => setCompare(true)} icon="fa-solid fa-code-compare">선택 비교 ({selected.length}/2)</Button>
          </div>
          <div className="card divide-y divide-ink-100 overflow-hidden">
            {items.map((a) => {
              const tone = scoreTone(a.score)
              return (
                <div key={a.id} className={cx('flex items-center gap-4 p-4 transition md:px-6', selected.includes(a.id) ? 'bg-pick-50/60' : 'hover:bg-ink-50/60')}>
                  <input type="checkbox" className="h-4 w-4 accent-pick-500" checked={selected.includes(a.id)} onChange={() => toggle(a.id)} aria-label={`${a.company} 분석 선택`} />
                  <span className={cx('grid h-12 w-12 shrink-0 place-items-center rounded-xl font-display text-lg font-bold', tone.soft)}>{Math.round(a.score)}</span>
                  <Link to={`/analysis/${a.id}`} className="min-w-0 flex-1">
                    <p className="truncate font-semibold hover:text-pick-600">{a.company} · {a.job_title}</p>
                    <p className="truncate text-xs text-ink-500">{a.resume_title} v{a.resume_version} · 키워드 {Math.round(a.keyword_match_rate)}% · {a.engine === 'gemini' ? 'Gemini' : '규칙 엔진'}</p>
                  </Link>
                  <span className="hidden text-xs text-ink-400 sm:block">{formatDate(a.created_at, true)}</span>
                  <Link to={`/analysis/${a.id}`} className="grid h-9 w-9 place-items-center rounded-lg text-ink-300 hover:bg-white hover:text-ink-600" aria-label="리포트 보기">
                    <i className="fa-solid fa-chevron-right text-xs" />
                  </Link>
                </div>
              )
            })}
          </div>
        </>
      )}
      {compare && <CompareModal ids={selected} onClose={() => setCompare(false)} />}
    </div>
  )
}
