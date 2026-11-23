import { API_BASE_URL } from './config'
import { sessionStore, UNAUTHORIZED_EVENT } from './session'

export class ApiError extends Error {
  constructor(status, message, detail) {
    super(message)
    this.status = status
    this.detail = detail
  }
}

const messageFrom = (data, status) => {
  if (!data) return `요청을 처리하지 못했습니다. (${status})`
  if (typeof data.detail === 'string') return data.detail
  if (Array.isArray(data.detail)) {
    return data.detail
      .map((d) => (d.msg || '').replace(/^Value error, /, ''))
      .filter(Boolean)
      .join('\n') || '입력값을 확인해 주세요.'
  }
  return `요청을 처리하지 못했습니다. (${status})`
}

/** auth: 'user'(일반/샌드박스 토큰) | 'admin'(정식 관리자 토큰) | false(토큰 없이) */
export async function request(path, { method = 'GET', body, params, auth = 'user', form } = {}) {
  const url = new URL(API_BASE_URL + path)
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v)
  })
  const headers = {}
  const session = auth === 'admin' ? sessionStore.getAdmin() : auth ? sessionStore.getUser() : null
  if (session?.token) headers.Authorization = `Bearer ${session.token}`
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  let res
  try {
    res = await fetch(url, { method, headers, body: form || (body !== undefined ? JSON.stringify(body) : undefined) })
  } catch {
    throw new ApiError(0, '서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요. (Render 무료 플랜은 첫 요청에 최대 1분이 걸릴 수 있습니다)')
  }
  const data = res.status === 204 ? null : await res.json().catch(() => null)
  if (!res.ok) {
    if (res.status === 401 && session) {
      window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT, { detail: auth === 'admin' ? 'admin' : 'user' }))
    }
    throw new ApiError(res.status, messageFrom(data, res.status), data?.detail)
  }
  return data
}

const adminApi = (prefix, auth) => ({
  stats: (days = 14) => request(`${prefix}/stats`, { params: { days }, auth }),
  users: (params) => request(`${prefix}/users`, { params, auth }),
  changeRole: (id, role) => request(`${prefix}/users/${id}/role`, { method: 'PATCH', body: { role }, auth }),
  changeActive: (id, isActive) =>
    request(`${prefix}/users/${id}/active`, { method: 'PATCH', body: { is_active: isActive }, auth }),
  sources: () => request(`${prefix}/crawl/sources`, { auth }),
  createSource: (body) => request(`${prefix}/crawl/sources`, { method: 'POST', body, auth }),
  updateSource: (id, body) => request(`${prefix}/crawl/sources/${id}`, { method: 'PUT', body, auth }),
  deleteSource: (id) => request(`${prefix}/crawl/sources/${id}`, { method: 'DELETE', auth }),
  runSource: (id) => request(`${prefix}/crawl/sources/${id}/run`, { method: 'POST', auth }),
  runs: () => request(`${prefix}/crawl/runs`, { auth }),
  logs: (params) => request(`${prefix}/logs`, { params, auth }),
})

export const httpApi = {
  auth: {
    testAccounts: () => request('/api/auth/test-accounts', { auth: false }),
    login: (email, password) => request('/api/auth/login', { method: 'POST', body: { email, password }, auth: false }),
    signup: (body) => request('/api/auth/signup', { method: 'POST', body, auth: false }),
    me: () => request('/api/auth/me'),
    oauthProviders: () => request('/api/auth/oauth/providers', { auth: false }),
    oauthStart: (provider) => {
      window.location.href = `${API_BASE_URL}/api/auth/oauth/${provider}/login`
      return new Promise(() => {})
    },
  },
  adminAuth: {
    config: () => request('/api/admin/auth/config', { auth: false }),
    login: (email, password, otp) =>
      request('/api/admin/auth/login', { method: 'POST', body: { email, password, otp: otp || null }, auth: false }),
    me: () => request('/api/admin/auth/me', { auth: 'admin' }),
    logout: () => request('/api/admin/auth/logout', { method: 'POST', auth: 'admin' }).catch(() => null),
  },
  jobs: {
    list: (params) => request('/api/jobs', { params }),
    filters: () => request('/api/jobs/filters', { auth: false }),
    popularKeywords: () => request('/api/jobs/keywords/popular', { auth: false }),
    get: (id) => request(`/api/jobs/${id}`),
    scrap: (id) => request(`/api/jobs/${id}/scrap`, { method: 'POST' }),
    unscrap: (id) => request(`/api/jobs/${id}/scrap`, { method: 'DELETE' }),
    myScraps: () => request('/api/jobs/scraps/me'),
  },
  resumes: {
    list: () => request('/api/resumes'),
    get: (id) => request(`/api/resumes/${id}`),
    create: (body, { sourceType, fileToken } = {}) =>
      request('/api/resumes', { method: 'POST', body, params: { source_type: sourceType, file_token: fileToken } }),
    update: (id, body) => request(`/api/resumes/${id}`, { method: 'PUT', body }),
    restore: (id, version) => request(`/api/resumes/${id}/restore/${version}`, { method: 'POST' }),
    remove: (id) => request(`/api/resumes/${id}`, { method: 'DELETE' }),
    ocr: (file) => {
      const form = new FormData()
      form.append('file', file)
      return request('/api/resumes/ocr', { method: 'POST', form })
    },
  },
  analyses: {
    create: (resumeId, jobId) => request('/api/analyses', { method: 'POST', body: { resume_id: resumeId, job_id: jobId } }),
    list: (params) => request('/api/analyses', { params }),
    get: (id) => request(`/api/analyses/${id}`),
    remove: (id) => request(`/api/analyses/${id}`, { method: 'DELETE' }),
    dashboard: () => request('/api/dashboard'),
  },
  admin: adminApi('/api/admin', 'admin'),
  sandbox: adminApi('/api/sandbox/admin', 'user'),
}
