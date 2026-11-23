/**
 * 규칙 기반 자소서-공고 대조 분석 (백엔드 backend/app/services/analyzer.py 의 JS 포팅)
 * Mock(데모) 모드에서 사용하며 결과 구조는 백엔드와 동일합니다.
 */
export const KEYWORD_SYNONYMS = {
  Python: ['python', '파이썬'],
  Java: ['java', '자바'],
  JavaScript: ['javascript', '자바스크립트', 'js'],
  TypeScript: ['typescript', '타입스크립트', 'ts'],
  React: ['react', '리액트'],
  Vue: ['vue'],
  'Node.js': ['node.js', 'nodejs', '노드'],
  Spring: ['spring', '스프링', 'spring boot', '스프링부트'],
  FastAPI: ['fastapi'],
  Django: ['django', '장고'],
  SQL: ['sql', 'mysql', 'postgresql', 'oracle', '쿼리'],
  NoSQL: ['nosql', 'mongodb', 'redis'],
  AWS: ['aws', 'ec2', 's3'],
  Docker: ['docker', '도커', '컨테이너'],
  Kubernetes: ['kubernetes', 'k8s', '쿠버네티스'],
  'CI/CD': ['ci/cd', 'github actions', 'jenkins', '배포 자동화', 'cicd'],
  Git: ['git', 'github', 'gitlab', '형상관리'],
  'REST API': ['rest api', 'restful', 'api 설계', 'api 개발'],
  'HTML/CSS': ['html', 'css', '퍼블리싱', 'tailwind'],
  Linux: ['linux', '리눅스', 'unix'],
  '테스트 자동화': ['테스트 자동화', '단위 테스트', 'unit test', 'pytest', 'jest', 'tdd'],
  '데이터 분석': ['데이터 분석', 'data analysis', '데이터분석'],
  머신러닝: ['머신러닝', 'machine learning', 'ml', '딥러닝', 'deep learning'],
  LLM: ['llm', '생성형 ai', '생성형ai', 'gpt', 'gemini', '프롬프트'],
  pandas: ['pandas', '판다스', 'numpy'],
  시각화: ['시각화', 'tableau', '태블로', 'power bi', '대시보드'],
  통계: ['통계', 'statistics', '가설 검증', 'a/b 테스트', 'ab테스트'],
  RPA: ['rpa', '업무 자동화', 'uipath', '자동화'],
  크롤링: ['크롤링', 'crawling', '스크래핑', 'scraping', 'playwright', 'selenium'],
  '서비스 기획': ['서비스 기획', '기획', '요구사항 정의', 'prd'],
  UX: ['ux', '사용자 경험', '사용성', 'ui/ux', 'ui'],
  Figma: ['figma', '피그마'],
  '퍼포먼스 마케팅': ['퍼포먼스 마케팅', '광고 운영', 'ga4', 'google analytics'],
  '콘텐츠 마케팅': ['콘텐츠 마케팅', '콘텐츠 기획', 'sns 운영', '브랜딩'],
  '재무 분석': ['재무 분석', '재무제표', '회계', '결산'],
  영업: ['영업', '세일즈', 'b2b 영업', '고객 발굴'],
  ERP: ['erp', 'sap'],
  엑셀: ['엑셀', 'excel', 'vba'],
  영어: ['영어', '토익', 'toeic', 'opic', '비즈니스 영어'],
  커뮤니케이션: ['커뮤니케이션', '소통', '의사소통'],
  협업: ['협업', '팀워크', '팀 프로젝트', '공동 작업'],
  '문제 해결': ['문제 해결', '문제해결', '트러블슈팅', '개선', '해결'],
  주도성: ['주도', '주도적', '능동', '자기주도', '오너십'],
  리더십: ['리더십', '리더', '팀장', '조장', '이끌'],
  책임감: ['책임감', '책임', '끝까지'],
  '고객 지향': ['고객 지향', '고객 중심', '고객 만족', '사용자 중심'],
  '도전 정신': ['도전', '도전정신', '새로운 시도'],
  '성장 의지': ['성장', '학습', '자기계발', '꾸준'],
}

const WEIGHTS = { keyword: 0.35, requirements: 0.25, preferred: 0.1, talent: 0.1, writing: 0.2 }
const IDEAL_MIN = 400
const IDEAL_MAX = 1200
const STOPWORDS = new Set(['및', '등', '또는', '이상', '이하', '관련', '경험', '우대', '가능', '보유', '능력', '업무', '대한', '위한', '이해', '기반', '활용', '역량', '지원'])
const PARTICLES = ['으로써', '으로서', '에서는', '으로', '에서', '에게', '까지', '부터', '하고', '은', '는', '이', '가', '을', '를', '에', '의', '와', '과', '로', '도', '만']

const norm = (text) => (text || '').replace(/\s+/g, ' ').trim().toLowerCase()
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const findTerm = (text, term) => {
  if (/^[a-z0-9+#./ -]+$/.test(term) && term.length <= 3) {
    const m = new RegExp(`(^|[^a-z0-9])${escape(term)}(?![a-z0-9])`).exec(text)
    return m ? m.index + m[1].length : -1
  }
  return text.indexOf(term)
}

export function findKeywords(text) {
  const t = norm(text)
  return Object.entries(KEYWORD_SYNONYMS)
    .map(([kw, syn]) => [Math.min(...[kw.toLowerCase(), ...syn].map((s) => findTerm(t, s)).filter((p) => p >= 0)), kw])
    .filter(([pos]) => Number.isFinite(pos))
    .sort((a, b) => a[0] - b[0])
    .map(([, kw]) => kw)
}

export const containsKeyword = (text, kw) => {
  const t = norm(text)
  return [kw.toLowerCase(), ...(KEYWORD_SYNONYMS[kw] || [])].some((s) => findTerm(t, s) >= 0)
}

const tokenize = (text) => {
  const tokens = new Set()
  for (const raw of (text || '').match(/[A-Za-z][A-Za-z0-9+#./-]*|[가-힣]+|\d+%?/g) || []) {
    let token = raw.toLowerCase()
    if (/^[가-힣]+$/.test(token)) {
      const p = PARTICLES.find((x) => token.length > x.length + 1 && token.endsWith(x))
      if (p) token = token.slice(0, -p.length)
    }
    if (token.length >= 2 && !STOPWORDS.has(token)) tokens.add(token)
  }
  return tokens
}

export const gradeFor = (score) => {
  if (score >= 80) return { label: '합격 가능성 높음', level: 'high' }
  if (score >= 60) return { label: '합격 가능성 보통', level: 'medium' }
  if (score >= 40) return { label: '보완 필요', level: 'low' }
  return { label: '전면 수정 권장', level: 'critical' }
}

export function jobKeywords(job) {
  const merged = [...(job.keywords || [])]
  const text = [job.title, job.description, ...(job.requirements || []), ...(job.preferred || []), ...(job.talent || [])].join(' ')
  findKeywords(text).forEach((k) => !merged.includes(k) && merged.push(k))
  return merged
}

function coverage(lines, resumeText, resumeTokens) {
  const details = (lines || []).map((line) => {
    const kws = findKeywords(line)
    let hit
    let ratio
    if (kws.length) {
      hit = kws.filter((k) => containsKeyword(resumeText, k))
      ratio = hit.length / kws.length
    } else {
      const tokens = tokenize(line)
      hit = [...tokens].filter((t) => resumeTokens.has(t)).sort()
      ratio = Math.min(1, hit.length / Math.max(1, Math.min(3, tokens.size)))
    }
    return { text: line, matched: ratio >= 0.5, ratio: Math.round(ratio * 100) / 100, evidence: hit.slice(0, 5) }
  })
  if (!details.length) return [1, details]
  return [details.reduce((s, d) => s + d.ratio, 0) / details.length, details]
}

function writingQuality(answer) {
  const length = answer.trim().length
  const notes = []
  let score = 1
  if (length < IDEAL_MIN) {
    score -= length >= 150 ? 0.35 : 0.6
    notes.push(`분량이 ${length}자로 짧습니다. 경험의 배경-행동-결과가 드러나도록 ${IDEAL_MIN}자 이상으로 보강하세요.`)
  } else if (length > IDEAL_MAX * 1.5) {
    score -= 0.15
    notes.push('분량이 길어 핵심이 흐려질 수 있습니다. 문항당 핵심 경험 1~2개로 압축하세요.')
  }
  if (!/\d/.test(answer)) {
    score -= 0.2
    notes.push('수치(%, 기간, 인원, 건수 등)로 표현된 성과가 없습니다. 정량 성과를 1개 이상 추가하세요.')
  }
  const markers = [
    ['상황', /당시|상황|문제|과제|목표/],
    ['행동', /직접|제안|개발|구축|설계|분석|진행|시도/],
    ['결과', /결과|성과|달성|개선|향상|감소|증가|단축/],
    ['배움', /배웠|깨달|교훈|성장|느꼈/],
  ]
  const missing = markers.filter(([, re]) => !re.test(answer)).map(([n]) => n)
  if (missing.length) {
    score -= 0.08 * missing.length
    notes.push(`STAR 구조 중 '${missing.join(', ')}' 요소가 약합니다.`)
  }
  if (/열심히|최선을 다하|성실한 사람|노력하겠/.test(answer)) {
    score -= 0.1
    notes.push("'열심히', '최선을 다하겠다' 같은 추상적 다짐 대신 구체적 행동과 근거를 제시하세요.")
  }
  return [Math.max(0, Math.min(1, score)), notes]
}

const round1 = (n) => Math.round(n * 10) / 10

export function analyzeRuleBased(job, items) {
  const resumeText = items.map((i) => `${i.question}\n${i.answer}`).join('\n')
  const resumeTokens = tokenize(resumeText)
  const keywords = jobKeywords(job)
  const matched = keywords.filter((k) => containsKeyword(resumeText, k))
  const missing = keywords.filter((k) => !matched.includes(k))
  const keywordRate = keywords.length ? matched.length / keywords.length : 0.5
  const [reqScore, reqDetails] = coverage(job.requirements, resumeText, resumeTokens)
  const [prefScore, prefDetails] = coverage(job.preferred, resumeText, resumeTokens)
  const [talentScore, talentDetails] = coverage(job.talent, resumeText, resumeTokens)

  const writingScores = []
  const questionFeedback = items.map((item) => {
    const [quality, notes] = writingQuality(item.answer || '')
    const itemKeywords = keywords.filter((k) => containsKeyword(item.answer || '', k))
    const suggest = missing.filter((k) => !itemKeywords.includes(k)).slice(0, 3)
    writingScores.push(quality)
    const feedback = [...notes]
    if (suggest.length) feedback.push(`공고 핵심 키워드 ${suggest.join(', ')} 중 실제 경험이 있다면 이 문항에 연결해 서술하세요.`)
    if (!feedback.length) feedback.push('구성과 근거가 충분합니다. 지원 기업의 사업/서비스와 연결되는 문장을 1개 추가하면 더 좋습니다.')
    return {
      question: item.question,
      score: Math.min(100, round1(100 * (0.6 * quality + 0.4 * (itemKeywords.length / Math.max(1, Math.min(5, keywords.length)))))),
      length: (item.answer || '').trim().length,
      matched_keywords: itemKeywords,
      suggested_keywords: suggest,
      feedback,
      example: suggest.length
        ? `"${suggest[0]} 역량을 활용해 [프로젝트/업무명]에서 [구체적 행동]을 수행했고, 그 결과 [수치 성과]를 달성했습니다. 이 경험을 ${job.title} 직무에서 [기여 방안]으로 이어가겠습니다."`
        : '',
    }
  })
  const writing = writingScores.length ? writingScores.reduce((a, b) => a + b, 0) / writingScores.length : 0
  const sections = { keyword: keywordRate, requirements: reqScore, preferred: prefScore, talent: talentScore, writing }
  const raw = Object.entries(WEIGHTS).reduce((s, [k, w]) => s + sections[k] * w, 0) * 100
  const score = round1(Math.max(5, Math.min(98, raw)))
  const grade = gradeFor(score)

  const strengths = []
  if (matched.length) strengths.push(`공고 핵심 키워드 ${matched.length}개(${matched.slice(0, 5).join(', ')})가 자소서에 드러납니다.`)
  reqDetails.filter((d) => d.matched).slice(0, 3).forEach((d) => strengths.push(`자격요건 '${d.text}'을(를) 충족하는 근거가 있습니다.`))
  if (writing >= 0.75) strengths.push('문항별 분량과 구조(상황-행동-결과)가 안정적입니다.')
  const improvements = reqDetails.filter((d) => !d.matched).slice(0, 3).map((d) => `자격요건 '${d.text}'에 대한 경험 서술이 부족합니다.`)
  if (missing.length) improvements.push(`누락된 핵심 키워드: ${missing.slice(0, 6).join(', ')}`)
  prefDetails.filter((d) => !d.matched).slice(0, 2).forEach((d) => improvements.push(`우대사항 '${d.text}' 관련 경험을 추가하면 가산점을 기대할 수 있습니다.`))
  if (writing < 0.6) improvements.push('정량 성과와 STAR 구조를 보강해 설득력을 높이세요.')

  const nextActions = []
  if (missing.length) nextActions.push(`${missing[0]} 관련 경험을 가장 점수가 낮은 문항에 STAR 구조로 추가하기`)
  if (writing < 0.75) nextActions.push('모든 문항에 수치 기반 성과를 1개 이상 넣기')
  if (job.talent?.length) nextActions.push(`인재상 '${job.talent[0]}'과(와) 연결되는 사례를 지원동기 문항에 녹이기`)
  nextActions.push('수정 후 다시 분석해 점수 변화를 확인하기')

  return {
    score,
    keyword_match_rate: round1(keywordRate * 100),
    grade,
    summary: `${job.company} '${job.title}' 공고 대비 적합도는 ${score}점(${grade.label})입니다. 핵심 키워드 매칭률 ${Math.round(keywordRate * 100)}%, 자격요건 충족도 ${Math.round(reqScore * 100)}%로 분석되었습니다.`,
    section_scores: Object.fromEntries(Object.entries(sections).map(([k, v]) => [k, round1(v * 100)])),
    matched_keywords: matched,
    missing_keywords: missing,
    requirements: reqDetails,
    preferred: prefDetails,
    talent: talentDetails,
    strengths: strengths.length ? strengths : ['지원 직무에 대한 관심과 기본 경험이 드러납니다.'],
    improvements: improvements.length ? improvements : ['큰 결함은 없습니다. 기업 맞춤 문장을 추가해 차별화하세요.'],
    question_feedback: questionFeedback,
    next_actions: nextActions,
  }
}

/** OCR/텍스트 원문을 문항 단위로 분리 (backend resume_parser 포팅) */
export function parseResumeText(text) {
  const qRe = /^\s*(?:(?:Q|문항)\s*\d+\s*[.:)\]]?|\d{1,2}\s*[.)]\s+|\[[^\]]{2,80}\]|【[^】]{2,80}】|[■▶●◆]\s*)/
  const hintRe = /\(\s*\d{2,4}\s*자[^)]*\)|기술하|서술하|작성해|무엇입니까|\?$/
  const items = []
  const preface = []
  let current = null
  for (const line of (text || '').replace(/\r\n/g, '\n').split('\n')) {
    const s = line.trim()
    const isQ = s && s.length <= 200 && (qRe.test(s) || (hintRe.test(s) && s.length <= 150))
    if (isQ) {
      if (current) items.push(current)
      current = { question: s, answer: '' }
    } else if (current) current.answer += `${line}\n`
    else preface.push(line)
  }
  if (current) items.push(current)
  items.forEach((i) => (i.answer = i.answer.trim()))
  const body = preface.join('\n').trim()
  if (!items.length) return [{ question: '자기소개서 본문', answer: body }]
  if (body) items.unshift({ question: '기본 정보/요약', answer: body })
  return items
}
