import { createContext, useContext, useMemo, useState } from 'react'
import { CUTOFF, ESSAYS, JOBS, PROFILE } from './data/mock'

const KEY = { USER: 'jobpick.user.token', TEST_ADMIN: 'jobpick.testadmin.token', ADMIN: 'jobpick.admin.token' }
const ROLE_KEY = 'jobpick.role'

const Ctx = createContext(null)
export const useApp = () => useContext(Ctx)

const clamp = (n) => Math.max(0, Math.min(100, Math.round(n)))

export function AppProvider({ children }) {
  const [role, setRole] = useState(() => sessionStorage.getItem(ROLE_KEY))
  const [targetId, setTargetId] = useState(1)
  const [scraps, setScraps] = useState([1, 2, 3, 4])
  const [owned, setOwned] = useState(PROFILE.skills)
  const [accepted, setAccepted] = useState({})
  const [interview, setInterview] = useState([])

  const login = (r, token = `mock-${r.toLowerCase()}`) => {
    Object.values(KEY).forEach((k) => sessionStorage.removeItem(k))
    sessionStorage.setItem(KEY[r], token)
    sessionStorage.setItem(ROLE_KEY, r)
    setRole(r)
  }
  const logout = () => {
    Object.values(KEY).forEach((k) => sessionStorage.removeItem(k))
    sessionStorage.removeItem(ROLE_KEY)
    setRole(null)
  }

  const value = useMemo(() => {
    const target = JOBS.find((j) => j.id === targetId)
    const baseFit = (j) => Object.values(j.radar).reduce((a, b) => a + b, 0) / 5
    const acceptedCount = Object.values(accepted).filter(Boolean).length
    const fitOf = (j) => clamp(baseFit(j) + (j.id === targetId ? acceptedCount * 3 : 0))
    const match = fitOf(target)

    const scrapped = JOBS.filter((j) => scraps.includes(j.id))
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
      target, setTargetId, scraps, toggleScrap, owned, setOwned, accepted, setAccepted,
      interview, setInterview, fitOf, match, coverage, gaps, freq, rehearse, pick, distance: CUTOFF - pick, cutoff: CUTOFF,
      essays: ESSAYS,
    }
  }, [role, targetId, scraps, owned, accepted, interview])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
