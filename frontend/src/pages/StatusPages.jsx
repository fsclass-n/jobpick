import { useLocation } from 'react-router-dom'
import { Button } from '../components/ui'
import { useAuth } from '../context/AuthContext'

function StatusLayout({ code, icon, title, description, children }) {
  return (
    <section className="container-page flex flex-col items-center py-24 text-center md:py-32">
      <p className="font-display text-7xl font-bold text-ink-100 md:text-9xl">{code}</p>
      <div className="-mt-10 grid h-16 w-16 place-items-center rounded-2xl bg-white text-2xl text-pick-500 shadow-lift md:-mt-14">
        <i className={icon} />
      </div>
      <h1 className="mt-6 text-2xl font-bold md:text-3xl">{title}</h1>
      <p className="mt-3 max-w-md text-ink-500">{description}</p>
      <div className="mt-8 flex flex-wrap justify-center gap-2">{children}</div>
    </section>
  )
}

export function Forbidden() {
  const { userSession } = useAuth()
  const { state } = useLocation()
  const sandbox = state?.reason === 'sandbox'
  return (
    <StatusLayout
      code="403"
      icon="fa-solid fa-lock"
      title="접근 권한이 없습니다"
      description={sandbox ? '샌드박스 관리 콘솔은 테스트 관리자 계정으로 로그인해야 이용할 수 있습니다.' : '현재 로그인한 계정의 권한으로는 이 페이지에 접근할 수 없습니다.'}
    >
      <Button to="/" variant="secondary" icon="fa-solid fa-house">홈으로</Button>
      {userSession ? <Button to="/dashboard" icon="fa-solid fa-gauge">내 대시보드</Button> : <Button to="/login" icon="fa-solid fa-right-to-bracket">로그인</Button>}
    </StatusLayout>
  )
}

export function NotFound() {
  return (
    <StatusLayout code="404" icon="fa-solid fa-map-location-dot" title="페이지를 찾을 수 없습니다" description="주소가 바뀌었거나 삭제된 페이지입니다. 아래 버튼으로 이동해 주세요.">
      <Button to="/" variant="secondary" icon="fa-solid fa-house">홈으로</Button>
      <Button to="/jobs" icon="fa-solid fa-briefcase">채용 공고 보기</Button>
    </StatusLayout>
  )
}

function Doc({ title, updated, sections }) {
  return (
    <article className="container-page max-w-3xl py-14">
      <h1 className="text-3xl font-bold">{title}</h1>
      <p className="mt-2 text-sm text-ink-400">시행일 {updated}</p>
      <div className="card mt-8 space-y-8 p-6 md:p-10">
        {sections.map(([h, body]) => (
          <section key={h}>
            <h2 className="text-lg font-bold">{h}</h2>
            <p className="mt-2 leading-relaxed whitespace-pre-line text-ink-600">{body}</p>
          </section>
        ))}
      </div>
    </article>
  )
}

export function Terms() {
  return (
    <Doc
      title="이용약관"
      updated="2026-11-18"
      sections={[
        ['제1조 (목적)', '이 약관은 jobpick(이하 "서비스")이 제공하는 채용 공고 수집·자기소개서 분석 서비스의 이용 조건과 절차를 정합니다.'],
        ['제2조 (서비스 내용)', '서비스는 공개된 채용 정보를 수집·정리하여 제공하고, 이용자가 등록한 자기소개서를 공고와 대조해 적합도 점수와 수정 가이드라인을 제공합니다.'],
        ['제3조 (분석 결과의 성격)', '분석 결과는 생성형 AI와 규칙 기반 엔진이 산출한 참고 자료이며, 실제 채용 결과를 보장하지 않습니다. 최종 판단과 책임은 이용자에게 있습니다.'],
        ['제4조 (이용자의 의무)', '이용자는 타인의 개인정보나 저작물을 무단으로 등록해서는 안 되며, 테스트 계정을 목적 외로 사용해서는 안 됩니다.'],
        ['제5조 (수집 정보의 출처)', '채용 공고는 공공 채용정보 API 및 이용약관과 robots.txt 정책상 수집이 허용된 페이지에서 수집하며, 원문 링크를 함께 제공합니다.'],
      ]}
    />
  )
}

export function Privacy() {
  return (
    <Doc
      title="개인정보처리방침"
      updated="2026-11-18"
      sections={[
        ['1. 수집 항목', '필수: 이메일, 이름, 비밀번호(암호화 저장)\n선택: 희망 직무\n소셜 로그인 시: 제공자 식별값, 이메일, 이름(닉네임)\n서비스 이용 중: 자기소개서 내용, 업로드 파일, 분석 결과, 접속 기록'],
        ['2. 이용 목적', '회원 식별 및 로그인, 자기소개서 분석 및 이력 제공, 서비스 품질 개선 통계(개인을 식별할 수 없는 형태)'],
        ['3. 보관 및 파기', '회원 탈퇴 시 지체 없이 파기합니다. 단, 관리자 접속 로그는 보안 목적으로 1년간 보관합니다.'],
        ['4. 제3자 제공 및 처리 위탁', 'AI 분석을 위해 자기소개서 텍스트와 공고 내용이 Google Gemini API로 전송될 수 있습니다. 그 외 제3자에게 제공하지 않습니다.'],
        ['5. 이용자의 권리', '이용자는 언제든지 자신의 자기소개서·분석 결과를 조회, 수정, 삭제할 수 있습니다.'],
        ['6. 문의', 'Team jobpick (박미금, 이오리, 김모란, 홍기흥) · GitHub Issues를 통해 문의할 수 있습니다.'],
      ]}
    />
  )
}
