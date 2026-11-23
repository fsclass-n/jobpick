import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { api } from './api'
import { CUTOFF, ESSAYS, JOBS } from './data/mock'

const KEY = { USER: 'jobpick.user.token', TEST_ADMIN: 'jobpick.testadmin.token', ADMIN: 'jobpick.admin.token' }
const ROLE_KEY = 'jobpick.role'
const INFO_KEY = 'jobpick.user.info'

const Ctx = createContext(null)
export const useApp = () => useContext(Ctx)

const clamp = (n) => Math.max(0, Math.min(100, Math.round(n)))

export function AppProvider({ children }) {
  const [role, setRole] = useState(() => sessionStorage.getItem(ROLE_KEY))
  const [jobs, setJobs] = useState(JOBS)
  const [targetId, setTargetId] = useState(1)
  const [scraps, setScraps] = useState([])
  const [owned, setOwned] = useState([])
  const [accepted, setAccepted] = useState({})
  const [interview, setInterview] = useState([])

  const login = (r, token = `mock-${r.toLowerCase()}`, info = null) => {
    Object.values(KEY).forEach((k) => sessionStorage.removeItem(k))
    sessionStorage.setItem(KEY[r], token)
    sessionStorage.setItem(ROLE_KEY, r)
    if (info) sessionStorage.setItem(INFO_KEY, JSON.stringify(info))
    else sessionStorage.removeItem(INFO_KEY)
    setRole(r)
  }
  const logout = () => {
    Object.values(KEY).forEach((k) => sessionStorage.removeItem(k))
    sessionStorage.removeItem(ROLE_KEY)
    sessionStorage.removeItem(INFO_KEY)
    setRole(null)
  }

  // 서버에 저장된 실제 공고를 불러온다. 실패/데모 모드면 내장 샘플로 대체
  useEffect(() => {
    if (role !== 'USER') return undefined
    const token = sessionStorage.getItem(KEY.USER)
    if (!token || token.startsWith('mock-')) { setJobs(JOBS); return undefined }
    let live = true
    api('/api/jobs', { token })
      .then((rows) => {
        if (!live || !Array.isArray(rows)) return
        setJobs(rows.map((j) => ({ deadline: '', radar: {}, ...j })))
      })
      .catch(() => setJobs(JOBS))
    return () => { live = false }
  }, [role])

  const value = useMemo(() => {
    const target = jobs.find((j) => j.id === targetId) || jobs[0]
    const baseFit = (j) => (j.radar ? Object.values(j.radar).reduce((a, b) => a + b, 0) / Math.max(1, Object.keys(j.radar).length) : (j.fit || 0))
    const fitOf = (j) => clamp(baseFit(j))
    // 서류 적합도: 수락한 문항 비율만큼 목표 공고와의 적합도가 채워진다 (미작성 시 0)
    const essayDone = Object.values(accepted).filter(Boolean).length
    const match = !target || essayDone === 0 ? 0 : clamp((baseFit(target) * essayDone) / ESSAYS.length)

    const scrapped = jobs.filter((j) => scraps.includes(j.id))
    const freq = {}
    scrapped.forEach((j) => j.skills.forEach((s) => { freq[s] = (freq[s] || 0) + 1 }))
    const total = Object.values(freq).reduce((a, b) => a + b, 0) || 1
    const have = Object.entries(freq).filter(([s]) => owned.includes(s)).reduce((a, [, c]) => a + c, 0)
    const coverage = clamp((have / total) * 100)
    const gaps = Object.entries(freq).filter(([s]) => !owned.includes(s)).sort((a, b) => b[1] - a[1])

    const rehearse = interview.length ? clamp(interview.reduce((a, b) => a + b, 0) / interview.length) : 0
    const pick = clamp(match * 0.5 + coverage * 0.3 + rehearse * 0.2)
    const toggleScrap = (id) => setScraps((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))

    return {
      role, isAdmin: role === 'ADMIN' || role === 'TEST_ADMIN', readOnly: role === 'TEST_ADMIN',
      token: role ? sessionStorage.getItem(KEY[role]) : null, login, logout,
      user: role === 'USER' ? JSON.parse(sessionStorage.getItem(INFO_KEY) || 'null') : null,
      target, setTargetId, scraps, toggleScrap, owned, setOwned, accepted, setAccepted,
      interview, setInterview, fitOf, match, coverage, gaps, freq, rehearse, pick, distance: CUTOFF - pick, cutoff: CUTOFF,
      essays: ESSAYS, jobs,
    }
  }, [role, jobs, targetId, scraps, owned, accepted, interview])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
