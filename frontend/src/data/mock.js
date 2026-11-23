export const PROFILE = {
  name: '김픽',
  target: '데이터 분석가',
  skills: ['Python', 'SQL', 'Excel', 'Tableau', '통계 분석', '커뮤니케이션'],
}

export const CUTOFF = 80

export const JOBS = [
  {
    id: 1, company: '한빛데이터', title: '데이터 분석가 (신입)', region: '서울', career: '신입', size: '중견', source: '공공데이터포털',
    deadline: '12-05', skills: ['Python', 'SQL', 'Tableau', 'A/B 테스트', '통계 분석'], values: ['데이터 기반 의사결정', '협업', '주도성'],
    radar: { 자격요건: 88, 우대사항: 62, 인재상: 80, 경력: 90, 키워드: 76 },
  },
  {
    id: 2, company: '누리금융', title: 'BI 엔지니어', region: '서울', career: '신입', size: '대기업', source: '서울 열린데이터',
    deadline: '12-10', skills: ['SQL', 'Python', 'Power BI', 'ETL', '데이터 모델링'], values: ['신뢰', '고객 중심', '정확성'],
    radar: { 자격요건: 72, 우대사항: 48, 인재상: 66, 경력: 85, 키워드: 58 },
  },
  {
    id: 3, company: '청솔모빌리티', title: '마케팅 데이터 분석', region: '경기', career: '경력 1~3년', size: '중견', source: '공공데이터포털',
    deadline: '12-18', skills: ['SQL', 'GA4', 'A/B 테스트', 'Tableau', '퍼널 분석'], values: ['실험', '속도', '고객 중심'],
    radar: { 자격요건: 70, 우대사항: 55, 인재상: 74, 경력: 60, 키워드: 64 },
  },
  {
    id: 4, company: '경기도시공사', title: '데이터 기획 (공공)', region: '경기', career: '신입', size: '공공기관', source: '지방공공기관',
    deadline: '12-12', skills: ['Excel', '통계 분석', '공공데이터', 'SQL', '보고서 작성'], values: ['공익', '청렴', '책임감'],
    radar: { 자격요건: 84, 우대사항: 70, 인재상: 72, 경력: 92, 키워드: 80 },
  },
  {
    id: 5, company: '모아AI', title: 'ML 데이터 엔지니어', region: '서울', career: '경력 1~3년', size: '스타트업', source: '서울 열린데이터',
    deadline: '12-22', skills: ['Python', 'Airflow', 'SQL', 'Docker', '클라우드'], values: ['성장', '오너십', '실험'],
    radar: { 자격요건: 58, 우대사항: 40, 인재상: 70, 경력: 50, 키워드: 52 },
  },
  {
    id: 6, company: '대한물류', title: '수요예측 분석가', region: '부산', career: '신입', size: '대기업', source: '나라일터',
    deadline: '12-30', skills: ['Python', '시계열 분석', '통계 분석', 'SQL', 'Excel'], values: ['안전', '혁신', '협업'],
    radar: { 자격요건: 78, 우대사항: 52, 인재상: 68, 경력: 88, 키워드: 70 },
  },
]

export const SKILL_PLAN = {
  'A/B 테스트': { weeks: 2, task: '실험 설계·p-value 해석 정리, 공개 데이터로 A/B 분석 1건 포트폴리오화' },
  'Power BI': { weeks: 1, task: 'Tableau 대시보드를 Power BI로 재구현' },
  ETL: { weeks: 3, task: 'Python+SQL로 일 배치 파이프라인 구축 및 문서화' },
  '데이터 모델링': { weeks: 2, task: '스타 스키마 설계 연습과 ERD 작성' },
  GA4: { weeks: 1, task: 'GA4 데모 계정으로 이벤트·전환 리포트 작성' },
  '퍼널 분석': { weeks: 1, task: '가입 퍼널 이탈 구간 분석 리포트' },
  Airflow: { weeks: 3, task: 'Airflow DAG로 공고 수집 파이프라인 구성' },
  Docker: { weeks: 2, task: '분석 환경 컨테이너화' },
  클라우드: { weeks: 2, task: 'AWS/GCP 기초 자격증 학습 및 실습' },
  '시계열 분석': { weeks: 2, task: 'ARIMA·Prophet 수요예측 미니 프로젝트' },
  공공데이터: { weeks: 1, task: '공공데이터포털 API 활용 분석 1건' },
  '보고서 작성': { weeks: 1, task: '1페이지 분석 보고서 템플릿 작성' },
}

export const ESSAYS = [
  {
    id: 'q1', title: '지원 동기와 입사 후 포부 (500자)',
    original: '저는 데이터에 관심이 많아 데이터 분석가를 지원했습니다. 학교에서 여러 프로젝트를 하며 열심히 했고, 입사하면 열심히 배워서 회사에 기여하겠습니다.',
    suggestion: '고객 이탈 데이터를 SQL로 집계해 이탈 구간을 찾아낸 프로젝트를 계기로, 데이터 기반 의사결정이 성과를 바꾼다는 확신을 얻었습니다. 입사 후에는 A/B 테스트 설계와 Tableau 대시보드 구축으로 팀의 주요 지표를 개선하는 데 기여하겠습니다.',
    reason: '추상적 표현("열심히")을 구체적 경험과 공고 핵심 키워드로 교체',
    keywords: ['SQL', 'A/B 테스트', 'Tableau', '데이터 기반 의사결정'],
  },
  {
    id: 'q2', title: '협업 경험과 본인의 역할 (600자)',
    original: '팀 프로젝트에서 팀원들과 소통하며 문제를 해결했습니다. 제가 분위기를 이끌어 좋은 결과를 얻었습니다.',
    suggestion: '4인 팀 프로젝트에서 데이터 전처리를 맡아 결측치 기준을 팀과 합의하고, 주 2회 공유 대시보드로 진행 상황을 투명하게 공개했습니다. 그 결과 분석 재작업을 40% 줄이고 발표에서 최우수상을 받았습니다.',
    reason: '역할·수치 결과가 없어 설득력이 낮음 → 담당 업무와 정량 성과 추가',
    keywords: ['협업', '주도성', '통계 분석'],
  },
  {
    id: 'q3', title: '직무 관련 가장 도전적이었던 경험 (700자)',
    original: '파이썬으로 데이터 분석을 해본 경험이 있습니다. 어려웠지만 끝까지 해냈습니다.',
    suggestion: 'Python으로 공공데이터 30만 건을 정제·분석해 지역별 수요 예측 모델을 만들었고, 오차율(MAPE)을 18%에서 11%로 낮췄습니다. 실패한 가설을 기록하며 변수를 재설계한 과정에서 실험적 접근의 중요성을 배웠습니다.',
    reason: '도전 과정과 해결 방법, 성과 지표가 모두 빠져 있음',
    keywords: ['Python', '통계 분석', '실험'],
  },
]

export const PERSONAS = [
  { id: 'hr', name: '인사 담당 면접관', desc: '인재상·조직 적합성 중심', tone: '차분' },
  { id: 'lead', name: '현업 팀장', desc: '직무 역량·실무 깊이 중심', tone: '날카로움' },
  { id: 'pressure', name: '압박 면접관', desc: '약점·모순 집중 추궁', tone: '압박' },
]

export const QUESTIONS = {
  hr: [
    { q: '우리 회사에 지원한 이유와, 그 이유를 뒷받침하는 경험을 말씀해 주세요.', kw: ['데이터', '의사결정', '경험', '기여'] },
    { q: '팀에서 의견 충돌이 있었을 때 어떻게 조율하셨나요?', kw: ['합의', '데이터', '설득', '결과'] },
  ],
  lead: [
    { q: 'A/B 테스트 결과가 통계적으로 유의하지 않다면 어떤 결정을 내리시겠습니까?', kw: ['표본', 'p-value', '신뢰구간', '추가 실험'] },
    { q: 'SQL로 월별 재구매율을 구하는 방법을 설명해 주세요.', kw: ['JOIN', 'GROUP BY', '윈도우', '코호트'] },
  ],
  pressure: [
    { q: '자소서에 "열심히 했다"는 표현이 많은데, 실제로 성과를 증명할 수 있나요?', kw: ['수치', '%', '결과', '증거'] },
    { q: '프로젝트 성과가 본인 기여가 아니라 팀 덕분 아닌가요? 본인 몫을 구체적으로 말해 보세요.', kw: ['담당', '역할', '직접', '%'] },
  ],
}

export const MY_TREND = [38, 44, 47, 55, 61, 66]

export const ADMIN = {
  daily: [112, 128, 97, 143, 151, 138, 160],
  sources: [
    { name: '공공데이터포털', ok: 482, fail: 6 },
    { name: '서울 열린데이터', ok: 233, fail: 11 },
    { name: '나라일터', ok: 190, fail: 2 },
    { name: '사람인(승인 대기)', ok: 0, fail: 0 },
  ],
  analysis: { total: 1204, success: 1168 },
  users: [
    { email: 'user01@example.com', role: 'USER', joined: '11-02' },
    { email: 'user02@example.com', role: 'USER', joined: '11-05' },
    { email: 'user03@example.com', role: 'USER', joined: '11-12' },
  ],
}
