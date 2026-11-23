import { useCallback, useEffect, useState } from 'react'
import { api } from '../api'
import { useApp } from '../state'
import { Btn, PageHead, Panel, Tag } from '../components/ui'

const TABS = [['dash', 'Dashboard', '모니터링'], ['jobs', 'Postings', '공고 관리'], ['users', 'Members', '회원 관리'], ['collect', 'Collector', '수집 관리']]
const EMPTY = { company: '', title: '', region: '서울', career: '신입', size: '중견', skills: '' }

export default function Admin() {
  const { token, readOnly, role, logout } = useApp()
  const [tab, setTab] = useState('dash')
  const [stats, setStats] = useState(null)
  const [jobs, setJobs] = useState([])
  const [users, setUsers] = useState([])
  const [form, setForm] = useState(EMPTY)
  const [editId, setEditId] = useState(null)
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(true)

  const call = useCallback((path, opt = {}) => api(path, { ...opt, token }), [token])
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [s, j, u] = await Promise.all([call('/api/admin/stats'), call('/api/admin/jobs'), call('/api/admin/users')])
      setStats(s); setJobs(j); setUsers(u); setMsg('')
    } catch (e) {
      setMsg(e.message)
      if (e.status === 401 || e.status === 403) logout()
    } finally { setLoading(false) }
  }, [call, logout])
  useEffect(() => { load() }, [load])

  const write = async (fn, ok) => {
    if (readOnly) { setMsg('테스트 관리자는 읽기 전용입니다. 변경 요청이 차단되었습니다.'); return }
    try { await fn(); setMsg(ok); await load() } catch (e) { setMsg(e.message) }
  }
  const save = (e) => {
    e.preventDefault()
    const body = { ...form, skills: form.skills.split(',').map((s) => s.trim()).filter(Boolean) }
    write(() => (editId ? call(`/api/admin/jobs/${editId}`, { method: 'PUT', body }) : call('/api/admin/jobs', { method: 'POST', body })), editId ? '공고를 수정했습니다.' : '공고를 등록했습니다.')
      .then(() => { setForm(EMPTY); setEditId(null) })
  }
  const lock = readOnly ? { disabled: true, title: '읽기 전용' } : {}
  const max = stats ? Math.max(...stats.daily) : 1

  return (
    <div className="wrap pb-10">
      <PageHead no="ADMIN" en={readOnly ? 'Read-only console' : 'Console'} ko="관리자 콘솔" desc={readOnly ? '테스트 관리자 세션입니다. 화면과 데이터 조회는 정식 관리자와 동일하며, 생성·수정·삭제는 서버에서 403으로 차단됩니다.' : '정식 관리자 세션입니다. 모든 데이터의 생성·수정·삭제 권한이 있습니다.'}>
        <Tag tone={readOnly ? 'alert' : 'ink'}>{role === 'ADMIN' ? 'ADMIN · FULL ACCESS' : 'TEST ADMIN · READ-ONLY'}</Tag>
      </PageHead>
      <div className="grid gap-8 pt-8 md:grid-cols-[200px_1fr]">
        <aside className="flex gap-1 overflow-x-auto md:flex-col" aria-label="관리자 메뉴">
          {TABS.map(([k, en, ko]) => (
            <button key={k} onClick={() => setTab(k)} className={`whitespace-nowrap px-4 py-3 text-left ${tab === k ? 'bg-ink text-paper' : 'hover:bg-line'}`}>
              <div className="eyebrow text-[9px] opacity-60">{en}</div><div className="text-sm font-semibold">{ko}</div>
            </button>
          ))}
        </aside>
        <section className="min-w-0 space-y-6">
          {msg && <div className={`border px-4 py-3 text-sm ${/차단|실패|없|권한|연결/.test(msg) ? 'border-alert text-alert' : 'border-ink bg-pick'}`}>{msg}</div>}
          {loading && !stats && <Panel className="p-8 text-sm text-mute">서버에서 데이터를 불러오는 중… (무료 서버는 깨어나는 데 최대 1분)</Panel>}

          {tab === 'dash' && stats && (
            <>
              <div className="grid border border-ink sm:grid-cols-3">
                {[['수집 공고', stats.jobs], ['회원', stats.users], ['AI 분석 성공률', `${Math.round((stats.analysis.success / stats.analysis.total) * 100)}%`]].map(([l, v], i) => (
                  <div key={l} className={`bg-white p-6 ${i ? 'border-t border-ink sm:border-l sm:border-t-0' : ''}`}><div className="eyebrow text-mute">{l}</div><div className="font-serif text-5xl font-black">{v}</div></div>
                ))}
              </div>
              <Panel className="p-6">
                <div className="eyebrow mb-4">Daily collection · 최근 7일</div>
                <div className="flex h-40 items-end gap-3">{stats.daily.map((v, i) => <div key={i} className="flex flex-1 flex-col items-center gap-1"><span className="text-[10px] text-mute">{v}</span><div className="w-full bg-ink" style={{ height: `${(v / max) * 100}%` }} /></div>)}</div>
              </Panel>
              <Panel className="p-6">
                <div className="eyebrow mb-3">Sources · 성공 / 실패</div>
                <ul>{stats.sources.map((s) => <li key={s.name} className="flex justify-between border-b border-line py-2 text-sm"><span>{s.name}</span><span><b>{s.ok}</b> / <b className="text-alert">{s.fail}</b></span></li>)}</ul>
              </Panel>
            </>
          )}

          {tab === 'jobs' && (
            <>
              <Panel className="p-6">
                <div className="eyebrow mb-4">{editId ? `Edit #${editId}` : 'New posting'}</div>
                <form onSubmit={save} className="grid gap-3 sm:grid-cols-2">
                  {[['company', '기업명'], ['title', '공고명'], ['region', '지역'], ['career', '경력'], ['size', '기업 규모'], ['skills', '요구역량 (쉼표 구분)']].map(([k, l]) => (
                    <label key={k} className="text-xs">{l}<input value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} required={k === 'company' || k === 'title'} disabled={readOnly} className="mt-1 w-full border-b border-ink bg-transparent py-2 text-sm outline-none disabled:opacity-40" /></label>
                  ))}
                  <div className="flex gap-2 sm:col-span-2">
                    <Btn {...lock}>{editId ? '수정 저장' : '공고 등록'}</Btn>
                    {editId && <Btn type="button" variant="line" onClick={() => { setEditId(null); setForm(EMPTY) }}>취소</Btn>}
                  </div>
                </form>
              </Panel>
              <Panel className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead className="bg-ink text-left text-paper"><tr>{['ID', '기업', '공고', '지역', '출처', ''].map((h) => <th key={h} className="px-4 py-2 font-semibold">{h}</th>)}</tr></thead>
                  <tbody>
                    {jobs.map((j) => (
                      <tr key={j.id} className="border-t border-line">
                        <td className="px-4 py-3 text-mute">{j.id}</td><td className="px-4 font-semibold">{j.company}</td><td className="px-4">{j.title}</td><td className="px-4">{j.region}</td><td className="px-4 text-xs text-mute">{j.source}</td>
                        <td className="whitespace-nowrap px-4 text-right">
                          <Btn variant="ghost" className="px-2 py-1 text-xs" {...lock} onClick={() => { setEditId(j.id); setForm({ ...EMPTY, ...j, skills: j.skills.join(', ') }) }}>수정</Btn>
                          <Btn variant="ghost" className="px-2 py-1 text-xs text-alert" {...lock} onClick={() => write(() => call(`/api/admin/jobs/${j.id}`, { method: 'DELETE' }), '공고를 삭제했습니다.')}>삭제</Btn>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Panel>
            </>
          )}

          {tab === 'users' && (
            <Panel className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead className="bg-ink text-left text-paper"><tr>{['이메일', '이름', '가입일', '권한'].map((h) => <th key={h} className="px-4 py-2 font-semibold">{h}</th>)}</tr></thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.email} className="border-t border-line">
                      <td className="px-4 py-3">{u.email}</td><td className="px-4">{u.name}</td><td className="px-4 text-mute">{u.joined}</td>
                      <td className="px-4">
                        <select value={u.role} disabled={readOnly} onChange={(e) => write(() => call(`/api/admin/users/${encodeURIComponent(u.email)}`, { method: 'PATCH', body: { role: e.target.value } }), '권한을 변경했습니다.')} className="border border-ink bg-transparent px-2 py-1 text-xs disabled:opacity-40">
                          <option value="USER">USER</option><option value="TEST_ADMIN">TEST_ADMIN</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="border-t border-line px-4 py-3 text-[11px] text-mute">정식 관리자 권한은 화면에서 부여할 수 없으며, 서버 환경 변수 ADMIN_ACCESS_KEY로만 진입합니다.</p>
            </Panel>
          )}

          {tab === 'collect' && (
            <Panel className="p-6">
              <div className="eyebrow mb-4">Collector</div>
              <ul className="space-y-2 text-sm">
                <li className="flex justify-between border-b border-line py-2"><span>대상</span><b>공공데이터포털 · 서울 열린데이터 · 나라일터</b></li>
                <li className="flex justify-between border-b border-line py-2"><span>키워드</span><b>데이터 분석 · BI · 마케팅 분석</b></li>
                <li className="flex justify-between border-b border-line py-2"><span>스케줄</span><b>매일 06:00</b></li>
              </ul>
              <Btn className="mt-6" {...lock} onClick={() => write(async () => {}, '수집 작업을 요청했습니다. (RPA 연동 예정)')}>수동 실행</Btn>
            </Panel>
          )}
        </section>
      </div>
    </div>
  )
}
