import { useState } from 'react'
import ErrorBox from '../../components/ErrorBox'
import { Badge, Button, Modal, PageHeader, RoleBadge, Skeleton } from '../../components/ui'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import useAsync from '../../hooks/useAsync'
import { formatDate, ROLE_LABEL, timeAgo } from '../../lib/format'
import { useAdminScope } from './AdminLayout'

const PROVIDER = { local: '이메일', google: 'Google', naver: '네이버', kakao: '카카오' }

export default function AdminUsers() {
  const { api, isSandbox } = useAdminScope()
  const { adminSession, userSession } = useAuth()
  const me = isSandbox ? userSession?.user : adminSession?.user
  const toast = useToast()
  const [q, setQ] = useState('')
  const [filters, setFilters] = useState({ q: '', role: '' })
  const users = useAsync(() => api.users({ ...filters, size: 100 }), [api, filters])
  const [pending, setPending] = useState(null)
  const [busy, setBusy] = useState(false)

  const apply = async () => {
    setBusy(true)
    try {
      const updated = pending.type === 'role' ? await api.changeRole(pending.user.id, pending.value) : await api.changeActive(pending.user.id, pending.value)
      users.setData((d) => ({ ...d, items: d.items.map((u) => (u.id === updated.id ? updated : u)) }))
      toast.success(pending.type === 'role' ? `${updated.name}님의 권한을 ${ROLE_LABEL[updated.role]}(으)로 변경했습니다.` : `${updated.name}님을 ${updated.is_active ? '활성화' : '비활성화'}했습니다.`)
      setPending(null)
    } catch (e) {
      toast.error(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow={isSandbox ? 'SANDBOX USERS' : 'USERS'}
        icon="fa-solid fa-users"
        title="회원 관리"
        description={isSandbox ? '샌드박스 더미 회원을 대상으로 권한 변경 기능을 검증합니다.' : '회원 목록을 조회하고 권한(일반 사용자 ↔ 테스트 관리자)을 변경합니다. 정식 관리자 권한은 서버 스크립트로만 부여됩니다.'}
      />
      <div className="card mb-4 flex flex-col gap-2 p-4 sm:flex-row">
        <form
          className="relative flex-1"
          onSubmit={(e) => {
            e.preventDefault()
            setFilters((f) => ({ ...f, q: q.trim() }))
          }}
          role="search"
        >
          <i className="fa-solid fa-magnifying-glass absolute top-1/2 left-4 -translate-y-1/2 text-ink-300" />
          <input className="input pl-11" value={q} onChange={(e) => setQ(e.target.value)} placeholder="이름 또는 이메일 검색" aria-label="회원 검색" />
        </form>
        <select className="input sm:w-48" value={filters.role} onChange={(e) => setFilters((f) => ({ ...f, role: e.target.value }))} aria-label="권한 필터">
          <option value="">전체 권한</option>
          {Object.entries(ROLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      {users.error ? (
        <ErrorBox error={users.error} onRetry={users.reload} />
      ) : users.loading && !users.data ? (
        <Skeleton className="h-96" />
      ) : (
        <div className="card overflow-x-auto">
          <p className="border-b border-ink-100 px-6 py-3 text-sm text-ink-500">총 <strong className="text-ink-900">{users.data.total}</strong>명</p>
          <table className="w-full min-w-[820px] text-sm">
            <thead className="bg-ink-50 text-left text-xs text-ink-500">
              <tr>
                <th className="px-6 py-3 font-semibold">회원</th>
                <th className="px-4 py-3 font-semibold">가입 방식</th>
                <th className="px-4 py-3 font-semibold">권한</th>
                <th className="px-4 py-3 font-semibold">상태</th>
                <th className="px-4 py-3 font-semibold">가입일 / 최근 로그인</th>
                <th className="px-6 py-3 text-right font-semibold">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {users.data.items.map((u) => {
                const locked = u.role === 'ADMIN' || u.id === me?.id
                return (
                  <tr key={u.id} className="hover:bg-ink-50/50">
                    <td className="px-6 py-4">
                      <p className="font-semibold">{u.name}{u.id === me?.id && <span className="ml-1.5 text-xs text-pick-500">(나)</span>}</p>
                      <p className="text-xs text-ink-400">{u.email}</p>
                    </td>
                    <td className="px-4 py-4 text-ink-600">{PROVIDER[u.provider] || u.provider}</td>
                    <td className="px-4 py-4"><RoleBadge role={u.role} /></td>
                    <td className="px-4 py-4">{u.is_active ? <Badge tone="match">활성</Badge> : <Badge tone="coral">비활성</Badge>}</td>
                    <td className="px-4 py-4 text-xs text-ink-500">
                      {formatDate(u.created_at)}
                      <br />
                      {u.last_login_at ? timeAgo(u.last_login_at) : '로그인 기록 없음'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        <select
                          className="input w-36 py-2 text-xs"
                          value={u.role}
                          disabled={locked}
                          onChange={(e) => setPending({ type: 'role', user: u, value: e.target.value })}
                          aria-label={`${u.name} 권한 변경`}
                          title={locked ? '정식 관리자 및 본인 계정은 변경할 수 없습니다.' : ''}
                        >
                          {u.role === 'ADMIN' && <option value="ADMIN">관리자</option>}
                          <option value="USER">일반 사용자</option>
                          <option value="TEST_ADMIN">테스트 관리자</option>
                        </select>
                        <Button size="sm" variant="secondary" disabled={locked} onClick={() => setPending({ type: 'active', user: u, value: !u.is_active })}>
                          {u.is_active ? '비활성화' : '활성화'}
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      <Modal
        open={!!pending}
        onClose={() => setPending(null)}
        title={pending?.type === 'role' ? '권한 변경 확인' : '계정 상태 변경 확인'}
        footer={<><Button variant="secondary" onClick={() => setPending(null)}>취소</Button><Button loading={busy} onClick={apply}>변경</Button></>}
      >
        {pending?.type === 'role' ? (
          <p className="text-sm text-ink-600">
            <strong>{pending.user.name}</strong>({pending.user.email})님의 권한을 <strong>{ROLE_LABEL[pending.user.role]}</strong> → <strong className="text-pick-600">{ROLE_LABEL[pending.value]}</strong>(으)로 변경합니다.
            {pending.value === 'TEST_ADMIN' && ' 테스트 관리자는 샌드박스 콘솔에만 접근할 수 있습니다.'} 변경된 사용자는 다시 로그인해야 합니다.
          </p>
        ) : (
          <p className="text-sm text-ink-600"><strong>{pending?.user.name}</strong>님의 계정을 {pending?.value ? '활성화' : '비활성화'}합니다.</p>
        )}
        {!isSandbox && <p className="mt-3 text-xs text-ink-400"><i className="fa-solid fa-clipboard-list mr-1" />이 작업은 관리자 접속 로그에 기록됩니다.</p>}
      </Modal>
    </div>
  )
}
