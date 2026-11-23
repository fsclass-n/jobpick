import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../api'
import ErrorBox from '../components/ErrorBox'
import JobCard, { categoryIcon } from '../components/JobCard'
import { EmptyState, PageHeader, Pagination, Skeleton } from '../components/ui'
import useAsync from '../hooks/useAsync'
import useScrap from '../hooks/useScrap'
import { cx } from '../lib/format'

const SIZE = 12

export default function Jobs() {
  const [params, setParams] = useSearchParams()
  const query = Object.fromEntries(params.entries())
  const page = Number(query.page || 1)
  const [keyword, setKeyword] = useState(query.q || '')
  const filters = useAsync(() => api.jobs.filters(), [])
  const jobs = useAsync(() => api.jobs.list({ ...query, page, size: SIZE }), [params.toString()])
  const toggleScrap = useScrap((updated) => jobs.setData((d) => ({ ...d, items: d.items.map((j) => (j.id === updated.id ? updated : j)) })))

  useEffect(() => {
    setKeyword(query.q || '')
  }, [query.q])

  const update = (patch) => {
    const next = { ...query, ...patch, page: patch.page || 1 }
    Object.keys(next).forEach((k) => (next[k] === '' || next[k] === undefined || (k === 'page' && next[k] === 1)) && delete next[k])
    setParams(next)
  }
  const f = filters.data || { categories: [], locations: [], careers: [], company_sizes: [] }
  const activeCount = ['category', 'location', 'career', 'company_size', 'q'].filter((k) => query[k]).length

  return (
    <div className="container-page py-10 md:py-14">
      <PageHeader eyebrow="JOB POSTINGS" icon="fa-solid fa-robot" title="채용 공고 탐색" description="RPA가 수집하고 AI가 자격요건·우대사항·인재상으로 정리한 공고입니다." />

      <div className="card mb-8 p-4 md:p-5">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            update({ q: keyword.trim() })
          }}
          className="flex gap-2"
          role="search"
        >
          <div className="relative flex-1">
            <i className="fa-solid fa-magnifying-glass absolute top-1/2 left-4 -translate-y-1/2 text-ink-300" />
            <input className="input pl-11" value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="회사명, 직무, 키워드로 검색" aria-label="공고 검색" />
          </div>
          <button className="h-12 rounded-xl bg-ink-900 px-5 text-sm font-semibold text-white hover:bg-ink-800">검색</button>
        </form>
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1" role="group" aria-label="직무 필터">
          <button onClick={() => update({ category: '' })} className={cx('shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition', !query.category ? 'bg-pick-500 text-white' : 'bg-ink-50 text-ink-600 hover:bg-ink-100')}>
            전체 직무
          </button>
          {f.categories.map((c) => (
            <button key={c} onClick={() => update({ category: c })} className={cx('flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition', query.category === c ? 'bg-pick-500 text-white' : 'bg-ink-50 text-ink-600 hover:bg-ink-100')}>
              <i className={cx(categoryIcon(c), 'text-xs')} />
              {c}
            </button>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
          {[
            { key: 'location', label: '지역 전체', options: f.locations },
            { key: 'career', label: '경력 전체', options: f.careers },
            { key: 'company_size', label: '기업 규모 전체', options: f.company_sizes },
          ].map((s) => (
            <select key={s.key} className="input py-2.5" value={query[s.key] || ''} onChange={(e) => update({ [s.key]: e.target.value })} aria-label={s.label}>
              <option value="">{s.label}</option>
              {s.options.map((o) => <option key={o}>{o}</option>)}
            </select>
          ))}
          <select className="input py-2.5" value={query.sort || 'latest'} onChange={(e) => update({ sort: e.target.value === 'latest' ? '' : e.target.value })} aria-label="정렬">
            <option value="latest">최신 수집순</option>
            <option value="deadline">마감 임박순</option>
          </select>
        </div>
      </div>

      <div className="mb-4 flex items-center justify-between text-sm">
        <p className="text-ink-500">
          총 <strong className="text-ink-900">{jobs.data?.total ?? '-'}</strong>건
        </p>
        {activeCount > 0 && (
          <button onClick={() => setParams({})} className="font-semibold text-pick-600 hover:underline">
            <i className="fa-solid fa-rotate-left mr-1" />필터 초기화 ({activeCount})
          </button>
        )}
      </div>

      {jobs.error ? (
        <ErrorBox error={jobs.error} onRetry={jobs.reload} />
      ) : jobs.loading && !jobs.data ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-56" />)}</div>
      ) : jobs.data.items.length === 0 ? (
        <EmptyState icon="fa-solid fa-magnifying-glass" title="조건에 맞는 공고가 없습니다" description="검색어나 필터를 바꿔 다시 찾아보세요." />
      ) : (
        <>
          <div className={cx('grid gap-5 transition-opacity sm:grid-cols-2 lg:grid-cols-3', jobs.loading && 'opacity-50')}>
            {jobs.data.items.map((job) => <JobCard key={job.id} job={job} onToggleScrap={toggleScrap} />)}
          </div>
          <Pagination page={page} total={jobs.data.total} size={SIZE} onChange={(p) => update({ page: p })} />
        </>
      )}
    </div>
  )
}
