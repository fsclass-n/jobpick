import { useEffect, useState } from 'react'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

const STATUS = {
  checking: { label: 'API 서버 연결 확인 중 (최대 1분)', dot: 'bg-amber-400 animate-pulse' },
  ok: { label: 'API 서버 연결됨', dot: 'bg-emerald-500' },
  error: { label: 'API 서버 연결 실패', dot: 'bg-rose-500' },
  none: { label: 'API 주소 미설정', dot: 'bg-slate-400' },
}

export default function App() {
  const [status, setStatus] = useState(API_BASE_URL ? 'checking' : 'none')

  useEffect(() => {
    if (!API_BASE_URL) return
    fetch(`${API_BASE_URL}/api/health`, { signal: AbortSignal.timeout(90_000) })
      .then((res) => setStatus(res.ok ? 'ok' : 'error'))
      .catch(() => setStatus('error'))
  }, [])

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-50 px-6 text-center text-slate-800">
      <h1 className="text-5xl font-extrabold tracking-tight">
        job<span className="text-indigo-600">pick</span>
      </h1>
      <p className="max-w-md text-lg text-slate-600">
        공고와 나를 맞대어 딱 맞는 기회를 고른다. 생성형 AI &amp; RPA 기반 맞춤형 커리어 컨설팅
      </p>
      <div className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm shadow">
        <span className={`h-2.5 w-2.5 rounded-full ${STATUS[status].dot}`} />
        {STATUS[status].label}
        {USE_MOCK && <span className="ml-2 rounded bg-indigo-100 px-2 text-indigo-700">MOCK</span>}
      </div>
      <p className="text-xs text-slate-400">화면 개발 진행 중입니다.</p>
    </main>
  )
}
