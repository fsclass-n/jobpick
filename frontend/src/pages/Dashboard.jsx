import { Link } from 'react-router-dom'
import { api } from '../api'
import ErrorBox from '../components/ErrorBox'
import JobCard from '../components/JobCard'
import { Button, EmptyState, Skeleton, StatCard } from '../components/ui'
import { LineChart } from '../components/ui/charts'
import { useAuth } from '../context/AuthContext'
import useAsync from '../hooks/useAsync'
import { cx, scoreTone, timeAgo } from '../lib/format'

const QUICK = [
  { to: '/resumes/new', icon: 'fa-solid fa-file-circle-plus', label: '자소서 등록', desc: '텍스트 또는 파일 업로드', tone: 'bg-match-50 text-match-600' },
  { to: '/jobs', icon: 'fa-solid fa-briefcase', label: '공고 탐색', desc: '최신 수집 공고 보기', tone: 'bg-pick-50 text-pick-500' },
  { to: '/analysis/new', icon: 'fa-solid fa-wand-magic-sparkles', label: 'AI 분석', desc: '적합도 분석 시작', tone: 'bg-sun-50 text-sun-500' },
]

export default function Dashboard() {
  const { user, isSandbox } = useAuth()
  const dash = useAsync(() => api.analyses.dashboard(), [])
  const d = dash.data

  return (
    <div className="container-page py-10 md:py-14">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold text-pick-500">MY DASHBOARD</p>
          <h1 className="mt-1 text-2xl font-bold md:text-3xl">{user?.name}님, 오늘도 한 걸음 더 가까이</h1>
          <p className="mt-2 text-sm text-ink-500">{user?.desired_job ? `희망 직무: ${user.desired_job}` : '자소서를 다듬고 맞춤 공고에 지원해 보세요.'}</p>
        </div>
        <Button to="/analysis/new" icon="fa-solid fa-wand-magic-sparkles">새 분석 시작</Button>
      </div>

      {isSandbox && (
        <Link to="/sandbox/admin" className="mb-6 flex items-center gap-4 rounded-2xl border border-sun-400/40 bg-sun-50 p-5 transition hover:shadow-card">
          <span className="grid h-12 w-12 place-items-center rounded-xl bg-sun-400 text-ink-950"><i className="fa-solid fa-flask" /></span>
          <span className="flex-1">
            <span className="block font-semibold">테스트 관리자 샌드박스 콘솔</span>
            <span className="text-sm text-ink-500">정식 관리자 기능을 샌드박스 데이터로 검증할 수 있습니다. 이 계정의 분석 활동은 운영 통계에 포함되지 않습니다.</span>
          </span>
          <i className="fa-solid fa-arrow-right text-ink-400" />
        </Link>
      )}

      {dash.error ? (
        <ErrorBox error={dash.error} onRetry={dash.reload} />
      ) : dash.loading ? (
        <div className="grid gap-4 md:grid-cols-4">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-32" />)}</div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard icon="fa-solid fa-file-lines" label="등록한 자소서" value={d.resume_count} suffix="개" tone="match" />
            <StatCard icon="fa-solid fa-chart-pie" label="누적 분석" value={d.analysis_count} suffix="회" />
            <StatCard icon="fa-solid fa-gauge-high" label="평균 적합도" value={d.average_score} suffix="점" tone="sun" />
            <StatCard icon="fa-solid fa-trophy" label="최고 적합도" value={d.best_score} suffix="점" tone="dark" />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <section className="card p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-bold">적합도 추이</h2>
                <Link to="/history" className="text-sm font-semibold text-pick-600 hover:underline">전체 이력</Link>
              </div>
              {d.score_trend.length > 1 ? (
                <LineChart data={d.score_trend} />
              ) : (
                <EmptyState icon="fa-solid fa-chart-line" title="분석을 2회 이상 하면 추이가 보여요" description="자소서를 고친 뒤 다시 분석하면 점수 변화를 확인할 수 있습니다." />
              )}
            </section>
            <section className="card p-6">
              <h2 className="mb-4 font-bold">최근 분석</h2>
              {d.recent_analyses.length === 0 ? (
                <p className="py-10 text-center text-sm text-ink-400">아직 분석 결과가 없습니다.</p>
              ) : (
                <ul className="space-y-2">
                  {d.recent_analyses.map((a) => (
                    <li key={a.id}>
                      <Link to={`/analysis/${a.id}`} className="flex items-center gap-3 rounded-xl p-2.5 transition hover:bg-ink-50">
                        <span className={cx('grid h-11 w-11 place-items-center rounded-xl font-display font-bold', scoreTone(a.score).soft)}>{Math.round(a.score)}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold">{a.company} · {a.job_title}</span>
                          <span className="text-xs text-ink-400">{a.resume_title} v{a.resume_version} · {timeAgo(a.created_at)}</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {QUICK.map((q) => (
              <Link key={q.to} to={q.to} className="card flex items-center gap-4 p-5 transition hover:-translate-y-0.5 hover:shadow-lift">
                <span className={cx('grid h-12 w-12 place-items-center rounded-xl text-lg', q.tone)}><i className={q.icon} /></span>
                <span>
                  <span className="block font-semibold">{q.label}</span>
                  <span className="text-sm text-ink-500">{q.desc}</span>
                </span>
              </Link>
            ))}
          </div>

          <section className="mt-10">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">스크랩한 공고 <span className="text-sm font-medium text-ink-400">{d.scrap_count}</span></h2>
              <Link to="/jobs" className="text-sm font-semibold text-pick-600 hover:underline">공고 더 보기</Link>
            </div>
            {d.scrapped_jobs.length === 0 ? (
              <EmptyState icon="fa-regular fa-bookmark" title="스크랩한 공고가 없습니다" description="관심 있는 공고를 스크랩해 두면 여기에 모아 보여 드립니다." />
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {d.scrapped_jobs.map((j) => <JobCard key={j.id} job={j} compact />)}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}
