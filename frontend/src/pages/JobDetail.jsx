import { Link, useParams } from 'react-router-dom'
import { api } from '../api'
import ErrorBox from '../components/ErrorBox'
import { categoryIcon } from '../components/JobCard'
import { Badge, Button, Spinner } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import useAsync from '../hooks/useAsync'
import useScrap from '../hooks/useScrap'
import { dDay, formatDate, scoreTone, timeAgo } from '../lib/format'

function Section({ icon, title, items, tone }) {
  if (!items?.length) return null
  return (
    <section className="card p-6">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
        <i className={`${icon} ${tone}`} />
        {title}
      </h2>
      <ul className="space-y-2.5">
        {items.map((t) => (
          <li key={t} className="flex gap-3 text-[15px] leading-relaxed text-ink-700">
            <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-ink-300" />
            {t}
          </li>
        ))}
      </ul>
    </section>
  )
}

export default function JobDetail() {
  const { id } = useParams()
  const { userSession } = useAuth()
  const job = useAsync(() => api.jobs.get(id), [id])
  const history = useAsync(() => (userSession ? api.analyses.list({ job_id: id }) : Promise.resolve([])), [id, userSession?.token])
  const toggleScrap = useScrap((updated) => job.setData(updated))

  if (job.loading) return <Spinner className="py-40" />
  if (job.error) return <div className="container-page py-14"><ErrorBox error={job.error} onRetry={job.reload} /></div>
  const j = job.data
  const d = dDay(j.deadline)

  return (
    <div className="container-page py-10 md:py-14">
      <Link to="/jobs" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-ink-500 hover:text-ink-900">
        <i className="fa-solid fa-arrow-left" /> 공고 목록
      </Link>
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <header className="card p-6 md:p-8">
            <div className="flex items-start gap-4">
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-pick-50 text-xl text-pick-500">
                <i className={categoryIcon(j.job_category)} />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink-500">{j.company}</p>
                <h1 className="mt-1 text-2xl leading-snug font-bold md:text-3xl">{j.title}</h1>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <Badge tone="pick" icon="fa-solid fa-tag">{j.job_category}</Badge>
              <Badge icon="fa-solid fa-location-dot">{j.location || '-'}</Badge>
              <Badge icon="fa-solid fa-user-tie">{j.career || '-'}</Badge>
              <Badge icon="fa-solid fa-building">{j.company_size || '-'}</Badge>
              <Badge icon="fa-solid fa-id-card">{j.employment_type}</Badge>
            </div>
            <dl className="mt-6 grid gap-4 border-t border-ink-100 pt-6 text-sm sm:grid-cols-3">
              <div><dt className="text-ink-400">급여</dt><dd className="mt-1 font-semibold">{j.salary || '-'}</dd></div>
              <div><dt className="text-ink-400">마감일</dt><dd className="mt-1 font-semibold">{j.deadline || '-'} {d && <span className="ml-1 text-coral-500">{d}</span>}</dd></div>
              <div><dt className="text-ink-400">수집</dt><dd className="mt-1 font-semibold">{timeAgo(j.collected_at)} · {j.source}</dd></div>
            </dl>
          </header>
          {j.description && (
            <section className="card p-6">
              <h2 className="mb-3 text-lg font-bold">공고 소개</h2>
              <p className="leading-relaxed whitespace-pre-line text-ink-700">{j.description}</p>
            </section>
          )}
          <Section icon="fa-solid fa-list-check" tone="text-pick-500" title="자격요건" items={j.requirements} />
          <Section icon="fa-solid fa-star" tone="text-sun-500" title="우대사항" items={j.preferred} />
          <Section icon="fa-solid fa-people-group" tone="text-match-500" title="인재상" items={j.talent} />
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="card p-6">
            <p className="font-display text-lg font-bold">이 공고에 내 자소서는 몇 점일까?</p>
            <p className="mt-1.5 text-sm text-ink-500">AI가 아래 키워드와 요건을 기준으로 적합도를 분석합니다.</p>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {j.keywords.map((k) => <span key={k} className="rounded-md bg-pick-50 px-2 py-1 text-xs font-semibold text-pick-600">{k}</span>)}
            </div>
            <Button to={`/analysis/new?job=${j.id}`} className="mt-6 w-full" icon="fa-solid fa-wand-magic-sparkles">이 공고로 분석하기</Button>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Button variant="secondary" size="sm" onClick={() => toggleScrap(j)} icon={j.is_scrapped ? 'fa-solid fa-bookmark text-pick-500' : 'fa-regular fa-bookmark'}>
                {j.is_scrapped ? '스크랩됨' : '스크랩'}
              </Button>
              {j.url ? (
                <Button href={j.url} target="_blank" rel="noreferrer" variant="secondary" size="sm" icon="fa-solid fa-arrow-up-right-from-square">원문 보기</Button>
              ) : (
                <Button variant="secondary" size="sm" disabled icon="fa-solid fa-arrow-up-right-from-square">원문 없음</Button>
              )}
            </div>
          </div>
          {history.data?.length > 0 && (
            <div className="card p-6">
              <p className="mb-3 font-semibold">이 공고 분석 이력</p>
              <ul className="space-y-2">
                {history.data.slice(0, 5).map((a) => (
                  <li key={a.id}>
                    <Link to={`/analysis/${a.id}`} className="flex items-center gap-3 rounded-xl p-2 hover:bg-ink-50">
                      <span className={`grid h-10 w-10 place-items-center rounded-lg font-display font-bold ${scoreTone(a.score).soft}`}>{Math.round(a.score)}</span>
                      <span className="min-w-0 text-sm">
                        <span className="block truncate font-medium">{a.resume_title} · v{a.resume_version}</span>
                        <span className="text-xs text-ink-400">{formatDate(a.created_at, true)}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
