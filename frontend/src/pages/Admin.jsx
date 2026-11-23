import { useState } from 'react'
import { Badge, Card } from '../components/ui'
import { ADMIN } from '../data/mock'

const TABS = [['dash', '모니터링'], ['users', '회원 관리'], ['collect', '수집 관리'], ['logs', '접속 로그']]

export default function Admin() {
  const [tab, setTab] = useState('dash')
  const users = ADMIN.users
  const max = Math.max(...ADMIN.daily)
  const rate = Math.round((ADMIN.analysis.success / ADMIN.analysis.total) * 100)
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 md:flex-row">
      <aside className="flex gap-2 md:w-48 md:flex-col" aria-label="관리자 메뉴">
        {TABS.map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`rounded-xl px-4 py-2 text-left text-sm ${tab === k ? 'bg-ink text-white' : 'bg-white hover:bg-slate-100'}`}>{l}</button>
        ))}
      </aside>
      <section className="flex-1 space-y-4">
        {tab === 'dash' && (
          <>
            <Card>
              <h2 className="mb-3 font-bold">일별 공고 수집 건수</h2>
              <div className="flex h-32 items-end gap-2">{ADMIN.daily.map((v, i) => <div key={i} className="flex-1 rounded-t bg-brand" style={{ height: `${(v / max) * 100}%` }} title={`${v}건`} />)}</div>
            </Card>
            <div className="grid gap-4 sm:grid-cols-2">
              <Card>
                <h2 className="mb-3 font-bold">출처별 성공/실패</h2>
                <ul className="space-y-1 text-sm">{ADMIN.sources.map((s) => <li key={s.name} className="flex justify-between"><span>{s.name}</span><span><b className="text-emerald-600">{s.ok}</b> / <b className="text-rose-600">{s.fail}</b></span></li>)}</ul>
              </Card>
              <Card><h2 className="mb-2 font-bold">AI 분석 성공률</h2><div className="font-display text-4xl font-extrabold">{rate}%</div><div className="text-sm text-slate-500">{ADMIN.analysis.success} / {ADMIN.analysis.total}건</div></Card>
            </div>
          </>
        )}
        {tab === 'users' && (
          <Card>
            <h2 className="mb-3 font-bold">회원 목록</h2>
            <table className="w-full text-sm"><tbody>
              {users.map((u) => (
                <tr key={u.email} className="border-t"><td className="py-2">{u.email}</td><td>{u.joined}</td><td><Badge tone="brand">{u.role}</Badge></td></tr>
              ))}
            </tbody></table>
            <p className="mt-3 text-xs text-slate-400">관리자 권한 부여는 서버 스크립트로만 가능합니다. (데모: 읽기 전용)</p>
          </Card>
        )}
        {tab === 'collect' && (
          <Card>
            <h2 className="mb-3 font-bold">수집 관리</h2>
            <ul className="space-y-2 text-sm"><li>대상: 공공데이터포털, 서울 열린데이터, 나라일터</li><li>키워드: 데이터 분석, BI, 마케팅 분석</li><li>스케줄: 매일 06:00 (정식 관리자만 변경)</li></ul>
            <button className="mt-3 rounded-lg bg-brand px-4 py-2 text-sm text-white">수동 실행 (데모)</button>
          </Card>
        )}
        {tab === 'logs' && <Card><h2 className="mb-3 font-bold">관리자 접속 로그</h2><p className="text-sm text-slate-500">백엔드 연동 후 로그인 이력(TOTP 결과 포함)과 변경 작업이 표시됩니다.</p></Card>}
      </section>
    </div>
  )
}
