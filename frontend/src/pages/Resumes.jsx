import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import ErrorBox from '../components/ErrorBox'
import { Badge, Button, EmptyState, Modal, PageHeader, Skeleton } from '../components/ui'
import { useToast } from '../context/ToastContext'
import useAsync from '../hooks/useAsync'
import { timeAgo } from '../lib/format'

export default function Resumes() {
  const toast = useToast()
  const resumes = useAsync(() => api.resumes.list(), [])
  const [target, setTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const remove = async () => {
    setDeleting(true)
    try {
      await api.resumes.remove(target.id)
      resumes.setData((list) => list.filter((r) => r.id !== target.id))
      toast.success('자소서를 삭제했습니다.')
      setTarget(null)
    } catch (e) {
      toast.error(e.message)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="container-page py-10 md:py-14">
      <PageHeader
        eyebrow="MY RESUMES"
        icon="fa-solid fa-file-pen"
        title="자소서·이력서 관리"
        description="문항별로 작성하고, 고칠 때마다 버전이 저장됩니다. PDF·이미지도 OCR로 불러올 수 있어요."
        actions={<Button to="/resumes/new" icon="fa-solid fa-plus">새 자소서</Button>}
      />
      {resumes.error ? (
        <ErrorBox error={resumes.error} onRetry={resumes.reload} />
      ) : resumes.loading ? (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-48" />)}</div>
      ) : resumes.data.length === 0 ? (
        <EmptyState
          icon="fa-solid fa-file-circle-plus"
          title="아직 등록한 자소서가 없습니다"
          description="자소서를 붙여 넣거나 파일을 올리면 공고와 대조해 적합도를 분석할 수 있습니다."
          action={<Button to="/resumes/new" icon="fa-solid fa-plus">첫 자소서 등록하기</Button>}
        />
      ) : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {resumes.data.map((r) => {
            const chars = r.items.reduce((s, i) => s + (i.answer || '').length, 0)
            return (
              <article key={r.id} className="card flex flex-col p-6 transition hover:-translate-y-1 hover:shadow-lift">
                <div className="flex items-start justify-between gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-match-50 text-match-600">
                    <i className={r.source_type === 'upload' ? 'fa-solid fa-file-arrow-up' : 'fa-solid fa-file-lines'} />
                  </span>
                  <Badge tone="pick">v{r.version}</Badge>
                </div>
                <h2 className="mt-4 line-clamp-2 font-display text-lg font-bold">
                  <Link to={`/resumes/${r.id}`} className="hover:text-pick-600">{r.title}</Link>
                </h2>
                <p className="mt-1 text-sm text-ink-500">{r.target_job || '직무 미지정'} · 문항 {r.items.length}개 · {chars.toLocaleString()}자</p>
                <p className="mt-1 text-xs text-ink-400">수정 {timeAgo(r.updated_at)}</p>
                <div className="mt-auto flex gap-2 pt-6">
                  <Button to={`/analysis/new?resume=${r.id}`} size="sm" className="flex-1" icon="fa-solid fa-wand-magic-sparkles">분석하기</Button>
                  <Button to={`/resumes/${r.id}`} size="sm" variant="secondary" icon="fa-solid fa-pen">편집</Button>
                  <Button size="sm" variant="ghost" onClick={() => setTarget(r)} aria-label={`${r.title} 삭제`} icon="fa-regular fa-trash-can" />
                </div>
              </article>
            )
          })}
        </div>
      )}
      <Modal
        open={!!target}
        onClose={() => setTarget(null)}
        title="자소서 삭제"
        footer={
          <>
            <Button variant="secondary" onClick={() => setTarget(null)}>취소</Button>
            <Button variant="danger" loading={deleting} onClick={remove}>삭제</Button>
          </>
        }
      >
        <p className="text-sm text-ink-600">
          <strong>{target?.title}</strong>을(를) 삭제할까요? 모든 버전 이력이 함께 삭제되며 되돌릴 수 없습니다. 기존 분석 리포트는 유지됩니다.
        </p>
      </Modal>
    </div>
  )
}
