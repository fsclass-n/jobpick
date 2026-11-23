import { Link } from 'react-router-dom'
import { cx, dDay } from '../lib/format'

const CATEGORY_ICON = {
  백엔드: 'fa-solid fa-server',
  프론트엔드: 'fa-solid fa-code',
  데이터: 'fa-solid fa-chart-simple',
  AI: 'fa-solid fa-brain',
  기획: 'fa-solid fa-lightbulb',
  마케팅: 'fa-solid fa-bullhorn',
  디자인: 'fa-solid fa-pen-ruler',
  경영지원: 'fa-solid fa-building',
  영업: 'fa-solid fa-handshake',
}
export const categoryIcon = (c) => CATEGORY_ICON[c] || 'fa-solid fa-briefcase'

export default function JobCard({ job, onToggleScrap, compact = false }) {
  const d = dDay(job.deadline)
  const urgent = d && (d === 'D-Day' || (d.startsWith('D-') && Number(d.slice(2)) <= 7))
  return (
    <article className="group card relative flex h-full flex-col p-5 transition duration-300 hover:-translate-y-1 hover:border-pick-200 hover:shadow-lift">
      <div className="flex items-start justify-between gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-ink-50 text-pick-500 transition group-hover:bg-pick-500 group-hover:text-white">
          <i className={categoryIcon(job.job_category)} />
        </span>
        <div className="flex items-center gap-1.5">
          {d && (
            <span className={cx('rounded-md px-2 py-1 text-[11px] font-bold', urgent ? 'bg-coral-50 text-coral-600' : 'bg-ink-100 text-ink-500')}>{d}</span>
          )}
          {onToggleScrap && (
            <button
              onClick={(e) => {
                e.preventDefault()
                onToggleScrap(job)
              }}
              className={cx('relative z-10 grid h-8 w-8 place-items-center rounded-lg transition', job.is_scrapped ? 'text-pick-500' : 'text-ink-300 hover:bg-ink-50 hover:text-ink-500')}
              aria-label={job.is_scrapped ? '스크랩 해제' : '스크랩'}
              aria-pressed={job.is_scrapped}
            >
              <i className={job.is_scrapped ? 'fa-solid fa-bookmark' : 'fa-regular fa-bookmark'} />
            </button>
          )}
        </div>
      </div>
      <p className="mt-4 text-xs font-medium text-ink-400">{job.company}</p>
      <h3 className="mt-1 line-clamp-2 font-display text-[17px] font-bold leading-snug text-ink-900">
        <Link to={`/jobs/${job.id}`} className="after:absolute after:inset-0">
          {job.title}
        </Link>
      </h3>
      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-500">
        <span><i className="fa-solid fa-location-dot mr-1 text-ink-300" />{job.location || '-'}</span>
        <span><i className="fa-solid fa-user-tie mr-1 text-ink-300" />{job.career || '-'}</span>
        {!compact && <span><i className="fa-solid fa-building mr-1 text-ink-300" />{job.company_size || '-'}</span>}
      </div>
      {!compact && (
        <div className="mt-auto flex flex-wrap gap-1.5 pt-4">
          {job.keywords.slice(0, 4).map((k) => (
            <span key={k} className="rounded-md bg-pick-50 px-2 py-0.5 text-[11px] font-semibold text-pick-600">{k}</span>
          ))}
          {job.keywords.length > 4 && <span className="px-1 text-[11px] text-ink-400">+{job.keywords.length - 4}</span>}
        </div>
      )}
    </article>
  )
}
