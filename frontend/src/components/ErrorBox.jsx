import { Button } from './ui'

export default function ErrorBox({ error, onRetry }) {
  return (
    <div className="card flex flex-col items-center px-6 py-14 text-center" role="alert">
      <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-coral-50 text-xl text-coral-500">
        <i className="fa-solid fa-triangle-exclamation" />
      </div>
      <p className="font-semibold">데이터를 불러오지 못했습니다</p>
      <p className="mt-1 max-w-md text-sm whitespace-pre-line text-ink-500">{error?.message}</p>
      {onRetry && <Button variant="secondary" size="sm" className="mt-5" icon="fa-solid fa-rotate" onClick={onRetry}>다시 시도</Button>}
    </div>
  )
}
