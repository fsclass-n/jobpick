/** 백엔드는 UTC(naive) ISO 문자열을 반환하므로 타임존이 없으면 UTC 로 해석 */
export const toDate = (value) => {
  if (!value) return null
  const iso = /[zZ]|[+-]\d{2}:?\d{2}$/.test(value) ? value : `${value}Z`
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? null : d
}

export const formatDate = (value, withTime = false) => {
  const d = toDate(value)
  if (!d) return '-'
  return d.toLocaleString('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  })
}

export const timeAgo = (value) => {
  const d = toDate(value)
  if (!d) return '-'
  const diff = (Date.now() - d.getTime()) / 1000
  if (diff < 60) return '방금 전'
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}일 전`
  return formatDate(value)
}

export const dDay = (deadline) => {
  if (!deadline) return null
  const end = new Date(`${deadline}T23:59:59`)
  const days = Math.ceil((end.getTime() - Date.now()) / 86400000) - 1
  if (Number.isNaN(days)) return null
  return days < 0 ? '마감' : days === 0 ? 'D-Day' : `D-${days}`
}

export const scoreTone = (score) => {
  if (score >= 80) return { text: 'text-match-600', bg: 'bg-match-500', soft: 'bg-match-50 text-match-600', ring: '#18c99a' }
  if (score >= 60) return { text: 'text-pick-600', bg: 'bg-pick-500', soft: 'bg-pick-50 text-pick-600', ring: '#5b5bf7' }
  if (score >= 40) return { text: 'text-sun-500', bg: 'bg-sun-500', soft: 'bg-sun-50 text-sun-500', ring: '#f5a524' }
  return { text: 'text-coral-600', bg: 'bg-coral-500', soft: 'bg-coral-50 text-coral-600', ring: '#ff6b6b' }
}

export const ROLE_LABEL = { USER: '일반 사용자', TEST_ADMIN: '테스트 관리자', ADMIN: '관리자' }

export const cx = (...classes) => classes.filter(Boolean).join(' ')
