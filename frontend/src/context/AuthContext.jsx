import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api, sessionStore } from '../api'
import { UNAUTHORIZED_EVENT } from '../api/session'
import { useToast } from './ToastContext'

const AuthContext = createContext(null)

/**
 * 세션 2종을 독립적으로 관리
 *  - userSession : 일반 사용자('user') 또는 테스트 관리자('sandbox')
 *  - adminSession: 정식 관리자('admin') - 별도 저장소, 짧은 만료, 자동 로그아웃
 */
export function AuthProvider({ children }) {
  const toast = useToast()
  const [userSession, setUserSession] = useState(() => sessionStore.getUser())
  const [adminSession, setAdminSession] = useState(() => sessionStore.getAdmin())

  const logoutUser = useCallback(() => {
    sessionStore.clearUser()
    setUserSession(null)
  }, [])
  const logoutAdmin = useCallback(async () => {
    await api.adminAuth.logout()
    sessionStore.clearAdmin()
    setAdminSession(null)
  }, [])

  useEffect(() => {
    const onUnauthorized = (e) => {
      if (e.detail === 'admin') {
        sessionStore.clearAdmin()
        setAdminSession(null)
        toast.error('관리자 세션이 만료되었습니다. 다시 로그인해 주세요.')
      } else {
        sessionStore.clearUser()
        setUserSession(null)
        toast.error('로그인이 만료되었습니다. 다시 로그인해 주세요.')
      }
    }
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized)
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized)
  }, [toast])

  // 정식 관리자 세션 만료 시 자동 로그아웃
  useEffect(() => {
    if (!adminSession) return undefined
    const left = adminSession.expiresAt - Date.now()
    const timer = setTimeout(() => {
      sessionStore.clearAdmin()
      setAdminSession(null)
      toast.info('관리자 세션 시간이 만료되어 자동 로그아웃되었습니다.')
    }, Math.max(0, left))
    return () => clearTimeout(timer)
  }, [adminSession, toast])

  // 저장된 사용자 세션의 권한 정보 최신화
  useEffect(() => {
    if (!sessionStore.getUser()) return
    api.auth
      .me()
      .then((user) => {
        sessionStore.updateUser(user)
        setUserSession(sessionStore.getUser())
      })
      .catch((e) => e.status === 403 && logoutUser())
  }, [logoutUser])

  const applyUser = useCallback((data) => {
    const session = sessionStore.setUser(data)
    setUserSession(session)
    return session
  }, [])

  const value = useMemo(
    () => ({
      userSession,
      adminSession,
      user: userSession?.user || null,
      isSandbox: userSession?.session === 'sandbox',
      login: async (email, password) => applyUser(await api.auth.login(email, password)),
      signup: async (body) => applyUser(await api.auth.signup(body)),
      applyUser,
      completeOAuth: async (token, session) => {
        sessionStore.setUser({ access_token: token, session, expires_in: 720 * 60, user: null })
        try {
          const user = await api.auth.me()
          sessionStore.updateUser(user)
          setUserSession(sessionStore.getUser())
        } catch (e) {
          sessionStore.clearUser()
          throw e
        }
      },
      logoutUser,
      loginAdmin: async (email, password, otp) => {
        const session = sessionStore.setAdmin(await api.adminAuth.login(email, password, otp))
        setAdminSession(session)
        return session
      },
      logoutAdmin,
    }),
    [userSession, adminSession, applyUser, logoutUser, logoutAdmin],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
