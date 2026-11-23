# AGENTS.md

## 서비스 콘셉트
- jobpick = Pick 여정: **Match**(공고 매칭·합격 거리) → **Gap**(갭 로드맵) → **Rewrite**(리라이팅 스튜디오) → **Rehearse**(모의면접), 단계별 결과를 **Pick Score**(적합도 50 + 역량 커버리지 30 + 면접 준비도 20)로 통합
- 권한은 `USER`(체험 모드 포함)·`ADMIN`(TOTP 필수) 2종. 테스트 관리자/샌드박스는 폐지

jobpick 저장소에서 작업할 때 따르는 규칙입니다. 전체 요구사항은 `docs/산출물/요구사항_명세서.md`를 기준으로 합니다.

## 구조
- `frontend/`: React (Vite) + React Router + Tailwind CSS v4
- `backend/`: Python 3.11.x + FastAPI
- `rpa/`: Requests, BeautifulSoup4, Playwright, OCR 기반 공고 수집
- `docs/`: `md/`(작업 기록 누적), `프로젝트_진행일지/`, `산출물/`, `pdf/`

## 환경
- Python 가상환경은 루트 `.venv/`, 의존성은 루트 `requirements.txt` 하나로 관리 (backend·rpa 공용)
- 환경 변수는 루트 `.env` 하나로 관리하고, 새 변수를 추가하면 `.env.example`의 해당 구분(Frontend/Backend/RPA)에도 추가
- Vite는 기본적으로 `frontend/`에서 `.env`를 읽으므로 `vite.config`에 `envDir: '..'`를 설정해 루트 `.env` 사용
- 프런트엔드 API 주소는 `VITE_API_BASE_URL`로만 참조 (하드코딩 금지)
- 백엔드 CORS는 `CORS_ORIGINS`로 관리하고 Netlify·Render 프런트·로컬 도메인 포함

## 보안 규칙 (반드시 지킬 것)
- `.env`는 커밋하지 않음
- `USER_JWT_SECRET`과 `ADMIN_JWT_SECRET`은 서로 다른 값 사용
- `ADMIN_INITIAL_EMAIL`, `ADMIN_INITIAL_PASSWORD`, 정식 관리자 TOTP 시크릿 값은 저장소·`.env.example`·프런트엔드 코드에 절대 넣지 않음 (Render 대시보드 전용)
- `VITE_` 접두사 변수는 브라우저에 노출되므로 비밀값을 넣지 않음
- 권한 검사는 프런트 라우트 가드와 백엔드 API 양쪽에 적용
  - `/api/admin/**`: 정식 관리자 토큰(`ADMIN_JWT_SECRET` 서명 + TOTP 통과)만 허용, 그 외 토큰은 403
- 정식 관리자 계정은 서버 초기화 스크립트로만 생성 (회원가입 API로 생성 불가)

## 배포
- GitHub Secrets/Variables는 쓰지 않음. Netlify·Render가 GitHub 연동으로 직접 빌드·배포
- `netlify.toml`(Netlify 데모), `render.yaml`(Render Static Site `jobpick` + Web Service `jobpick-api`)에 빌드 설정을 코드로 관리
- `.github/workflows/deploy.yml`은 CI 게이트 (프런트 빌드, 백엔드 기동·`/api/health` 확인). Render는 CI 통과 커밋만 배포(`checksPass`)
- `frontend/**` 변경 → Netlify + Render 프런트, `backend/**`·`rpa/**`·`requirements.txt`·`.python-version` 변경 → Render API
- Python 버전은 `.python-version`(3.11)으로 고정 (Render 기본값 3.14)
- 플랫폼별 설정값은 `netlify.toml`, `render.yaml` 참고

## 실행·검증 명령
- 백엔드: `.venv/Scripts/python -m uvicorn backend.app.main:app --reload` → `GET /api/health`
- 프런트: `cd frontend && npm ci && npm run build` (개발 서버 `npm run dev`)
- 워크플로 수정 시 actionlint로 검사

## 채용 공고 수집원
- 고용24 채용정보 목록/상세 API는 개인 신청 불가 → 공공데이터포털·서울 열린데이터광장을 주 수집원으로 사용
- 사람인 API는 승인 시 추가, 크롤링은 robots.txt·약관 확인 후 저빈도로만

## 문서 규칙
- 작업을 마치면 `docs/md/`에 `YYYY-MM-DD_작업명.md` 형식으로 작업 내용을 기록
- 일별 진행 내역은 `docs/프로젝트_진행일지/`에 팀원별 담당 업무와 함께 기록

## 미결 사항
- Pick Score 가중치(50/30/20)는 2단계에서 샘플 데이터로 검증 후 조정
- 관리자 로그인(TOTP)은 아직 미구현이라 `/api/admin/login`이 503/501을 반환함 (의도된 동작)

