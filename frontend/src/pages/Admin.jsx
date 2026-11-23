import { useCallback, useEffect, useState } from 'react'
import { api } from '../api'
import { useApp } from '../state'
import { Btn, Chip, Monogram, PageHead, Tile } from '../components/ui'

const TABS = [['dash', '모니터링'], ['jobs', '공고 관리'], ['users', '회원 관리'], ['collect', '수집 관리']]
const EMPTY = { company: '', title: '', region: '서울', career: '신입', size: '중견', skills: '' }
const input = 'mt-1 h-11 w-full rounded-2xl bg-bg px-4 text-sm outline-none ring-1 ring-line focus:bg-white focus:ring-2 focus:ring-navy disabled:opacity-50'

export default function Admin() {
  const { token, readOnly, logout } = useApp()
  const [tab, setTab] = useState('dash')
  const [stats, setStats] = useState(null)
  const [jobs, setJobs] = useState([])
  const [users, setUsers] = useState([])
  const [form, setForm] = useState(EMPTY)
  const [editId, setEditId] = useState(null)
  const [msg, setMsg] = useState(null)
  const [collect, setCollect] = useState(null)
  const [loading, setLoading] = useState(true)

  const call = useCallback((path, opt = {}) => api(path, { ...opt, token }), [token])
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [s, j, u] = await Promise.all([call('/api/admin/stats'), call('/api/admin/jobs'), call('/api/admin/users')])
      setStats(s); setJobs(j); setUsers(u)
    } catch (e) {
      setMsg({ bad: true, t: e.message })
      if (e.status === 401 || e.status === 403) logout()
    } finally { setLoading(false) }
  }, [call, logout])
  useEffect(() => { load() }, [load])

  const write = async (fn, ok) => {
    if (readOnly) { setMsg({ bad: true, t: '테스트 관리자는 읽기 전용입니다. 변경 요청이 차단되었습니다.' }); return false }
    try { await fn(); setMsg({ t: ok }); await load(); return true } catch (e) { setMsg({ bad: true, t: e.message }); return false }
  }
  const save = async (e) => {
    e.preventDefault()
    const body = { ...form, skills: form.skills.split(',').map((s) => s.trim()).filter(Boolean) }
    const ok = await write(() => (editId ? call(`/api/admin/jobs/${editId}`, { method: 'PUT', body }) : call('/api/admin/jobs', { method: 'POST', body })), editId ? '공고를 수정했습니다.' : '공고를 등록했습니다.')
    if (ok) { setForm(EMPTY); setEditId(null) }
  }
  const lock = readOnly ? { disabled: true, title: '읽기 전용' } : {}
  const max = stats ? Math.max(...stats.daily) : 1

  return (
    <div className="wrap pb-10">
      <PageHead step={readOnly ? 'Read-only console' : 'Admin console'} title="관리자 콘솔"
        desc={readOnly ? '화면과 조회는 실제 관리자와 같고, 생성·수정·삭제는 서버에서 403으로 차단됩니다.' : '모든 데이터의 생성·수정·삭제 권한이 있는 실제 관리자 세션입니다.'}
        aside={<Chip tone={readOnly ? 'tie' : 'navy'} className="px-4 py-2 text-xs">{readOnly ? '테스트 관리자 · 읽기 전용' : '관리자 · 전체 권한'}</Chip>} />
      <div className="grid gap-6 md:grid-cols-[220px_1fr]">
        <aside className="flex h-fit gap-1 overflow-x-auto rounded-[28px] bg-white p-2 ring-1 ring-line md:flex-col" aria-label="관리자 메뉴">
          {TABS.map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={`whitespace-nowrap rounded-2xl px-4 py-3 text-left text-sm font-semibold ${tab === k ? 'bg-navy text-white' : 'hover:bg-bg'}`}>{l}</button>)}
        </aside>
        <section className="min-w-0 space-y-4">
          {msg && <div className={`rounded-2xl px-5 py-3 text-sm font-medium ${msg.bad ? 'bg-tie/10 text-tie' : 'bg-mint/15 text-[#0b8a68]'}`}>{msg.t}</div>}
          {loading && !stats && <Tile className="p-8 text-sm text-sub">서버에서 데이터를 불러오는 중… (무료 서버는 깨어나는 데 최대 1분)</Tile>}

          {tab === 'dash' && stats && (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                {[['수집 공고', stats.jobs, 'bg-white'], ['회원', stats.users, 'bg-white'], ['AI 분석 성공률', `${Math.round((stats.analysis.success / stats.analysis.total) * 100)}%`, 'bg-mint']].map(([l, v, bg]) => (
                  <div key={l} className={`rounded-[28px] p-6 ring-1 ring-line ${bg}`}><div className="text-xs font-semibold text-sub">{l}</div><div className="num mt-1 text-5xl font-bold">{v}</div></div>
                ))}
              </div>
              <Tile className="p-6">
                <b>일별 수집 건수 · 최근 7일</b>
                <div className="mt-6 flex h-44 items-end gap-3">{stats.daily.map((v, i) => <div key={i} className="flex flex-1 flex-col items-center gap-1"><span className="num text-[11px] text-sub">{v}</span><div className={`w-full rounded-xl ${i === stats.daily.length - 1 ? 'bg-tie' : 'bg-navy'}`} style={{ height: `${(v / max) * 100}%` }} /></div>)}</div>
              </Tile>
              <Tile className="p-6">
                <b>출처별 성공 / 실패</b>
                <ul className="mt-3">{stats.sources.map((s) => <li key={s.name} className="flex justify-between border-b border-line py-3 text-sm last:border-0"><span>{s.name}</span><span className="num"><b className="text-[#0b8a68]">{s.ok}</b> / <b className="text-tie">{s.fail}</b></span></li>)}</ul>
              </Tile>
            </>
          )}

          {tab === 'jobs' && (
            <>
              <Tile className="p-6">
                <b>{editId ? `공고 #${editId} 수정` : '새 공고 등록'}</b>
                <form onSubmit={save} className="mt-4 grid gap-3 sm:grid-cols-2">
                  {[['company', '기업명'], ['title', '공고명'], ['region', '지역'], ['career', '경력'], ['size', '기업 규모'], ['skills', '요구역량 (쉼표 구분)']].map(([k, l]) => (
                    <label key={k} className="text-xs font-semibold">{l}<input value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} required={k === 'company' || k === 'title'} disabled={readOnly} className={input} /></label>
                  ))}
                  <div className="flex gap-2 sm:col-span-2">
                    <Btn {...lock}>{editId ? '수정 저장' : '공고 등록'}</Btn>
                    {editId && <Btn type="button" variant="soft" onClick={() => { setEditId(null); setForm(EMPTY) }}>취소</Btn>}
                  </div>
                </form>
              </Tile>
              <Tile className="overflow-x-auto p-2">
                <table className="w-full min-w-[640px] text-sm">
                  <thead className="text-left text-xs text-sub"><tr>{['기업', '공고', '지역', '출처', ''].map((h) => <th key={h} className="px-4 py-3 font-semibold">{h}</th>)}</tr></thead>
                  <tbody>
                    {jobs.map((j) => (
                      <tr key={j.id} className="border-t border-line">
                        <td className="px-4 py-3"><span className="flex items-center gap-2"><Monogram name={j.company} seed={j.id} className="h-8 w-8 text-xs" /><b>{j.company}</b></span></td>
                        <td className="px-4">{j.title}</td><td className="px-4">{j.region}</td><td className="px-4 text-xs text-sub">{j.source}</td>
                        <td className="whitespace-nowrap px-4 text-right">
                          <Btn size="sm" variant="ghost" {...lock} onClick={() => { setEditId(j.id); setForm({ ...EMPTY, ...j, skills: j.skills.join(', ') }) }}>수정</Btn>
                          <Btn size="sm" variant="ghost" className="text-tie" {...lock} onClick={() => write(() => call(`/api/admin/jobs/${j.id}`, { method: 'DELETE' }), '공고를 삭제했습니다.')}>삭제</Btn>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Tile>
            </>
          )}

          {tab === 'users' && (
            <Tile className="overflow-x-auto p-2">
              <table className="w-full min-w-[560px] text-sm">
                <thead className="text-left text-xs text-sub"><tr>{['이메일', '이름', '가입일', '권한'].map((h) => <th key={h} className="px-4 py-3 font-semibold">{h}</th>)}</tr></thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.email} className="border-t border-line">
                      <td className="px-4 py-3">{u.email}</td><td className="px-4">{u.name}</td><td className="px-4 text-sub">{u.joined}</td>
                      <td className="px-4">
                        <select value={u.role} disabled={readOnly} onChange={(e) => write(() => call(`/api/admin/users/${encodeURIComponent(u.email)}`, { method: 'PATCH', body: { role: e.target.value } }), '권한을 변경했습니다.')} className="h-9 rounded-full bg-bg px-3 text-xs font-semibold ring-1 ring-line disabled:opacity-50">
                          <option value="USER">USER</option><option value="TEST_ADMIN">TEST_ADMIN</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="border-t border-line px-4 py-3 text-[11px] text-sub">실제 관리자 권한은 화면에서 부여할 수 없으며, 서버 환경 변수 ADMIN_EMAIL/ADMIN_PASSWORD 계정으로만 진입합니다.</p>
            </Tile>
          )}

          {tab === 'collect' && (
            <Tile className="p-6">
              <b>수집 관리</b>
              <ul className="mt-3 text-sm">
                {[['대상', '사람인 오픈 API · 워크넷 오픈 API · HRD-Net 훈련과정'], ['지역', '서울 · 경기 · 인천'], ['직군', '웹·IT 개발 전체 (훈련과정 포함)'], ['방식', '공식 오픈 API (수동 실행)']].map(([k, v]) => <li key={k} className="flex justify-between border-b border-line py-3 last:border-0"><span className="text-sub">{k}</span><b>{v}</b></li>)}
              </ul>
              <Btn variant="tie" className="mt-4" {...lock} onClick={() => write(async () => {
                const res = await call('/api/admin/collect', { method: 'POST' })
                setCollect(res)
                return res
              }, '수집을 완료했습니다.')}>수집 실행</Btn>
              {collect && (
                <div className="mt-4 rounded-2xl bg-bg p-4 text-sm">
                  <b>신규 {collect.added}건 · 갱신 {collect.updated}건 · 전체 {collect.total}건</b>
                  <ul className="mt-2 space-y-1 text-xs text-sub">
                    {Object.entries(collect.sources).map(([k, v]) => <li key={k}>{k}: {v}</li>)}
                  </ul>
                  {Object.values(collect.sources).some((v) => v.includes('미설정')) && (
                    <p className="mt-2 text-xs text-tie">API 키가 없는 소스는 건너뜁니다. Render 환경 변수에 WORK24_API_KEY, SARAMIN_ACCESS_KEY를 등록하세요.</p>
                  )}
                </div>
              )}
            </Tile>
          )}
        </section>
      </div>
    </div>
  )
}
