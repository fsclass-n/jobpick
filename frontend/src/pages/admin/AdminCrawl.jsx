import { useEffect, useState } from 'react'
import ErrorBox from '../../components/ErrorBox'
import { Badge, Button, Modal, PageHeader, Skeleton } from '../../components/ui'
import { useToast } from '../../context/ToastContext'
import useAsync from '../../hooks/useAsync'
import { cx, formatDate } from '../../lib/format'
import { useAdminScope } from './AdminLayout'

const KINDS = {
  sample: { label: '샘플 피드 (오프라인)', icon: 'fa-solid fa-box-archive' },
  worknet: { label: '고용24 Open API', icon: 'fa-solid fa-landmark' },
  html: { label: 'HTML 게시판 (BS4)', icon: 'fa-solid fa-code' },
  playwright: { label: 'JS 렌더링 (Playwright)', icon: 'fa-solid fa-masks-theater' },
}
const STATUS = { success: ['match', '성공'], failed: ['coral', '실패'], running: ['sun', '진행 중'] }
const EMPTY = { name: '', kind: 'sample', url: '', keywords: '', schedule: '매일 09:00', enabled: true, config: '{}' }

function SourceForm({ initial, isSandbox, onSubmit, onClose }) {
  const [form, setForm] = useState(initial)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))
  const submit = async () => {
    let config
    try {
      config = JSON.parse(form.config || '{}')
    } catch {
      return setError('config 는 올바른 JSON 이어야 합니다.')
    }
    setBusy(true)
    setError('')
    try {
      await onSubmit({ ...form, config, keywords: form.keywords.split(',').map((k) => k.trim()).filter(Boolean) })
    } catch (e) {
      setError(e.message)
      setBusy(false)
    }
  }
  return (
    <Modal open onClose={onClose} title={initial.id ? '수집 대상 수정' : '수집 대상 추가'} size="lg" footer={<><Button variant="secondary" onClick={onClose}>취소</Button><Button loading={busy} onClick={submit}>저장</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label" htmlFor="src-name">이름</label>
          <input id="src-name" className="input" value={form.name} onChange={set('name')} />
        </div>
        <div>
          <label className="label" htmlFor="src-kind">수집기 종류</label>
          <select id="src-kind" className="input" value={form.kind} onChange={set('kind')}>
            {Object.entries(KINDS).map(([k, v]) => <option key={k} value={k} disabled={isSandbox && k !== 'sample'}>{v.label}{isSandbox && k !== 'sample' ? ' (운영 전용)' : ''}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="src-schedule">실행 스케줄</label>
          <input id="src-schedule" className="input" value={form.schedule} onChange={set('schedule')} placeholder="매일 09:00" />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="src-url">URL {form.kind === 'worknet' && <span className="font-normal text-ink-400">(비우면 WORKNET_API_URL 사용)</span>}</label>
          <input id="src-url" className="input" value={form.url} onChange={set('url')} placeholder="https://" />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="src-kw">수집 키워드 (쉼표 구분)</label>
          <input id="src-kw" className="input" value={form.keywords} onChange={set('keywords')} placeholder="개발, 데이터, 마케팅" />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="src-config">config (JSON) — HTML/Playwright 는 item·fields 선택자 필요</label>
          <textarea id="src-config" className="input min-h-32 font-mono text-xs" value={form.config} onChange={set('config')} spellCheck={false} />
        </div>
        <label className="flex items-center gap-2 text-sm font-semibold text-ink-700">
          <input type="checkbox" className="h-4 w-4 accent-pick-500" checked={form.enabled} onChange={set('enabled')} /> 스케줄 활성화
        </label>
      </div>
      {error && <p className="mt-4 rounded-xl bg-coral-50 px-4 py-3 text-sm text-coral-600">{error}</p>}
      <p className="mt-4 text-xs text-ink-400"><i className="fa-solid fa-scale-balanced mr-1" />수집 대상 사이트의 이용약관과 robots.txt 를 확인한 뒤 등록하세요. 수집기는 robots.txt 에서 금지한 경로를 수집하지 않습니다.</p>
    </Modal>
  )
}

export default function AdminCrawl() {
  const { api, isSandbox } = useAdminScope()
  const toast = useToast()
  const sources = useAsync(() => api.sources(), [api])
  const runs = useAsync(() => api.runs(), [api])
  const [editing, setEditing] = useState(null)
  const [running, setRunning] = useState(null)
  const [poll, setPoll] = useState(0)

  useEffect(() => {
    if (!poll) return undefined
    const t = setTimeout(() => {
      runs.reload()
      setPoll((p) => p - 1)
    }, 2000)
    return () => clearTimeout(t)
  }, [poll]) // eslint-disable-line react-hooks/exhaustive-deps

  const save = async (body) => {
    const saved = editing.id ? await api.updateSource(editing.id, body) : await api.createSource(body)
    sources.setData((list) => (editing.id ? list.map((s) => (s.id === saved.id ? saved : s)) : [...list, saved]))
    toast.success('수집 대상을 저장했습니다.')
    setEditing(null)
  }
  const toggle = async (s) => {
    try {
      const saved = await api.updateSource(s.id, { ...s, enabled: !s.enabled })
      sources.setData((list) => list.map((x) => (x.id === saved.id ? saved : x)))
    } catch (e) {
      toast.error(e.message)
    }
  }
  const run = async (s) => {
    setRunning(s.id)
    try {
      toast.info((await api.runSource(s.id)).message)
      runs.reload()
      setPoll(5)
    } catch (e) {
      toast.error(e.message)
    } finally {
      setRunning(null)
    }
  }
  const remove = async (s) => {
    if (!window.confirm(`'${s.name}' 수집 대상을 삭제할까요?`)) return
    try {
      await api.deleteSource(s.id)
      sources.setData((list) => list.filter((x) => x.id !== s.id))
      toast.success('삭제했습니다.')
    } catch (e) {
      toast.error(e.message)
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow={isSandbox ? 'SANDBOX CRAWLER' : 'RPA CRAWLER'}
        icon="fa-solid fa-robot"
        title="수집 관리"
        description={isSandbox ? '샌드박스에서는 오프라인 샘플 수집기만 실행할 수 있으며, 결과는 샌드박스 공고로 저장됩니다.' : '크롤링 대상 사이트·키워드와 실행 스케줄을 관리하고, 수집 작업을 수동으로 실행합니다.'}
        actions={<Button icon="fa-solid fa-plus" onClick={() => setEditing({ ...EMPTY, kind: 'sample' })}>수집 대상 추가</Button>}
      />
      {sources.error ? (
        <ErrorBox error={sources.error} onRetry={sources.reload} />
      ) : sources.loading ? (
        <Skeleton className="h-60" />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {sources.data.map((s) => (
            <article key={s.id} className={cx('card p-5', !s.enabled && 'opacity-75')}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-ink-50 text-pick-500"><i className={KINDS[s.kind]?.icon} /></span>
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{s.name}</p>
                    <p className="text-xs text-ink-400">{KINDS[s.kind]?.label}</p>
                  </div>
                </div>
                <button
                  role="switch"
                  aria-checked={s.enabled}
                  aria-label={`${s.name} 스케줄 ${s.enabled ? '끄기' : '켜기'}`}
                  onClick={() => toggle(s)}
                  className={cx('relative h-6 w-11 shrink-0 rounded-full transition', s.enabled ? 'bg-match-500' : 'bg-ink-200')}
                >
                  <span className={cx('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all', s.enabled ? 'left-[22px]' : 'left-0.5')} />
                </button>
              </div>
              <dl className="mt-4 space-y-1.5 text-xs text-ink-500">
                <div className="flex gap-2"><dt className="w-14 shrink-0 text-ink-400">스케줄</dt><dd className="font-semibold text-ink-700">{s.schedule}</dd></div>
                {s.url && <div className="flex gap-2"><dt className="w-14 shrink-0 text-ink-400">URL</dt><dd className="truncate">{s.url}</dd></div>}
                <div className="flex gap-2"><dt className="w-14 shrink-0 text-ink-400">키워드</dt><dd>{s.keywords.length ? s.keywords.join(', ') : '전체'}</dd></div>
              </dl>
              <div className="mt-4 flex gap-2">
                <Button size="sm" className="flex-1" loading={running === s.id} onClick={() => run(s)} icon="fa-solid fa-play">지금 실행</Button>
                <Button size="sm" variant="secondary" onClick={() => setEditing({ ...s, keywords: s.keywords.join(', '), config: JSON.stringify(s.config, null, 2) })} icon="fa-solid fa-pen" aria-label="수정" />
                <Button size="sm" variant="ghost" onClick={() => remove(s)} icon="fa-regular fa-trash-can" aria-label="삭제" />
              </div>
            </article>
          ))}
        </div>
      )}

      <section className="card mt-8 overflow-x-auto">
        <div className="flex items-center justify-between border-b border-ink-100 px-6 py-4">
          <h2 className="font-bold">최근 수집 실행 이력</h2>
          <Button size="sm" variant="ghost" onClick={runs.reload} icon={cx('fa-solid fa-rotate', runs.loading && 'fa-spin')}>새로고침</Button>
        </div>
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-ink-50 text-left text-xs text-ink-500">
            <tr>
              <th className="px-6 py-3 font-semibold">수집 대상</th>
              <th className="px-4 py-3 font-semibold">상태</th>
              <th className="px-4 py-3 font-semibold">실행 방식</th>
              <th className="px-4 py-3 text-right font-semibold">수집 / 신규</th>
              <th className="px-6 py-3 font-semibold">시작 시각</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {(runs.data || []).map((r) => (
              <tr key={r.id}>
                <td className="px-6 py-3">
                  <p className="font-medium">{r.source_name}</p>
                  {r.error && <p className="mt-0.5 max-w-md truncate text-xs text-coral-500" title={r.error}>{r.error}</p>}
                </td>
                <td className="px-4 py-3"><Badge tone={STATUS[r.status]?.[0]}>{STATUS[r.status]?.[1] || r.status}</Badge></td>
                <td className="px-4 py-3 text-ink-500">{{ manual: '수동', schedule: '스케줄', cli: 'CLI', seed: '초기 데이터' }[r.trigger] || r.trigger}</td>
                <td className="px-4 py-3 text-right font-semibold">{r.collected_count} / <span className="text-pick-600">{r.new_count}</span></td>
                <td className="px-6 py-3 text-xs text-ink-500">{formatDate(r.started_at, true)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      {editing && <SourceForm initial={editing} isSandbox={isSandbox} onSubmit={save} onClose={() => setEditing(null)} />}
    </div>
  )
}
