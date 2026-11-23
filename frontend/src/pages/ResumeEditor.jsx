import { useEffect, useRef, useState } from 'react'
import { Link, useBlocker, useNavigate, useParams } from 'react-router-dom'
import { api, USE_MOCK } from '../api'
import ErrorBox from '../components/ErrorBox'
import { Badge, Button, Modal, Spinner } from '../components/ui'
import { useToast } from '../context/ToastContext'
import { cx, formatDate } from '../lib/format'

const EMPTY = { title: '', target_job: '', items: [{ question: '1. 지원 동기를 작성해 주세요.', answer: '' }] }
const JOBS = ['백엔드', '프론트엔드', '데이터', 'AI', '기획', '마케팅', '디자인', '경영지원', '영업', '기타']
const ACCEPT = '.pdf,.png,.jpg,.jpeg,.webp,.txt'

function UploadPanel({ onApply }) {
  const toast = useToast()
  const inputRef = useRef(null)
  const [drag, setDrag] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)

  const handle = async (file) => {
    if (!file) return
    if (file.size > 10 * 1024 * 1024) return toast.error('파일은 10MB 이하만 업로드할 수 있습니다.')
    setLoading(true)
    setResult(null)
    try {
      setResult({ ...(await api.resumes.ocr(file)), name: file.name })
    } catch (e) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDrag(true)
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDrag(false)
          handle(e.dataTransfer.files[0])
        }}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && inputRef.current?.click()}
        role="button"
        tabIndex={0}
        className={cx('flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-12 text-center transition', drag ? 'border-pick-500 bg-pick-50' : 'border-ink-200 bg-ink-50 hover:border-pick-300')}
      >
        <input ref={inputRef} type="file" accept={ACCEPT} className="hidden" onChange={(e) => handle(e.target.files[0])} />
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white text-2xl text-pick-500 shadow-card">
          <i className={loading ? 'fa-solid fa-circle-notch fa-spin' : 'fa-solid fa-cloud-arrow-up'} />
        </div>
        <p className="mt-4 font-semibold">{loading ? 'OCR로 텍스트를 추출하는 중...' : '파일을 끌어다 놓거나 클릭해 선택하세요'}</p>
        <p className="mt-1 text-xs text-ink-400">PDF, PNG, JPG, WEBP, TXT · 최대 10MB {USE_MOCK && '· 데모 환경은 TXT만 지원'}</p>
      </div>
      {result && (
        <div className="rounded-2xl border border-ink-100 bg-white p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold"><i className="fa-solid fa-file-circle-check mr-1.5 text-match-500" />{result.name}</p>
            <Badge tone="match">{result.engine} · 문항 {result.items.length}개 인식</Badge>
          </div>
          <pre className="max-h-48 overflow-y-auto rounded-xl bg-ink-50 p-4 font-sans text-xs leading-relaxed whitespace-pre-wrap text-ink-600">{result.text}</pre>
          <Button className="mt-4 w-full" icon="fa-solid fa-arrow-down" onClick={() => onApply(result)}>인식된 문항을 편집기에 적용</Button>
        </div>
      )}
    </div>
  )
}

export default function ResumeEditor() {
  const { id } = useParams()
  const isNew = !id
  const navigate = useNavigate()
  const toast = useToast()
  const [form, setForm] = useState(EMPTY)
  const [saved, setSaved] = useState(JSON.stringify(EMPTY))
  const [resume, setResume] = useState(null)
  const [mode, setMode] = useState('text')
  const [upload, setUpload] = useState(null)
  const [loading, setLoading] = useState(!isNew)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [preview, setPreview] = useState(null)
  const dirty = JSON.stringify(form) !== saved
  const blocker = useBlocker(({ currentLocation, nextLocation }) => dirty && !saving && currentLocation.pathname !== nextLocation.pathname)

  const load = (data) => {
    const f = { title: data.title, target_job: data.target_job || '', items: data.items }
    setResume(data)
    setForm(f)
    setSaved(JSON.stringify(f))
  }

  useEffect(() => {
    if (isNew) return
    setLoading(true)
    api.resumes.get(id).then(load).catch(setError).finally(() => setLoading(false))
  }, [id, isNew])

  const setItem = (idx, patch) => setForm((f) => ({ ...f, items: f.items.map((it, i) => (i === idx ? { ...it, ...patch } : it)) }))
  const move = (idx, dir) =>
    setForm((f) => {
      const items = [...f.items]
      const to = idx + dir
      if (to < 0 || to >= items.length) return f
      ;[items[idx], items[to]] = [items[to], items[idx]]
      return { ...f, items }
    })

  const save = async (thenAnalyze = false) => {
    if (!form.title.trim()) return toast.error('자소서 제목을 입력해 주세요.')
    const items = form.items.filter((i) => i.question.trim() || i.answer.trim()).map((i) => ({ question: i.question.trim() || '문항', answer: i.answer }))
    if (!items.length) return toast.error('문항을 1개 이상 작성해 주세요.')
    setSaving(true)
    try {
      const body = { ...form, title: form.title.trim(), items }
      const data = isNew ? await api.resumes.create(body, { sourceType: upload ? 'upload' : 'text', fileToken: upload?.file_token }) : await api.resumes.update(id, body)
      load(data)
      toast.success(isNew ? '자소서를 저장했습니다.' : `저장했습니다. (v${data.version})`)
      if (thenAnalyze) navigate(`/analysis/new?resume=${data.id}`)
      else if (isNew) navigate(`/resumes/${data.id}`, { replace: true })
    } catch (e) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  const restore = async (version) => {
    try {
      load(await api.resumes.restore(id, version))
      setPreview(null)
      toast.success(`v${version} 내용으로 복원했습니다.`)
    } catch (e) {
      toast.error(e.message)
    }
  }

  if (loading) return <Spinner className="py-40" />
  if (error) return <div className="container-page py-14"><ErrorBox error={error} /></div>
  const totalChars = form.items.reduce((s, i) => s + i.answer.length, 0)

  return (
    <div className="container-page py-10 md:py-14">
      <Link to="/resumes" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-ink-500 hover:text-ink-900">
        <i className="fa-solid fa-arrow-left" /> 자소서 목록
      </Link>
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">{isNew ? '새 자소서 작성' : '자소서 편집'}</h1>
          <p className="mt-2 text-sm text-ink-500">
            {resume ? `현재 v${resume.version} · ` : ''}문항 {form.items.length}개 · 총 {totalChars.toLocaleString()}자
            {dirty && <span className="ml-2 font-semibold text-sun-500">· 저장하지 않은 변경 사항</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" loading={saving} onClick={() => save(false)} icon="fa-solid fa-floppy-disk">저장</Button>
          <Button loading={saving} onClick={() => save(true)} icon="fa-solid fa-wand-magic-sparkles">저장 후 분석</Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="space-y-6">
          <div className="card grid gap-4 p-6 sm:grid-cols-[1fr_200px]">
            <div>
              <label htmlFor="title" className="label">자소서 제목</label>
              <input id="title" className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="예) 2026 하반기 넥스트웨이브 백엔드" maxLength={200} />
            </div>
            <div>
              <label htmlFor="target" className="label">지원 직무</label>
              <select id="target" className="input" value={form.target_job} onChange={(e) => setForm({ ...form, target_job: e.target.value })}>
                <option value="">선택</option>
                {JOBS.map((j) => <option key={j}>{j}</option>)}
              </select>
            </div>
          </div>

          {isNew && (
            <div className="card p-2">
              <div className="grid grid-cols-2 gap-1" role="tablist">
                {[['text', 'fa-solid fa-keyboard', '직접 입력'], ['upload', 'fa-solid fa-file-arrow-up', '파일 업로드 (OCR)']].map(([key, icon, label]) => (
                  <button key={key} role="tab" aria-selected={mode === key} onClick={() => setMode(key)} className={cx('flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition', mode === key ? 'bg-ink-900 text-white' : 'text-ink-500 hover:bg-ink-50')}>
                    <i className={icon} />{label}
                  </button>
                ))}
              </div>
              {mode === 'upload' && (
                <div className="p-4">
                  <UploadPanel
                    onApply={(r) => {
                      setUpload(r)
                      setForm((f) => ({ ...f, title: f.title || r.name.replace(/\.[^.]+$/, ''), items: r.items }))
                      setMode('text')
                      toast.success('인식된 문항을 적용했습니다. 내용을 확인하고 저장하세요.')
                    }}
                  />
                </div>
              )}
            </div>
          )}

          {form.items.map((item, idx) => (
            <div key={idx} className="card p-6">
              <div className="mb-3 flex items-center justify-between gap-2">
                <span className="text-xs font-bold tracking-wider text-pick-500">문항 {idx + 1}</span>
                <div className="flex gap-1">
                  <button onClick={() => move(idx, -1)} disabled={idx === 0} className="grid h-8 w-8 place-items-center rounded-lg text-ink-400 hover:bg-ink-50 disabled:opacity-30" aria-label="위로 이동"><i className="fa-solid fa-arrow-up text-xs" /></button>
                  <button onClick={() => move(idx, 1)} disabled={idx === form.items.length - 1} className="grid h-8 w-8 place-items-center rounded-lg text-ink-400 hover:bg-ink-50 disabled:opacity-30" aria-label="아래로 이동"><i className="fa-solid fa-arrow-down text-xs" /></button>
                  <button onClick={() => setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }))} disabled={form.items.length === 1} className="grid h-8 w-8 place-items-center rounded-lg text-ink-400 hover:bg-coral-50 hover:text-coral-500 disabled:opacity-30" aria-label="문항 삭제"><i className="fa-regular fa-trash-can text-xs" /></button>
                </div>
              </div>
              <input className="input mb-3 font-semibold" value={item.question} onChange={(e) => setItem(idx, { question: e.target.value })} placeholder="문항을 입력하세요" maxLength={500} aria-label={`문항 ${idx + 1} 질문`} />
              <textarea className="input min-h-52 resize-y leading-relaxed" value={item.answer} onChange={(e) => setItem(idx, { answer: e.target.value })} placeholder="답변을 작성하세요. 상황-행동-결과(STAR)와 수치 성과를 포함하면 점수가 올라갑니다." maxLength={5000} aria-label={`문항 ${idx + 1} 답변`} />
              <p className={cx('mt-2 text-right text-xs', item.answer.length < 400 ? 'text-sun-500' : 'text-ink-400')}>
                {item.answer.length.toLocaleString()}자 / 공백 제외 {item.answer.replace(/\s/g, '').length.toLocaleString()}자
              </p>
            </div>
          ))}
          <Button variant="secondary" className="w-full" icon="fa-solid fa-plus" disabled={form.items.length >= 20} onClick={() => setForm((f) => ({ ...f, items: [...f.items, { question: `${f.items.length + 1}. `, answer: '' }] }))}>
            문항 추가
          </Button>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="card p-5">
            <p className="mb-3 font-semibold"><i className="fa-solid fa-lightbulb mr-1.5 text-sun-500" />작성 팁</p>
            <ul className="space-y-2 text-sm text-ink-600">
              <li>· 문항당 400~1,200자가 적당합니다.</li>
              <li>· 성과는 %, 기간, 인원, 건수 등 숫자로 쓰세요.</li>
              <li>· 지원 공고의 핵심 키워드를 실제 경험과 연결하세요.</li>
              <li>· "열심히 하겠습니다" 대신 구체적 행동을 쓰세요.</li>
            </ul>
          </div>
          {resume?.versions?.length > 0 && (
            <div className="card p-5">
              <p className="mb-3 font-semibold"><i className="fa-solid fa-clock-rotate-left mr-1.5 text-pick-500" />버전 이력</p>
              <ul className="max-h-80 space-y-1 overflow-y-auto">
                {resume.versions.map((v) => (
                  <li key={v.version}>
                    <button onClick={() => setPreview(v)} className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-ink-50">
                      <span className="font-semibold">v{v.version}{v.version === resume.version && <span className="ml-1.5 text-xs font-medium text-match-600">현재</span>}</span>
                      <span className="text-xs text-ink-400">{formatDate(v.created_at, true)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>

      <Modal
        open={!!preview}
        onClose={() => setPreview(null)}
        size="lg"
        title={`v${preview?.version} 미리보기`}
        footer={preview && preview.version !== resume?.version && <Button icon="fa-solid fa-rotate-left" onClick={() => restore(preview.version)}>이 버전으로 복원</Button>}
      >
        <p className="mb-4 font-semibold">{preview?.title}</p>
        <div className="space-y-4">
          {preview?.items.map((it, i) => (
            <div key={i}>
              <p className="text-sm font-semibold text-pick-600">{it.question}</p>
              <p className="mt-1 text-sm leading-relaxed whitespace-pre-line text-ink-600">{it.answer || '(비어 있음)'}</p>
            </div>
          ))}
        </div>
      </Modal>

      <Modal
        open={blocker.state === 'blocked'}
        onClose={() => blocker.reset?.()}
        title="저장하지 않은 변경 사항"
        footer={
          <>
            <Button variant="secondary" onClick={() => blocker.reset?.()}>계속 편집</Button>
            <Button variant="danger" onClick={() => blocker.proceed?.()}>저장하지 않고 나가기</Button>
          </>
        }
      >
        <p className="text-sm text-ink-600">작성 중인 내용이 저장되지 않았습니다. 페이지를 떠나면 변경 사항이 사라집니다.</p>
      </Modal>
    </div>
  )
}
