import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { cx } from '../lib/format'

const ToastContext = createContext(null)
const TONES = {
  success: { icon: 'fa-circle-check', cls: 'border-match-400/40 text-match-600' },
  error: { icon: 'fa-circle-exclamation', cls: 'border-coral-400/40 text-coral-600' },
  info: { icon: 'fa-circle-info', cls: 'border-pick-300/50 text-pick-600' },
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const remove = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), [])
  const push = useCallback(
    (message, tone = 'info') => {
      const id = Math.random().toString(36).slice(2)
      setToasts((t) => [...t.slice(-3), { id, message, tone }])
      setTimeout(() => remove(id), 4000)
    },
    [remove],
  )
  const value = useMemo(
    () => ({ success: (m) => push(m, 'success'), error: (m) => push(m, 'error'), info: (m) => push(m, 'info') }),
    [push],
  )
  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-20 z-[80] flex flex-col items-center gap-2 px-4" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={cx('pointer-events-auto flex max-w-md animate-fade-up items-start gap-3 rounded-xl border bg-white px-4 py-3 text-sm shadow-lift', TONES[t.tone].cls)}
          >
            <i className={cx('fa-solid mt-0.5', TONES[t.tone].icon)} />
            <p className="whitespace-pre-line text-ink-800">{t.message}</p>
            <button onClick={() => remove(t.id)} className="ml-2 text-ink-300 hover:text-ink-500" aria-label="닫기">
              <i className="fa-solid fa-xmark" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
