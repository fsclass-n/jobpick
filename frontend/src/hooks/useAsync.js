import { useCallback, useEffect, useRef, useState } from 'react'

/** 비동기 데이터 로딩 공통 훅 */
export default function useAsync(fn, deps = []) {
  const [state, setState] = useState({ data: null, error: null, loading: true })
  const seq = useRef(0)
  const run = useCallback(() => {
    const id = ++seq.current
    setState((s) => ({ ...s, loading: true, error: null }))
    return fn()
      .then((data) => id === seq.current && setState({ data, error: null, loading: false }))
      .catch((error) => id === seq.current && setState({ data: null, error, loading: false }))
  }, deps) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    run()
  }, [run])
  return { ...state, reload: run, setData: (data) => setState((s) => ({ ...s, data: typeof data === 'function' ? data(s.data) : data })) }
}
