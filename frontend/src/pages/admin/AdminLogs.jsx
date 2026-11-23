import { useState } from 'react'
import ErrorBox from '../../components/ErrorBox'
import { Badge, PageHeader, Skeleton } from '../../components/ui'
import useAsync from '../../hooks/useAsync'
import { formatDate } from '../../lib/format'
import { useAdminScope } from './AdminLayout'

const FILTERS = [
  ['', '전체'],
  ['login', '로그인'],
  ['role_change', '권한 변경'],
  ['crawl', '수집 관리'],
  ['sandbox:', '샌드박스 활동'],
]
const ACTION_LABEL = {
  login: '로그인', logout: '로그아웃', role_change: '권한 변경', active_change: '상태 변경',
  crawl_run: '수집 실행', crawl_source_create: '수집 대상 추가', crawl_source_update: '수집 대상 수정', crawl_source_delete: '수집 대상 삭제',
}

export default function AdminLogs() {
  const { api } = useAdminScope()
  const [action, setAction] = useState('')
  const logs = useAsync(() => api.logs({ action, limit: 200 }), [api, action])
  return (
    <div>
      <PageHeader eyebrow="AUDIT LOG" icon="fa-solid fa-clipboard-list" title="관리자 접속 로그" description="정식 관리자 로그인 이력과 주요 변경 작업, 테스트 관리자 샌드박스 활동을 기록합니다. (정식 관리자 전용)" />
      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map(([k, label]) => (
          <button key={k} onClick={() => setAction(k)} className={`rounded-full px-4 py-2 text-sm font-semibold ${action === k ? 'bg-ink-900 text-white' : 'bg-white text-ink-600 hover:text-ink-900'}`}>
            {label}
          </button>
        ))}
      </div>
      {logs.error ? (
        <ErrorBox error={logs.error} onRetry={logs.reload} />
      ) : logs.loading && !logs.data ? (
        <Skeleton className="h-96" />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-ink-50 text-left text-xs text-ink-500">
              <tr>
                <th className="px-6 py-3 font-semibold">시각</th>
                <th className="px-4 py-3 font-semibold">영역</th>
                <th className="px-4 py-3 font-semibold">작업</th>
                <th className="px-4 py-3 font-semibold">계정</th>
                <th className="px-4 py-3 font-semibold">내용</th>
                <th className="px-6 py-3 font-semibold">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {logs.data.map((l) => {
                const [scope, act] = l.action.split(':')
                return (
                  <tr key={l.id} className={l.success ? '' : 'bg-coral-50/50'}>
                    <td className="px-6 py-3 text-xs whitespace-nowrap text-ink-500">{formatDate(l.created_at, true)}</td>
                    <td className="px-4 py-3">{scope === 'sandbox' ? <Badge tone="sun" icon="fa-solid fa-flask">샌드박스</Badge> : <Badge tone="dark" icon="fa-solid fa-shield-halved">운영</Badge>}</td>
                    <td className="px-4 py-3 font-semibold">
                      {ACTION_LABEL[act] || act}
                      {!l.success && <span className="ml-1.5 text-xs text-coral-600">실패</span>}
                    </td>
                    <td className="px-4 py-3 text-ink-600">{l.admin_email || '-'}</td>
                    <td className="px-4 py-3 text-ink-600">{l.detail}</td>
                    <td className="px-6 py-3 font-mono text-xs text-ink-400">{l.ip}</td>
                  </tr>
                )
              })}
              {logs.data.length === 0 && (
                <tr><td colSpan={6} className="py-14 text-center text-ink-400">기록이 없습니다.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
