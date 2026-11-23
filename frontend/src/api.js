const BASE = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')

export async function api(path, { method = 'GET', body, token } = {}) {
  let res
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
      body: body && JSON.stringify(body),
      signal: AbortSignal.timeout(90_000),
    })
  } catch {
    throw new Error('API 서버에 연결할 수 없습니다. (무료 서버는 깨어나는 데 최대 1분이 걸립니다)')
  }
  if (res.status === 204) return null
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(typeof data.detail === 'string' ? data.detail : `요청 실패 (${res.status})`)
    err.status = res.status
    throw err
  }
  return data
}
