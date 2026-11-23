import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

/** 스크랩 토글: 로그인하지 않았으면 로그인 페이지로 안내 */
export default function useScrap(onChange) {
  const { userSession } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  return async (job) => {
    if (!userSession) {
      toast.info('로그인 후 관심 공고를 스크랩할 수 있습니다.')
      navigate(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`)
      return
    }
    try {
      if (job.is_scrapped) await api.jobs.unscrap(job.id)
      else await api.jobs.scrap(job.id)
      onChange({ ...job, is_scrapped: !job.is_scrapped })
      toast.success(job.is_scrapped ? '스크랩을 해제했습니다.' : '관심 공고에 스크랩했습니다.')
    } catch (e) {
      toast.error(e.message)
    }
  }
}
