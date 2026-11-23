import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { cx } from '../../lib/format'
import Logo from './Logo'

const TEAM = [
  { name: '박미금', role: '조장' },
  { name: '이오리', role: '팀원' },
  { name: '김모란', role: '팀원' },
  { name: '홍기흥', role: '팀원' },
]

const scrollTop = () => {
  window.scrollTo({ top: 0, behavior: "smooth" })
}

export function ToTopButton() {
  const [show, setShow] = useState(false)
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 480)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  return (
    <button
      onClick={scrollTop}
      aria-label="맨 위로 이동"
      className={cx(
        'fixed right-5 bottom-5 z-40 grid h-12 w-12 place-items-center rounded-2xl bg-ink-900 text-white shadow-lift transition-all duration-300 hover:-translate-y-1 hover:bg-pick-500 md:right-8 md:bottom-8',
        show ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-4 opacity-0',
      )}
    >
      <i className="fa-solid fa-arrow-up" />
    </button>
  )
}

export default function Footer() {
  return (
    <footer className="relative mt-24 overflow-hidden bg-ink-950 text-ink-300">
      <div className="bg-grid absolute inset-0 opacity-40" aria-hidden="true" />
      <div className="container-page relative py-14">
        <div className="grid gap-10 md:grid-cols-12">
          <div className="md:col-span-4">
            <Logo light />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-ink-400">
              RPA가 모은 채용 공고와 나의 자기소개서를 생성형 AI가 맞대어 보고, 합격에 가까워지는 수정 방향을 알려 드립니다.
            </p>
            <div className="mt-5 flex gap-2">
              <a href="https://github.com/fsclass-n/jobpick" target="_blank" rel="noreferrer" aria-label="GitHub 저장소" className="grid h-10 w-10 place-items-center rounded-xl bg-white/5 text-white transition hover:bg-white/10">
                <i className="fa-brands fa-github" />
              </a>
              <a href="https://fsclass-n.github.io/jobpick/" target="_blank" rel="noreferrer" aria-label="프로젝트 안내 페이지" className="grid h-10 w-10 place-items-center rounded-xl bg-white/5 text-white transition hover:bg-white/10">
                <i className="fa-solid fa-book-open" />
              </a>
            </div>
          </div>
          <div className="md:col-span-2">
            <p className="mb-4 text-sm font-semibold text-white">서비스</p>
            <ul className="space-y-2.5 text-sm">
              <li><Link to="/jobs" className="hover:text-white">채용 공고</Link></li>
              <li><Link to="/resumes" className="hover:text-white">자소서 관리</Link></li>
              <li><Link to="/analysis/new" className="hover:text-white">AI 분석</Link></li>
              <li><Link to="/history" className="hover:text-white">분석 이력</Link></li>
            </ul>
          </div>
          <div className="md:col-span-2">
            <p className="mb-4 text-sm font-semibold text-white">지원</p>
            <ul className="space-y-2.5 text-sm">
              <li><Link to="/terms" className="hover:text-white">이용약관</Link></li>
              <li><Link to="/privacy" className="font-semibold text-ink-200 hover:text-white">개인정보처리방침</Link></li>
              <li><a href="https://github.com/fsclass-n/jobpick/issues" target="_blank" rel="noreferrer" className="hover:text-white">문의하기</a></li>
            </ul>
          </div>
          <div className="md:col-span-4">
            <p className="mb-4 text-sm font-semibold text-white">Team jobpick</p>
            <ul className="grid grid-cols-2 gap-2">
              {TEAM.map((m) => (
                <li key={m.name} className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2.5 text-sm">
                  <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-pick-500 to-match-500 text-xs font-bold text-white">{m.name.slice(0, 1)}</span>
                  <span className="text-ink-100">{m.name}</span>
                  {m.role === '조장' && <span className="ml-auto rounded-md bg-pick-500/20 px-1.5 py-0.5 text-[10px] font-bold text-pick-200">조장</span>}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-6 text-xs text-ink-500 sm:flex-row">
          <p>© 2026 jobpick. 본 서비스의 분석 결과는 참고용이며 실제 채용 결과를 보장하지 않습니다.</p>
          <button onClick={scrollTop} className="group inline-flex items-center gap-2 font-semibold text-ink-300 hover:text-white">
            To the Top
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-white/5 transition group-hover:-translate-y-0.5 group-hover:bg-pick-500">
              <i className="fa-solid fa-arrow-up" />
            </span>
          </button>
        </div>
      </div>
    </footer>
  )
}
