/**
 * 권한별 세션 저장소 (완전 분리)
 *  - 일반 사용자 / 테스트 관리자: localStorage 'jp_user_session'  (session: 'user' | 'sandbox')
 *  - 정식 관리자: sessionStorage 'jp_admin_session' (브라우저 탭을 닫으면 만료, 짧은 만료 시간)
 */
const USER_KEY = 'jp_user_session'
const ADMIN_KEY = 'jp_admin_session'

const read = (storage, key) => {
  try {
    const value = JSON.parse(storage.getItem(key) || 'null')
    if (value && value.expiresAt && value.expiresAt < Date.now()) {
      storage.removeItem(key)
      return null
    }
    return value
  } catch {
    return null
  }
}

const toSession = (data) => ({
  token: data.access_token,
  session: data.session,
  user: data.user,
  expiresAt: Date.now() + data.expires_in * 1000,
})

export const sessionStore = {
  getUser: () => read(localStorage, USER_KEY),
  setUser: (data) => {
    const session = toSession(data)
    localStorage.setItem(USER_KEY, JSON.stringify(session))
    return session
  },
  updateUser: (user) => {
    const current = read(localStorage, USER_KEY)
    if (current) localStorage.setItem(USER_KEY, JSON.stringify({ ...current, user }))
  },
  clearUser: () => localStorage.removeItem(USER_KEY),

  getAdmin: () => read(sessionStorage, ADMIN_KEY),
  setAdmin: (data) => {
    const session = toSession(data)
    sessionStorage.setItem(ADMIN_KEY, JSON.stringify(session))
    return session
  },
  clearAdmin: () => sessionStorage.removeItem(ADMIN_KEY),
}

export const UNAUTHORIZED_EVENT = 'jp:unauthorized'
