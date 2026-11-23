import { useState } from 'react'
import { cx, scoreTone } from '../lib/format'
import { Badge, KeywordChip } from './ui'
import { ProgressBar, ScoreRing } from './ui/charts'

const SECTION_LABEL = {
  keyword: { label: '핵심 키워드 매칭', icon: 'fa-solid fa-key', weight: 35 },
  requirements: { label: '자격요건 충족도', icon: 'fa-solid fa-list-check', weight: 25 },
  preferred: { label: '우대사항 충족도', icon: 'fa-solid fa-star', weight: 10 },
  talent: { label: '인재상 부합도', icon: 'fa-solid fa-people-group', weight: 10 },
  writing: { label: '문장 완성도 (STAR·정량)', icon: 'fa-solid fa-pen-nib', weight: 20 },
}
const GRADE_TONE = { high: 'match', medium: 'pick', low: 'sun', critical: 'coral' }

function Coverage({ title, items }) {
  if (!items?.length) return null
  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-ink-700">{title}</p>
      <ul className="space-y-2">
        {items.map((d) => (
          <li key={d.text} className="flex items-start gap-2.5 text-sm">
            <i className={cx('fa-solid mt-1 text-xs', d.matched ? 'fa-circle-check text-match-500' : 'fa-circle-xmark text-coral-400')} />
            <span className={d.matched ? 'text-ink-700' : 'text-ink-500'}>
              {d.text}
              {d.evidence?.length > 0 && <span className="ml-1.5 text-xs text-ink-400">({d.evidence.join(', ')})</span>}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function QuestionCard({ item, index, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen)
  const tone = scoreTone(item.score)
  return (
    <div className="rounded-2xl border border-ink-100 bg-white">
      <button className="flex w-full items-center gap-4 p-5 text-left" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <span className={cx('grid h-12 w-12 shrink-0 place-items-center rounded-xl font-display text-lg font-bold', tone.soft)}>{Math.round(item.score)}</span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-ink-400">문항 {index + 1} · {item.length}자</p>
          <p className="mt-0.5 line-clamp-2 font-semibold text-ink-900">{item.question}</p>
        </div>
        <i className={cx('fa-solid fa-chevron-down text-ink-300 transition', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="space-y-4 border-t border-ink-100 p-5">
          {item.matched_keywords?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {item.matched_keywords.map((k) => <KeywordChip key={k} matched>{k}</KeywordChip>)}
              {item.suggested_keywords?.map((k) => <KeywordChip key={k} matched={false}>{k}</KeywordChip>)}
            </div>
          )}
          <div>
            <p className="mb-2 text-sm font-semibold text-ink-700"><i className="fa-solid fa-pen-to-square mr-1.5 text-pick-500" />수정 가이드라인</p>
            <ul className="space-y-2">
              {item.feedback.map((f, i) => (
                <li key={i} className="flex gap-2 text-sm leading-relaxed text-ink-600">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-pick-400" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
          {item.example && (
            <div className="rounded-xl bg-match-50 p-4">
              <p className="mb-1 text-xs font-bold text-match-600"><i className="fa-solid fa-lightbulb mr-1" />개선 예시 문장</p>
              <p className="text-sm leading-relaxed text-ink-700">{item.example}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function ReportView({ analysis, compact = false }) {
  const r = analysis.result || {}
  const grade = r.grade || { label: '-', level: 'low' }
  return (
    <div className="space-y-6">
      {r.notice && (
        <div className="rounded-xl border border-sun-400/40 bg-sun-50 px-4 py-3 text-sm text-ink-700">
          <i className="fa-solid fa-triangle-exclamation mr-2 text-sun-500" />
          {r.notice}
        </div>
      )}
      <section className="card grid gap-8 p-6 md:grid-cols-[auto_1fr] md:p-8">
        <div className="flex flex-col items-center">
          <ScoreRing score={analysis.score} size={compact ? 150 : 180} />
          <Badge tone={GRADE_TONE[grade.level]} className="mt-4">{grade.label}</Badge>
          <p className="mt-2 text-xs text-ink-400">
            {analysis.engine === 'gemini' ? <><i className="fa-solid fa-wand-magic-sparkles mr-1" />Gemini AI 분석</> : <><i className="fa-solid fa-gears mr-1" />규칙 기반 엔진 분석</>}
          </p>
        </div>
        <div>
          <p className="text-sm font-semibold text-pick-500">{analysis.company}</p>
          <h2 className="mt-1 text-xl font-bold md:text-2xl">{analysis.job_title}</h2>
          <p className="mt-1 text-xs text-ink-400">{analysis.resume_title} · v{analysis.resume_version}</p>
          <p className="mt-4 leading-relaxed text-ink-600">{r.summary}</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {Object.entries(SECTION_LABEL).map(([key, s]) => (
              <div key={key}>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="text-ink-600"><i className={cx(s.icon, 'mr-1.5 w-4 text-ink-300')} />{s.label}<span className="ml-1 text-[11px] text-ink-300">({s.weight}%)</span></span>
                  <span className="font-semibold">{Math.round(r.section_scores?.[key] ?? 0)}</span>
                </div>
                <ProgressBar value={r.section_scores?.[key] ?? 0} />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <h3 className="mb-4 flex items-center gap-2 font-bold"><i className="fa-solid fa-key text-pick-500" />키워드 매칭 <span className="text-sm font-medium text-ink-400">{Math.round(analysis.keyword_match_rate)}%</span></h3>
          <p className="mb-2 text-xs font-semibold text-ink-400">자소서에 드러난 키워드</p>
          <div className="flex flex-wrap gap-1.5">
            {r.matched_keywords?.length ? r.matched_keywords.map((k) => <KeywordChip key={k} matched>{k}</KeywordChip>) : <span className="text-sm text-ink-400">없음</span>}
          </div>
          <p className="mt-5 mb-2 text-xs font-semibold text-ink-400">보완이 필요한 키워드</p>
          <div className="flex flex-wrap gap-1.5">
            {r.missing_keywords?.length ? r.missing_keywords.map((k) => <KeywordChip key={k} matched={false}>{k}</KeywordChip>) : <span className="text-sm text-ink-400">모두 반영되었습니다</span>}
          </div>
        </div>
        <div className="card space-y-5 p-6">
          <div>
            <h3 className="mb-3 flex items-center gap-2 font-bold"><i className="fa-solid fa-thumbs-up text-match-500" />강점</h3>
            <ul className="space-y-2">{r.strengths?.map((s, i) => <li key={i} className="flex gap-2 text-sm text-ink-600"><i className="fa-solid fa-check mt-1 text-xs text-match-500" />{s}</li>)}</ul>
          </div>
          <div>
            <h3 className="mb-3 flex items-center gap-2 font-bold"><i className="fa-solid fa-screwdriver-wrench text-coral-500" />보완점</h3>
            <ul className="space-y-2">{r.improvements?.map((s, i) => <li key={i} className="flex gap-2 text-sm text-ink-600"><i className="fa-solid fa-arrow-right mt-1 text-xs text-coral-400" />{s}</li>)}</ul>
          </div>
        </div>
      </section>

      {!compact && (
        <section className="card grid gap-6 p-6 md:grid-cols-3">
          <Coverage title="자격요건" items={r.requirements} />
          <Coverage title="우대사항" items={r.preferred} />
          <Coverage title="인재상" items={r.talent} />
        </section>
      )}

      <section>
        <h3 className="mb-4 flex items-center gap-2 text-lg font-bold"><i className="fa-solid fa-list-ol text-pick-500" />문항별 수정 가이드라인</h3>
        <div className="space-y-3">
          {(compact ? r.question_feedback?.slice(0, 2) : r.question_feedback)?.map((q, i) => (
            <QuestionCard key={i} item={q} index={i} defaultOpen={i === 0} />
          ))}
        </div>
      </section>

      {!compact && r.next_actions?.length > 0 && (
        <section className="rounded-2xl bg-ink-900 p-6 text-white">
          <h3 className="mb-4 flex items-center gap-2 font-bold"><i className="fa-solid fa-flag-checkered text-match-400" />다음 행동</h3>
          <ol className="grid gap-3 md:grid-cols-2">
            {r.next_actions.map((a, i) => (
              <li key={i} className="flex gap-3 rounded-xl bg-white/5 p-4 text-sm text-ink-100">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-match-500 text-xs font-bold text-ink-950">{i + 1}</span>
                {a}
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  )
}
