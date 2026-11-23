/**
 * Netlify 데모용 Mock API (브라우저 localStorage 에 가상 DB 저장)
 * - 백엔드와 동일한 인터페이스/권한 규칙(세션 분리, 샌드박스 범위)을 흉내 냅니다.
 * - 데모 데이터이며 실제 서버로 전송되지 않습니다.
 */
import sampleJobs from '../../../rpa/data/sample_jobs.json'
import { analyzeRuleBased, findKeywords, parseResumeText } from '../lib/analyzer'
import { isValidPassword, PASSWORD_RULE_MESSAGE } from '../lib/password'
import { ApiError } from './http'
import { sessionStore } from './session'

const DB_KEY = 'jp_mock_db_v1'
export const MOCK_ACCOUNTS = {
  user: { email: 'user@jobpick.test', password: 'Jobpick!2026' },
  sandbox: { email: 'sandbox@jobpick.test', password: 'Sandbox!2026' },
  admin: { email: 'admin@jobpick.demo', password: 'Admin!Demo2026' },
}
const EXPIRES = { user: 720 * 60, sandbox: 120 * 60, admin: 30 * 60 }
const ROLE_OF = { user: 'USER', sandbox: 'TEST_ADMIN', admin: 'ADMIN' }
const KIND_OF = { USER: 'user', TEST_ADMIN: 'sandbox', ADMIN: 'admin' }

export const SAMPLE_RESUME = [
  {
    question: '1. 지원 동기 및 입사 후 포부를 작성해 주세요. (800자)',
    answer:
      'AI 기반 서비스가 실제 사용자 문제를 해결하는 과정에 매력을 느껴 백엔드 개발자를 목표로 해왔습니다. 부트캠프 팀 프로젝트에서 Python 과 FastAPI 로 채용 공고 추천 API 를 개발했고, 조장으로서 4명의 팀원과 Git 브랜치 전략을 정해 협업했습니다. 당시 응답 속도가 느리다는 문제가 있어 SQL 쿼리를 분석하고 인덱스를 추가해 평균 응답 시간을 1.2초에서 0.3초로 75% 단축했습니다. 이 경험을 통해 데이터 구조를 이해하는 것이 서비스 품질로 이어진다는 것을 배웠습니다. 입사 후에는 안정적인 REST API 설계로 서비스 성장에 기여하고 싶습니다.',
  },
  {
    question: '2. 문제를 해결했던 경험을 구체적으로 기술해 주세요. (1000자)',
    answer:
      '졸업 프로젝트에서 웹 크롤링으로 수집한 데이터가 중복과 누락으로 분석에 쓸 수 없는 상황이었습니다. 저는 직접 수집 파이프라인을 다시 설계해 pandas 로 정제 규칙을 만들고, 실패한 요청은 재시도하도록 개선했습니다. 그 결과 데이터 누락률을 18%에서 2%로 줄였고, 팀은 일정 안에 분석 결과를 발표할 수 있었습니다.',
  },
  { question: '3. 본인의 강점과 보완할 점을 작성해 주세요.', answer: '저는 맡은 일을 끝까지 책임지는 성격입니다. 열심히 노력하는 사람이 되겠습니다.' },
]

const rng = (seed) => () => {
  seed |= 0
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
const nowIso = () => new Date().toISOString()
const daysAgo = (d, minutes = 0) => new Date(Date.now() - d * 86400000 - minutes * 60000).toISOString()
const wait = (ms = 250) => new Promise((r) => setTimeout(r, ms))
const clone = (v) => JSON.parse(JSON.stringify(v))
const fail = (status, message) => {
  throw new ApiError(status, message)
}

function toJob(raw, id, sandbox = false) {
  const text = [raw.title, raw.description, ...raw.requirements, ...raw.preferred, ...raw.talent].join(' ')
  const deadline = new Date(Date.now() + raw.deadline_days * 86400000).toISOString().slice(0, 10)
  return {
    id, source: sandbox ? 'sandbox-sample' : 'sample', company: raw.company, title: raw.title, job_category: raw.job_category,
    location: raw.location, career: raw.career, company_size: raw.company_size, employment_type: '정규직', salary: raw.salary,
    description: raw.description, requirements: raw.requirements, preferred: raw.preferred, talent: raw.talent,
    keywords: findKeywords(text).slice(0, 15), url: '', deadline, is_sandbox: sandbox, collected_at: daysAgo(0, id * 37),
  }
}

function seed() {
  const r = rng(2026)
  const db = { seq: 1000, users: [], jobs: [], resumes: [], analyses: [], scraps: [], sources: [], runs: [], logs: [] }
  const user = (email, name, role, password, extra = {}) => {
    const u = { id: ++db.seq, email, name, role, password, provider: 'local', desired_job: null, is_active: true, is_sandbox: false, last_login_at: null, created_at: daysAgo(40), ...extra }
    db.users.push(u)
    return u
  }
  const testUser = user(MOCK_ACCOUNTS.user.email, '테스트 사용자', 'USER', MOCK_ACCOUNTS.user.password, { desired_job: '백엔드' })
  user(MOCK_ACCOUNTS.sandbox.email, '테스트 관리자', 'TEST_ADMIN', MOCK_ACCOUNTS.sandbox.password)
  user(MOCK_ACCOUNTS.admin.email, 'jobpick 운영 관리자 (데모)', 'ADMIN', MOCK_ACCOUNTS.admin.password)
  const members = [['김하늘', '백엔드'], ['이서준', '데이터'], ['박지민', '프론트엔드'], ['최유나', '마케팅'], ['정민호', 'AI'], ['강다은', '기획'], ['윤태오', '백엔드'], ['한소희', '디자인']]
    .map(([n, j], i) => user(`member${i + 1}@jobpick.example`, n, 'USER', null, { desired_job: j, created_at: daysAgo(30 - i * 3) }))
  const dummies = ['A', 'B', 'C', 'D', 'E'].map((c, i) => user(`dummy${i + 1}@sandbox.jobpick`, `샌드박스 사용자 ${c}`, 'USER', null, { is_sandbox: true }))

  db.jobs = sampleJobs.map((raw, i) => toJob(raw, i + 1))
  const sandboxJobs = sampleJobs.map((raw, i) => toJob(raw, 100 + i, true))
  db.jobs.push(...sandboxJobs)

  db.sources = [
    { id: 1, name: '샘플 공고 피드 (오프라인)', kind: 'sample', url: '', keywords: [], config: {}, schedule: '매일 09:00', enabled: true, is_sandbox: false, created_at: daysAgo(30) },
    { id: 2, name: '고용24 채용정보 Open API', kind: 'worknet', url: '', keywords: ['개발', '데이터', '마케팅'], config: { display: 20 }, schedule: '매일 06:00', enabled: false, is_sandbox: false, created_at: daysAgo(30) },
    { id: 3, name: '정적 채용 게시판 (예시 설정)', kind: 'html', url: 'https://example.com/jobs', keywords: [], config: { item: 'ul.jobs > li', fields: { title: '.title', company: '.company', link: 'a@href' } }, schedule: '매주 월 10:00', enabled: false, is_sandbox: false, created_at: daysAgo(30) },
    { id: 4, name: '샌드박스 샘플 피드', kind: 'sample', url: '', keywords: [], config: {}, schedule: '수동', enabled: true, is_sandbox: true, created_at: daysAgo(30) },
  ]
  let runId = 0
  for (const sandbox of [false, true]) {
    const names = db.sources.filter((s) => s.is_sandbox === sandbox && ['sample', 'worknet'].includes(s.kind)).map((s) => s)
    for (let d = 13; d >= 0; d--) {
      for (const s of names) {
        const failed = r() < (s.kind === 'worknet' ? 0.15 : 0.05)
        const collected = failed ? 0 : Math.floor(8 + r() * (sandbox ? 8 : 32))
        const started = daysAgo(d, Math.floor(r() * 300))
        db.runs.push({ id: ++runId, source_id: s.id, source_name: s.name, status: failed ? 'failed' : 'success', trigger: d === 0 ? 'seed' : 'schedule', collected_count: collected, new_count: Math.floor(collected / (2 + r() * 3)), error: failed ? 'TimeoutError: 응답 시간 초과 (시연용 이력)' : null, is_sandbox: sandbox, started_at: started, finished_at: new Date(new Date(started).getTime() + 60000).toISOString() })
      }
    }
    const pool = sandbox ? dummies : members
    for (let d = 13; d >= 1; d--) {
      const count = 2 + Math.floor(r() * (sandbox ? 2 : 6))
      for (let k = 0; k < count; k++) {
        const u = pool[Math.floor(r() * pool.length)]
        const job = db.jobs[Math.floor(r() * sampleJobs.length)]
        const result = analyzeRuleBased(job, SAMPLE_RESUME.slice(0, 1 + Math.floor(r() * 3)))
        const roll = r()
        const status = roll < 0.88 ? 'success' : roll < 0.96 ? 'fallback' : 'failed'
        db.analyses.push({ id: ++db.seq, user_id: u.id, resume_id: null, job_id: job.id, resume_title: '시연용 자소서', resume_version: 1, job_title: job.title, company: job.company, score: status === 'failed' ? 0 : result.score, keyword_match_rate: result.keyword_match_rate, result: status === 'failed' ? {} : result, engine: status === 'success' ? (r() < 0.5 ? 'gemini' : 'rule') : 'rule', status, error: null, duration_ms: Math.floor(40 + r() * 2400), is_sandbox: sandbox, created_at: daysAgo(d, Math.floor(r() * 600)) })
      }
    }
  }

  const resume = { id: ++db.seq, user_id: testUser.id, title: '2026 하반기 백엔드 개발자 자소서', target_job: '백엔드', items: clone(SAMPLE_RESUME), source_type: 'text', version: 1, created_at: daysAgo(5), updated_at: daysAgo(5) }
  resume.versions = [{ version: 1, title: resume.title, items: clone(resume.items), created_at: resume.created_at }]
  db.resumes.push(resume)
  db.jobs.filter((j) => j.job_category === '백엔드' && !j.is_sandbox).slice(0, 3).forEach((job, i) => {
    const result = analyzeRuleBased(job, resume.items)
    db.analyses.push({ id: ++db.seq, user_id: testUser.id, resume_id: resume.id, job_id: job.id, resume_title: resume.title, resume_version: 1, job_title: job.title, company: job.company, score: result.score, keyword_match_rate: result.keyword_match_rate, result, engine: 'rule', status: 'success', error: null, duration_ms: 120, is_sandbox: false, created_at: daysAgo(3 - i) })
    db.scraps.push({ user_id: testUser.id, job_id: job.id, created_at: daysAgo(4 - i) })
  })
  return db
}

let cache = null
const load = () => {
  if (cache) return cache
  try {
    cache = JSON.parse(localStorage.getItem(DB_KEY) || 'null')
  } catch {
    cache = null
  }
  if (!cache) {
    cache = seed()
    save()
  }
  return cache
}
const save = () => localStorage.setItem(DB_KEY, JSON.stringify(cache))
export const resetMockDb = () => {
  cache = seed()
  save()
}

const publicUser = (u) => {
  const { password, ...rest } = u // eslint-disable-line no-unused-vars
  return clone(rest)
}
const issue = (u) => {
  const kind = KIND_OF[u.role]
  u.last_login_at = nowIso()
  save()
  return { access_token: `mock:${kind}:${u.id}`, token_type: 'bearer', session: kind, expires_in: EXPIRES[kind], user: publicUser(u) }
}

/** 토큰 종류별 접근 검사: 백엔드 deps.py 와 동일한 규칙 */
function currentUser(kinds) {
  const isAdmin = kinds.includes('admin')
  const session = isAdmin ? sessionStore.getAdmin() : sessionStore.getUser()
  if (!session?.token) fail(401, '로그인이 필요합니다.')
  const [, kind, id] = session.token.split(':')
  if (!kinds.includes(kind)) fail(403, isAdmin ? '정식 관리자 권한이 필요합니다.' : '테스트 관리자 전용 샌드박스입니다.')
  const u = load().users.find((x) => x.id === Number(id))
  if (!u || !u.is_active) fail(401, '사용할 수 없는 계정입니다.')
  if (ROLE_OF[kind] !== u.role) fail(403, '권한 정보가 변경되었습니다. 다시 로그인해 주세요.')
  return u
}
const optionalUser = () => {
  try {
    return currentUser(['user', 'sandbox'])
  } catch {
    return null
  }
}

function authenticate(email, password, roles) {
  const u = load().users.find((x) => x.email.toLowerCase() === (email || '').toLowerCase())
  if (!u || !roles.includes(u.role) || u.password !== password) fail(401, '이메일 또는 비밀번호가 올바르지 않습니다.')
  if (!u.is_active) fail(403, '비활성화된 계정입니다. 관리자에게 문의해 주세요.')
  return u
}
const log = (admin, action, detail, success = true, email = '') => {
  const db = load()
  db.logs.unshift({ id: ++db.seq, admin_email: admin?.email || email, action, detail, ip: '127.0.0.1 (demo)', success, created_at: nowIso() })
  save()
}

const jobOut = (job, user) => ({ ...clone(job), is_scrapped: !!user && load().scraps.some((s) => s.user_id === user.id && s.job_id === job.id) })
const ownResume = (id, u) => load().resumes.find((r) => r.id === Number(id) && r.user_id === u.id) || fail(404, '자소서를 찾을 수 없습니다.')
const summary = ({ result, error, ...a }) => clone(a) // eslint-disable-line no-unused-vars

// ---------------- 관리자 통계 ----------------
function buildStats(sandbox, days = 14) {
  const db = load()
  const since = Date.now() - days * 86400000
  const labels = Array.from({ length: days }, (_, i) => {
    const d = new Date(Date.now() - (days - 1 - i) * 86400000)
    return { key: d.toISOString().slice(0, 10), label: `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}` }
  })
  const runs = db.runs.filter((r) => r.is_sandbox === sandbox && new Date(r.started_at).getTime() >= since)
  const analyses = db.analyses.filter((a) => a.is_sandbox === sandbox && new Date(a.created_at).getTime() >= since)
  const jobs = db.jobs.filter((j) => j.is_sandbox === sandbox)
  const day = (iso) => iso.slice(0, 10)
  const dailyCollection = labels.map(({ key, label }) => {
    const rs = runs.filter((r) => day(r.started_at) === key)
    return { date: label, collected: rs.reduce((s, r) => s + r.collected_count, 0), new: rs.reduce((s, r) => s + r.new_count, 0), success: rs.filter((r) => r.status === 'success').length, failed: rs.filter((r) => r.status === 'failed').length }
  })
  const bySource = {}
  runs.forEach((r) => {
    const s = (bySource[r.source_name] ||= { source: r.source_name, runs: 0, success: 0, failed: 0, collected: 0 })
    s.runs++
    s[r.status === 'success' ? 'success' : 'failed']++
    s.collected += r.collected_count
  })
  const analysisDaily = labels.map(({ key, label }) => {
    const as = analyses.filter((a) => day(a.created_at) === key)
    const c = (st) => as.filter((a) => a.status === st).length
    return { date: label, total: as.length, success: c('success'), fallback: c('fallback'), failed: c('failed') }
  })
  const ok = analyses.filter((a) => a.status !== 'failed')
  const engines = {}
  analyses.forEach((a) => (engines[a.engine] = (engines[a.engine] || 0) + 1))
  const dist = [0, 20, 40, 60, 80].map((b) => ({ range: `${b}-${b < 80 ? b + 19 : 100}`, count: ok.filter((a) => a.score >= b && (b === 80 ? a.score <= 100 : a.score < b + 20)).length }))
  const cats = {}
  jobs.forEach((j) => (cats[j.job_category] = (cats[j.job_category] || 0) + 1))
  const avg = (arr, f) => (arr.length ? arr.reduce((s, x) => s + f(x), 0) / arr.length : 0)
  return {
    scope: sandbox ? 'sandbox' : 'production',
    totals: {
      users: db.users.filter((u) => u.is_sandbox === sandbox).length,
      jobs: jobs.length,
      collected_period: runs.reduce((s, r) => s + r.collected_count, 0),
      crawl_runs: runs.length,
      crawl_success_rate: runs.length ? Math.round((1000 * runs.filter((r) => r.status === 'success').length) / runs.length) / 10 : 0,
      analyses: analyses.length,
      analysis_success_rate: analyses.length ? Math.round((1000 * ok.length) / analyses.length) / 10 : 0,
      average_score: Math.round(avg(ok, (a) => a.score) * 10) / 10,
      average_duration_ms: Math.round(avg(ok, (a) => a.duration_ms)),
    },
    daily_collection: dailyCollection,
    source_stats: Object.values(bySource).map((s) => ({ ...s, success_rate: Math.round((1000 * s.success) / s.runs) / 10 })).sort((a, b) => b.collected - a.collected),
    analysis_daily: analysisDaily,
    analysis_engine: Object.entries(engines).map(([engine, count]) => ({ engine, count })),
    score_distribution: dist,
    category_stats: Object.entries(cats).map(([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count),
  }
}

function adminMock(sandbox) {
  const scope = sandbox ? 'sandbox' : 'admin'
  const guard = () => currentUser([sandbox ? 'sandbox' : 'admin'])
  const scopedUser = (id) => load().users.find((u) => u.id === Number(id) && u.is_sandbox === sandbox) || fail(404, '회원을 찾을 수 없습니다.')
  const scopedSource = (id) => load().sources.find((s) => s.id === Number(id) && s.is_sandbox === sandbox) || fail(404, '수집 대상을 찾을 수 없습니다.')
  const validate = (body) => {
    if (sandbox && body.kind !== 'sample') fail(403, '샌드박스에서는 샘플(오프라인) 수집기만 사용할 수 있습니다.')
    if (['html', 'playwright'].includes(body.kind) && (!/^https?:\/\//.test(body.url || '') || !body.config?.item)) fail(400, 'HTML/Playwright 수집기는 URL 과 config.item 선택자가 필요합니다.')
  }
  return {
    stats: async (days) => (await wait(), guard(), buildStats(sandbox, days)),
    users: async ({ q = '', role = '' } = {}) => {
      await wait()
      guard()
      const items = load().users.filter((u) => u.is_sandbox === sandbox && (!role || u.role === role) && (!q || u.email.includes(q) || u.name.includes(q)))
      return { items: items.map(publicUser).reverse(), total: items.length }
    },
    changeRole: async (id, role) => {
      await wait()
      const admin = guard()
      const target = scopedUser(id)
      if (target.id === admin.id) fail(400, '본인 계정의 권한은 변경할 수 없습니다.')
      if (target.role === 'ADMIN') fail(403, '정식 관리자 권한은 서버 스크립트로만 변경할 수 있습니다.')
      if (!['USER', 'TEST_ADMIN'].includes(role)) fail(422, '변경할 수 없는 권한입니다.')
      const before = target.role
      target.role = role
      save()
      log(admin, `${scope}:role_change`, `${target.email}: ${before} -> ${role}`)
      return publicUser(target)
    },
    changeActive: async (id, isActive) => {
      await wait()
      const admin = guard()
      const target = scopedUser(id)
      if (target.id === admin.id || target.role === 'ADMIN') fail(403, '해당 계정의 상태는 변경할 수 없습니다.')
      target.is_active = isActive
      save()
      log(admin, `${scope}:active_change`, `${target.email}: ${isActive ? '활성' : '비활성'}`)
      return publicUser(target)
    },
    sources: async () => (await wait(), guard(), clone(load().sources.filter((s) => s.is_sandbox === sandbox))),
    createSource: async (body) => {
      await wait()
      const admin = guard()
      validate(body)
      const db = load()
      const source = { ...body, id: ++db.seq, is_sandbox: sandbox, created_at: nowIso() }
      db.sources.push(source)
      save()
      log(admin, `${scope}:crawl_source_create`, `${source.name} (${source.kind})`)
      return clone(source)
    },
    updateSource: async (id, body) => {
      await wait()
      const admin = guard()
      validate(body)
      const source = Object.assign(scopedSource(id), body)
      save()
      log(admin, `${scope}:crawl_source_update`, `${source.name}: 스케줄=${source.schedule}, 활성=${source.enabled}`)
      return clone(source)
    },
    deleteSource: async (id) => {
      await wait()
      const admin = guard()
      const source = scopedSource(id)
      const db = load()
      db.sources = db.sources.filter((s) => s !== source)
      save()
      log(admin, `${scope}:crawl_source_delete`, source.name)
    },
    runSource: async (id) => {
      await wait(600)
      const admin = guard()
      const source = scopedSource(id)
      const db = load()
      const supported = source.kind === 'sample'
      const collected = supported ? sampleJobs.length : 0
      db.runs.push({ id: ++db.seq, source_id: source.id, source_name: source.name, status: supported ? 'success' : 'failed', trigger: 'manual', collected_count: collected, new_count: 0, error: supported ? null : 'CollectError: 데모 환경에서는 외부 사이트/공공 API 수집을 실행하지 않습니다.', is_sandbox: sandbox, started_at: nowIso(), finished_at: nowIso() })
      save()
      log(admin, `${scope}:crawl_run`, `${source.name} 수동 실행`)
      return { message: `'${source.name}' 수집을 시작했습니다.` }
    },
    runs: async () => (await wait(), guard(), clone(load().runs.filter((r) => r.is_sandbox === sandbox).sort((a, b) => b.started_at.localeCompare(a.started_at)).slice(0, 30))),
    logs: async ({ action = '' } = {}) => {
      await wait()
      if (sandbox) fail(404, 'Not Found')
      guard()
      return clone(load().logs.filter((l) => !action || l.action.includes(action)).slice(0, 100))
    },
  }
}

export const mockApi = {
  auth: {
    testAccounts: async () => ({
      enabled: true,
      accounts: [
        { type: 'user', label: '일반 사용자', ...MOCK_ACCOUNTS.user },
        { type: 'sandbox', label: '테스트 관리자', ...MOCK_ACCOUNTS.sandbox },
      ],
    }),
    login: async (email, password) => {
      await wait(400)
      const u = authenticate(email, password, ['USER', 'TEST_ADMIN'])
      if (u.role === 'TEST_ADMIN') log(u, 'sandbox:login', '테스트 관리자 샌드박스 로그인')
      return issue(u)
    },
    signup: async ({ email, password, name, desired_job }) => {
      await wait(400)
      if (!isValidPassword(password)) fail(422, PASSWORD_RULE_MESSAGE)
      const db = load()
      if (db.users.some((u) => u.email.toLowerCase() === email.toLowerCase())) fail(409, '이미 가입된 이메일입니다.')
      const u = { id: ++db.seq, email: email.toLowerCase(), name, role: 'USER', password, provider: 'local', desired_job: desired_job || null, is_active: true, is_sandbox: false, created_at: nowIso() }
      db.users.push(u)
      return issue(u)
    },
    me: async () => publicUser(currentUser(['user', 'sandbox'])),
    oauthProviders: async () => ({ google: true, naver: true, kakao: true }),
    oauthStart: async (provider) => {
      await wait(700)
      const db = load()
      const names = { google: 'Google 사용자', naver: '네이버 사용자', kakao: '카카오 사용자' }
      let u = db.users.find((x) => x.provider === provider)
      if (!u) {
        u = { id: ++db.seq, email: `${provider}_demo@social.jobpick`, name: names[provider], role: 'USER', password: null, provider, desired_job: null, is_active: true, is_sandbox: false, created_at: nowIso() }
        db.users.push(u)
      }
      return issue(u)
    },
  },
  adminAuth: {
    config: async () => ({ enabled: true, otp_required: false, session_minutes: 30, demo: true }),
    login: async (email, password) => {
      await wait(500)
      try {
        const u = authenticate(email, password, ['ADMIN'])
        log(u, 'admin:login', '정식 관리자 로그인 (데모)')
        return issue(u)
      } catch (e) {
        log(null, 'admin:login', '로그인 실패', false, email)
        throw e
      }
    },
    me: async () => publicUser(currentUser(['admin'])),
    logout: async () => {
      try {
        log(currentUser(['admin']), 'admin:logout', '정식 관리자 로그아웃')
      } catch {
        /* 이미 만료 */
      }
    },
  },
  jobs: {
    list: async ({ q = '', category = '', location = '', career = '', company_size = '', sort = 'latest', page = 1, size = 12 } = {}) => {
      await wait()
      const user = optionalUser()
      let items = load().jobs.filter((j) => !j.is_sandbox)
      if (q) items = items.filter((j) => [j.title, j.company, j.description].some((t) => t.toLowerCase().includes(q.toLowerCase())))
      if (category) items = items.filter((j) => j.job_category === category)
      if (career) items = items.filter((j) => j.career === career)
      if (company_size) items = items.filter((j) => j.company_size === company_size)
      if (location) items = items.filter((j) => j.location.startsWith(location))
      items.sort((a, b) => (sort === 'deadline' ? a.deadline.localeCompare(b.deadline) : b.collected_at.localeCompare(a.collected_at)))
      const start = (page - 1) * size
      return { items: items.slice(start, start + Number(size)).map((j) => jobOut(j, user)), total: items.length, page: Number(page), size: Number(size) }
    },
    filters: async () => {
      const jobs = load().jobs.filter((j) => !j.is_sandbox)
      const uniq = (f) => [...new Set(jobs.map(f).filter(Boolean))].sort()
      return { categories: uniq((j) => j.job_category), locations: uniq((j) => j.location.split(' ')[0]), careers: uniq((j) => j.career), company_sizes: uniq((j) => j.company_size) }
    },
    popularKeywords: async () => {
      const counter = {}
      const byCat = {}
      load().jobs.filter((j) => !j.is_sandbox).forEach((j) => j.keywords.forEach((k) => {
        counter[k] = (counter[k] || 0) + 1
        ;(byCat[j.job_category] ||= {})[k] = (byCat[j.job_category][k] || 0) + 1
      }))
      const top = (obj, n) => Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, n)
      return {
        overall: top(counter, 12).map(([keyword, count]) => ({ keyword, count })),
        by_category: Object.fromEntries(Object.entries(byCat).map(([c, o]) => [c, top(o, 5).map(([k]) => k)])),
      }
    },
    get: async (id) => {
      await wait()
      const job = load().jobs.find((j) => j.id === Number(id) && !j.is_sandbox) || fail(404, '공고를 찾을 수 없습니다.')
      return jobOut(job, optionalUser())
    },
    scrap: async (id) => {
      const u = currentUser(['user', 'sandbox'])
      const db = load()
      if (!db.scraps.some((s) => s.user_id === u.id && s.job_id === Number(id))) db.scraps.unshift({ user_id: u.id, job_id: Number(id), created_at: nowIso() })
      save()
    },
    unscrap: async (id) => {
      const u = currentUser(['user', 'sandbox'])
      const db = load()
      db.scraps = db.scraps.filter((s) => !(s.user_id === u.id && s.job_id === Number(id)))
      save()
    },
    myScraps: async () => {
      await wait()
      const u = currentUser(['user', 'sandbox'])
      const db = load()
      return db.scraps.filter((s) => s.user_id === u.id).map((s) => db.jobs.find((j) => j.id === s.job_id)).filter(Boolean).map((j) => jobOut(j, u))
    },
  },
  resumes: {
    list: async () => {
      await wait()
      const u = currentUser(['user', 'sandbox'])
      return clone(load().resumes.filter((r) => r.user_id === u.id).sort((a, b) => b.updated_at.localeCompare(a.updated_at)))
    },
    get: async (id) => (await wait(), clone(ownResume(id, currentUser(['user', 'sandbox'])))),
    create: async (body, { sourceType } = {}) => {
      await wait()
      const u = currentUser(['user', 'sandbox'])
      const db = load()
      const resume = { id: ++db.seq, user_id: u.id, ...clone(body), source_type: sourceType || 'text', version: 1, created_at: nowIso(), updated_at: nowIso() }
      resume.versions = [{ version: 1, title: body.title, items: clone(body.items), created_at: nowIso() }]
      db.resumes.push(resume)
      save()
      return clone(resume)
    },
    update: async (id, body) => {
      await wait()
      const resume = ownResume(id, currentUser(['user', 'sandbox']))
      if (JSON.stringify(body.items) === JSON.stringify(resume.items) && body.title === resume.title && body.target_job === resume.target_job) return clone(resume)
      Object.assign(resume, clone(body), { version: resume.version + 1, updated_at: nowIso() })
      resume.versions.unshift({ version: resume.version, title: resume.title, items: clone(resume.items), created_at: nowIso() })
      save()
      return clone(resume)
    },
    restore: async (id, version) => {
      await wait()
      const resume = ownResume(id, currentUser(['user', 'sandbox']))
      const target = resume.versions.find((v) => v.version === Number(version)) || fail(404, '해당 버전이 없습니다.')
      Object.assign(resume, { title: target.title, items: clone(target.items), version: resume.version + 1, updated_at: nowIso() })
      resume.versions.unshift({ version: resume.version, title: resume.title, items: clone(resume.items), created_at: nowIso() })
      save()
      return clone(resume)
    },
    remove: async (id) => {
      const resume = ownResume(id, currentUser(['user', 'sandbox']))
      const db = load()
      db.resumes = db.resumes.filter((r) => r !== resume)
      save()
    },
    ocr: async (file) => {
      await wait(800)
      currentUser(['user', 'sandbox'])
      if (!/\.txt$/i.test(file.name)) fail(422, '데모 환경에서는 TXT 파일만 텍스트를 추출할 수 있습니다. PDF/이미지 OCR 은 백엔드 연동 환경에서 지원됩니다.')
      const text = await file.text()
      return { text, items: parseResumeText(text), engine: 'plain-text (demo)', pages: 1, file_token: null }
    },
  },
  analyses: {
    create: async (resumeId, jobId) => {
      await wait(1400)
      const u = currentUser(['user', 'sandbox'])
      const resume = ownResume(resumeId, u)
      const db = load()
      const job = db.jobs.find((j) => j.id === Number(jobId) && !j.is_sandbox) || fail(404, '공고를 찾을 수 없습니다.')
      if (!resume.items.some((i) => i.answer.trim())) fail(400, '답변이 작성된 문항이 없습니다.')
      const started = performance.now()
      const result = analyzeRuleBased(job, resume.items)
      const analysis = { id: ++db.seq, user_id: u.id, resume_id: resume.id, job_id: job.id, resume_title: resume.title, resume_version: resume.version, job_title: job.title, company: job.company, score: result.score, keyword_match_rate: result.keyword_match_rate, result, engine: 'rule', status: 'success', error: null, duration_ms: Math.round(performance.now() - started), is_sandbox: u.is_sandbox || u.role === 'TEST_ADMIN', created_at: nowIso() }
      db.analyses.push(analysis)
      save()
      return clone(analysis)
    },
    list: async ({ resume_id, job_id } = {}) => {
      await wait()
      const u = currentUser(['user', 'sandbox'])
      return load().analyses
        .filter((a) => a.user_id === u.id && a.status !== 'failed' && (!resume_id || a.resume_id === Number(resume_id)) && (!job_id || a.job_id === Number(job_id)))
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .map(summary)
    },
    get: async (id) => {
      await wait()
      const u = currentUser(['user', 'sandbox'])
      return clone(load().analyses.find((a) => a.id === Number(id) && a.user_id === u.id) || fail(404, '분석 결과를 찾을 수 없습니다.'))
    },
    remove: async (id) => {
      const u = currentUser(['user', 'sandbox'])
      const db = load()
      db.analyses = db.analyses.filter((a) => !(a.id === Number(id) && a.user_id === u.id))
      save()
    },
    dashboard: async () => {
      await wait()
      const u = currentUser(['user', 'sandbox'])
      const db = load()
      const analyses = db.analyses.filter((a) => a.user_id === u.id && a.status !== 'failed').sort((a, b) => a.created_at.localeCompare(b.created_at))
      const scores = analyses.map((a) => a.score)
      const scraps = db.scraps.filter((s) => s.user_id === u.id)
      return {
        resume_count: db.resumes.filter((r) => r.user_id === u.id).length,
        analysis_count: analyses.length,
        scrap_count: scraps.length,
        average_score: scores.length ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : 0,
        best_score: scores.length ? Math.max(...scores) : 0,
        recent_analyses: analyses.slice(-5).reverse().map(summary),
        scrapped_jobs: scraps.slice(0, 4).map((s) => db.jobs.find((j) => j.id === s.job_id)).filter(Boolean).map((j) => jobOut(j, u)),
        score_trend: analyses.slice(-10).map((a) => ({ id: a.id, date: new Date(a.created_at).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' }), score: a.score, label: `${a.company} · v${a.resume_version}` })),
      }
    },
  },
  admin: adminMock(false),
  sandbox: adminMock(true),
}
