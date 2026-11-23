import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

/** 일반 서비스: 일반 사용자 또는 테스트 관리자 세션 */
export function RequireUser() {
  const { userSession } = useAuth()
  const location = useLocation()
  if (!userSession) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />
  return <Outlet />
}

/** 샌드박스 관리 콘솔: 테스트 관리자 세션만 */
export function RequireSandbox() {
  const { userSession } = useAuth()
  const location = useLocation()
  if (!userSession) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />
  if (userSession.session !== 'sandbox') return <Navigate to="/403" replace state={{ reason: 'sandbox' }} />
  return <Outlet />
}

/** 정식 관리자 콘솔: 정식 관리자 세션만 (일반/테스트 세션과 무관) */
export function RequireAdmin() {
  const { adminSession } = useAuth()
  const location = useLocation()
  if (!adminSession) return <Navigate to={`/admin/login?next=${encodeURIComponent(location.pathname)}`} replace />
  return <Outlet />
}
