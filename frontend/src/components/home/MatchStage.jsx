import { useEffect, useMemo, useState } from 'react'
import sampleJobs from '../../../../rpa/data/sample_jobs.json'
import { SAMPLE_RESUME } from '../../api/mock'
import { analyzeRuleBased, containsKeyword, jobKeywords } from '../../lib/analyzer'
import { cx, scoreTone } from '../../lib/format'
import { useCountUp } from '../ui/motion'

const PRESETS = ['S-1001', 'S-1011', 'S-1003'].map((id) => sampleJobs.find((j) => j.external_id === id))
const RESUME_TEXT = SAMPLE_RESUME.map((i) => i.answer).join(' ')

/**
 * 메인 히어로 인터랙션: 공고 카드와 자소서 카드가 양쪽에서 다가와 겹치면
 * 일치하는 키워드가 선으로 연결되고 적합도 점수가 카운트업됩니다.
 */
export default function MatchStage() {
  const [index, setIndex] = useState(0)
  const [run, setRun] = useState(0)
  const [phase, setPhase] = useState(0) // 0: 카드 진입, 1: 키워드 연결, 2: 점수 표시
  const job = PRESETS[index]
  const analysis = useMemo(() => analyzeRuleBased(job, SAMPLE_RESUME), [job])
  const keywords = useMemo(() => jobKeywords(job).slice(0, 7), [job])
  const matched = keywords.filter((k) => containsKeyword(RESUME_TEXT, k))
  const score = useCountUp(analysis.score, 1300, phase >= 2)
  const tone = scoreTone(analysis.score)
  const snippet = useMemo(() => {
    const sentences = RESUME_TEXT.split(/(?<=[.!?다])\s+/)
    return sentences
      .map((sentence, i) => ({ sentence, i, hits: matched.filter((k) => containsKeyword(sentence, k)).length }))
      .sort((a, b) => b.hits - a.hits || a.i - b.i)
      .slice(0, 2)
      .sort((a, b) => a.i - b.i)
      .map((x) => x.sentence)
      .join(' ')
  }, [matched])

  useEffect(() => {
    setPhase(0)
    const t1 = setTimeout(() => setPhase(1), 900)
    const t2 = setTimeout(() => setPhase(2), 1500 + matched.length * 140)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [index, run, matched.length])

  return (
    <div className="relative">
      <div className="mb-5 flex flex-wrap items-center justify-center gap-2 lg:justify-start" role="tablist" aria-label="예시 공고 선택">
        {PRESETS.map((p, i) => (
          <button
            key={p.external_id}
            role="tab"
            aria-selected={i === index}
            onClick={() => (i === index ? setRun((r) => r + 1) : setIndex(i))}
            className={cx(
              'rounded-full border px-3.5 py-1.5 text-xs font-semibold transition',
              i === index ? 'border-white bg-white text-ink-900' : 'border-white/15 text-white/70 hover:border-white/40 hover:text-white',
            )}
          >
            {p.job_category} · {p.company}
          </button>
        ))}
      </div>

      <div key={`${index}-${run}`} className="grid items-center gap-4 lg:grid-cols-[1fr_auto_1fr]">
        {/* 채용 공고 카드 */}
        <article className="animate-slide-left rounded-2xl border border-white/10 bg-white p-5 text-ink-900 shadow-lift">
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-pick-500">
            <i className="fa-solid fa-robot" /> RPA 수집 공고
          </div>
          <p className="text-xs text-ink-400">{job.company}</p>
          <h3 className="mt-0.5 font-display text-base font-bold leading-snug">{job.title}</h3>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {keywords.map((k, i) => {
              const hit = matched.includes(k)
              return (
                <span
                  key={k}
                  className={cx(
                    'rounded-md px-2 py-1 text-[11px] font-semibold transition-all duration-500',
                    phase >= 1 && hit ? 'bg-pick-500 text-white' : 'bg-ink-100 text-ink-500',
                  )}
                  style={{ transitionDelay: `${i * 120}ms` }}
                >
                  {k}
                </span>
              )
            })}
          </div>
        </article>

        {/* 매칭 브리지 */}
        <div className="relative flex flex-col items-center gap-2 py-2 lg:w-44">
          {matched.slice(0, 5).map((k, i) => (
            <div
              key={k}
              className={cx('relative flex w-full items-center justify-center transition-all duration-500', phase >= 1 ? 'opacity-100' : 'opacity-0')}
              style={{ transitionDelay: `${i * 140}ms` }}
            >
              <span
                className={cx('absolute top-1/2 left-0 h-px w-1/2 origin-left bg-gradient-to-r from-pick-400 to-transparent transition-transform duration-700 max-lg:hidden', phase >= 1 ? 'scale-x-100' : 'scale-x-0')}
                style={{ transitionDelay: `${i * 140}ms` }}
              />
              <span
                className={cx('absolute top-1/2 right-0 h-px w-1/2 origin-right bg-gradient-to-l from-match-400 to-transparent transition-transform duration-700 max-lg:hidden', phase >= 1 ? 'scale-x-100' : 'scale-x-0')}
                style={{ transitionDelay: `${i * 140}ms` }}
              />
              <span className="relative z-10 inline-flex items-center gap-1 rounded-full border border-white/15 bg-ink-900 px-3 py-1 text-[11px] font-semibold text-white shadow-glow">
                <i className="fa-solid fa-link text-[9px] text-match-400" />
                {k}
              </span>
            </div>
          ))}
          <div className={cx('mt-3 text-center transition-all duration-500', phase >= 2 ? 'scale-100 opacity-100' : 'scale-75 opacity-0')}>
            <div className="relative mx-auto grid h-28 w-28 place-items-center rounded-full bg-white shadow-glow">
              <svg viewBox="0 0 120 120" className="absolute inset-0 -rotate-90" aria-hidden="true">
                <circle cx="60" cy="60" r="52" fill="none" stroke="#e7e9f3" strokeWidth="10" />
                <circle cx="60" cy="60" r="52" fill="none" stroke={tone.ring} strokeWidth="10" strokeLinecap="round" strokeDasharray={2 * Math.PI * 52} strokeDashoffset={2 * Math.PI * 52 * (1 - score / 100)} />
              </svg>
              <div>
                <p className={cx('font-display text-3xl font-bold leading-none', tone.text)}>{Math.round(score)}</p>
                <p className="mt-1 text-[10px] font-semibold text-ink-400">적합도</p>
              </div>
            </div>
            <p className="mt-3 text-xs font-semibold text-white">{analysis.grade.label}</p>
            <p className="text-[11px] text-white/60">키워드 매칭 {Math.round(analysis.keyword_match_rate)}%</p>
          </div>
        </div>

        {/* 자소서 카드 */}
        <article className="animate-slide-right rounded-2xl border border-white/10 bg-white p-5 text-ink-900 shadow-lift">
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-match-600">
            <i className="fa-solid fa-file-lines" /> 나의 자기소개서
          </div>
          <p className="line-clamp-5 text-[13px] leading-relaxed text-ink-600">
            {snippet.split(/(\s+)/).map((w, i) => {
              const hit = phase >= 1 && matched.some((k) => containsKeyword(w, k))
              return (
                <span key={i} className={cx('rounded transition-colors duration-500', hit && 'bg-match-100 font-semibold text-match-600')}>
                  {w}
                </span>
              )
            })}
          </p>
          <div className={cx('mt-4 rounded-xl bg-sun-50 p-3 text-[12px] text-ink-700 transition-all duration-500', phase >= 2 ? 'opacity-100' : 'opacity-0')}>
            <p className="mb-1 font-semibold text-sun-500">
              <i className="fa-solid fa-pen-nib mr-1" /> 수정 가이드
            </p>
            {analysis.next_actions[0]}
          </div>
        </article>
      </div>
    </div>
  )
}
