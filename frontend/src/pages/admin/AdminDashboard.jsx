import { useState } from 'react'
import ErrorBox from '../../components/ErrorBox'
import { PageHeader, Skeleton, StatCard } from '../../components/ui'
import { DonutChart, HBarList, StackedBarChart } from '../../components/ui/charts'
import useAsync from '../../hooks/useAsync'
import { cx } from '../../lib/format'
import { useAdminScope } from './AdminLayout'

const ENGINE_COLOR = { gemini: '#5b5bf7', rule: '#18c99a' }
const ENGINE_LABEL = { gemini: 'Gemini AI', rule: '규칙 기반 엔진' }

export default function AdminDashboard() {
  const { api, isSandbox } = useAdminScope()
  const [days, setDays] = useState(14)
  const stats = useAsync(() => api.stats(days), [api, days])
  const s = stats.data

  return (
    <div>
      <PageHeader
        eyebrow={isSandbox ? 'SANDBOX MONITORING' : 'MONITORING'}
        icon="fa-solid fa-chart-column"
        title="모니터링 대시보드"
        description="RPA 공고 수집 현황과 AI 자소서 분석 처리 현황을 확인합니다."
        actions={
          <div className="flex rounded-xl bg-white p-1 shadow-card" role="group" aria-label="기간 선택">
            {[7, 14, 30].map((d) => (
              <button key={d} onClick={() => setDays(d)} className={cx('rounded-lg px-3 py-1.5 text-sm font-semibold', d === days ? 'bg-ink-900 text-white' : 'text-ink-500')}>
                {d}일
              </button>
            ))}
          </div>
        }
      />
      {stats.error ? (
        <ErrorBox error={stats.error} onRetry={stats.reload} />
      ) : !s ? (
        <div className="grid gap-4 md:grid-cols-4">{Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-32" />)}</div>
      ) : (
        <div className={cx('space-y-6 transition-opacity', stats.loading && 'opacity-60')}>
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            <StatCard icon="fa-solid fa-robot" label={`공고 수집 (${days}일)`} value={s.totals.collected_period.toLocaleString()} suffix="건" hint={`수집 실행 ${s.totals.crawl_runs}회 · 보유 공고 ${s.totals.jobs}건`} />
            <StatCard icon="fa-solid fa-circle-check" label="RPA 수집 성공률" value={s.totals.crawl_success_rate} suffix="%" tone="match" />
            <StatCard icon="fa-solid fa-wand-magic-sparkles" label="AI 분석 성공률" value={s.totals.analysis_success_rate} suffix="%" tone="sun" hint={`분석 ${s.totals.analyses}건 · 평균 ${s.totals.average_duration_ms}ms`} />
            <StatCard icon="fa-solid fa-users" label={isSandbox ? '샌드박스 회원' : '전체 회원'} value={s.totals.users} suffix="명" tone="dark" hint={`평균 적합도 ${s.totals.average_score}점`} />
          </div>

          <section className="card p-6">
            <h2 className="mb-6 font-bold">일별 RPA 공고 수집 현황</h2>
            <StackedBarChart
              data={s.daily_collection.map((d) => ({ ...d, existing: d.collected - d.new }))}
              series={[
                { key: 'new', label: '신규 공고', color: '#5b5bf7' },
                { key: 'existing', label: '갱신 공고', color: '#c3c8ff' },
              ]}
            />
          </section>

          <div className="grid gap-6 xl:grid-cols-2">
            <section className="card p-6">
              <h2 className="mb-6 font-bold">일별 AI 분석 처리 현황</h2>
              <StackedBarChart
                data={s.analysis_daily}
                height={180}
                series={[
                  { key: 'success', label: '성공', color: '#18c99a' },
                  { key: 'fallback', label: '대체 처리(폴백)', color: '#ffc44d' },
                  { key: 'failed', label: '실패', color: '#ff6b6b' },
                ]}
              />
            </section>
            <section className="card p-6">
              <h2 className="mb-6 font-bold">수집 출처별 성공률</h2>
              {s.source_stats.length === 0 ? (
                <p className="py-10 text-center text-sm text-ink-400">수집 이력이 없습니다.</p>
              ) : (
                <ul className="space-y-4">
                  {s.source_stats.map((src) => (
                    <li key={src.source}>
                      <div className="mb-1.5 flex flex-wrap justify-between gap-2 text-sm">
                        <span className="font-semibold text-ink-700">{src.source}</span>
                        <span className="text-ink-500">
                          성공 {src.success} / 실패 <span className={src.failed ? 'font-semibold text-coral-500' : ''}>{src.failed}</span> · <strong className="text-ink-900">{src.success_rate}%</strong>
                        </span>
                      </div>
                      <div className="flex h-2.5 overflow-hidden rounded-full bg-ink-100">
                        <div className="bg-match-500" style={{ width: `${(src.success / src.runs) * 100}%` }} />
                        <div className="bg-coral-400" style={{ width: `${(src.failed / src.runs) * 100}%` }} />
                      </div>
                      <p className="mt-1 text-xs text-ink-400">누적 수집 {src.collected.toLocaleString()}건 · 실행 {src.runs}회</p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <div className="grid gap-6 xl:grid-cols-3">
            <section className="card p-6">
              <h2 className="mb-6 font-bold">분석 엔진 비율</h2>
              <DonutChart
                data={s.analysis_engine.map((e) => ({ label: ENGINE_LABEL[e.engine] || e.engine, value: e.count, color: ENGINE_COLOR[e.engine] || '#a3a9c4' }))}
                center={<><p className="font-display text-2xl font-bold">{s.totals.analyses}</p><p className="text-xs text-ink-400">총 분석</p></>}
              />
            </section>
            <section className="card p-6">
              <h2 className="mb-6 font-bold">적합도 점수 분포</h2>
              <HBarList data={s.score_distribution} labelKey="range" valueKey="count" color="bg-pick-400" format={(v) => `${v}건`} />
            </section>
            <section className="card p-6">
              <h2 className="mb-6 font-bold">직무별 보유 공고</h2>
              <HBarList data={s.category_stats.slice(0, 8)} labelKey="category" valueKey="count" color="bg-match-500" format={(v) => `${v}건`} />
            </section>
          </div>
        </div>
      )}
    </div>
  )
}
