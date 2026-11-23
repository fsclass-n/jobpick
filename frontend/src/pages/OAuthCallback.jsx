import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Spinner } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

/** 백엔드 OAuth 콜백이 #token=...&session=... 형태로 돌려보내는 페이지 */
export default function OAuthCallback() {
  const { completeOAuth } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const done = useRef(false)
  useEffect(() => {
    if (done.current) return
    done.current = true
    const hash = new URLSearchParams(window.location.hash.slice(1))
    window.history.replaceState(null, '', window.location.pathname)
    const token = hash.get('token')
    if (!token) {
      navigate(`/login#error=${encodeURIComponent(hash.get('error') || '소셜 로그인에 실패했습니다.')}`, { replace: true })
      return
    }
    completeOAuth(token, hash.get('session') || 'user')
      .then(() => {
        toast.success('소셜 계정으로 로그인했습니다.')
        navigate('/dashboard', { replace: true })
      })
      .catch((e) => navigate(`/login#error=${encodeURIComponent(e.message)}`, { replace: true }))
  }, [completeOAuth, navigate, toast])
  return <Spinner label="소셜 로그인 처리 중..." className="py-40" />
}
