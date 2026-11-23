import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api'
import ErrorBox from '../components/ErrorBox'
import ReportView from '../components/ReportView'
import { Button, Modal, Spinner } from '../components/ui'
import { useToast } from '../context/ToastContext'
import useAsync from '../hooks/useAsync'
import { cx, formatDate } from '../lib/format'

export default function Report() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const analysis = useAsync(() => api.analyses.get(id), [id])
  const previous = useAsync(
    () => (analysis.data?.resume_id && analysis.data?.job_id ? api.analyses.list({ resume_id: analysis.data.resume_id, job_id: analysis.data.job_id }) : Promise.resolve([])),
    [analysis.data?.id],
  )
  const [busy, setBusy] = useState(null)
  const [confirm, setConfirm] = useState(false)

  if (analysis.loading) return <Spinner className="py-40" label="리포트를 불러오는 중..." />
  if (analysis.error) return <div className="container-page py-14"><ErrorBox error={analysis.error} onRetry={analysis.reload} /></div>
  const a = analysis.data
  const prev = (previous.data || []).find((p) => p.id !== a.id && new Date(p.created_at) < new Date(a.created_at))
  const delta = prev ? Math.round((a.score - prev.score) * 10) / 10 : null

  const rerun = async () => {
    setBusy('rerun')
    try {
      const next = await api.analyses.create(a.resume_id, a.job_id)
      toast.success('최신 자소서로 다시 분석했습니다.')
      navigate(`/analysis/${next.id}`)
    } catch (e) {
      toast.error(e.message)
    } finally {
      setBusy(null)
    }
  }
  const remove = async () => {
    setBusy('delete')
    try {
      await api.analyses.remove(a.id)
      toast.success('리포트를 삭제했습니다.')
      navigate('/history', { replace: true })
    } catch (e) {
      toast.error(e.message)
      setBusy(null)
    }
  }

  return (
    <div className="container-page py-10 md:py-14">
      <div className="mb-6 flex flex-col gap-4 print:hidden md:flex-row md:items-center md:justify-between">
        <Link to="/history" className="inline-flex items-center gap-2 text-sm font-semibold text-ink-500 hover:text-ink-900">
          <i className="fa-solid fa-arrow-left" /> 분석 이력
        </Link>
        <div className="flex flex-wrap gap-2">
          {a.resume_id && <Button to={`/resumes/${a.resume_id}`} variant="secondary" size="sm" icon="fa-solid fa-pen">자소서 수정</Button>}
          {a.resume_id && a.job_id && <Button size="sm" loading={busy === 'rerun'} onClick={rerun} icon="fa-solid fa-rotate">다시 분석</Button>}
          <Button variant="secondary" size="sm" onClick={() => window.print()} icon="fa-solid fa-print">인쇄/PDF</Button>
          <Button variant="ghost" size="sm" onClick={() => setConfirm(true)} icon="fa-regular fa-trash-can" aria-label="리포트 삭제" />
        </div>
      </div>
      <div className="mb-6 flex flex-wrap items-center gap-3 text-sm text-ink-500">
        <span><i className="fa-regular fa-clock mr-1" />{formatDate(a.created_at, true)}</span>
        {a.job_id && <Link to={`/jobs/${a.job_id}`} className="font-semibold text-pick-600 hover:underline">공고 보기</Link>}
        {delta !== null && (
          <span className={cx('rounded-full px-3 py-1 text-xs font-bold', delta >= 0 ? 'bg-match-50 text-match-600' : 'bg-coral-50 text-coral-600')}>
            <i className={cx('fa-solid mr-1', delta >= 0 ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down')} />
            이전 분석 대비 {delta >= 0 ? '+' : ''}{delta}점 (v{prev.resume_version} {Math.round(prev.score)}점)
          </span>
        )}
      </div>
      <ReportView analysis={a} />
      <Modal
        open={confirm}
        onClose={() => setConfirm(false)}
        title="리포트 삭제"
        footer={<><Button variant="secondary" onClick={() => setConfirm(false)}>취소</Button><Button variant="danger" loading={busy === 'delete'} onClick={remove}>삭제</Button></>}
      >
        <p className="text-sm text-ink-600">이 분석 리포트를 삭제할까요? 삭제 후에는 복구할 수 없습니다.</p>
      </Modal>
    </div>
  )
}
