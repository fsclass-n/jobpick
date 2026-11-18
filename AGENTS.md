# AGENTS.md

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
  - `/api/sandbox/admin/**`: 테스트 관리자 토큰, 샌드박스 데이터만 접근
- 정식 관리자 계정은 서버 초기화 스크립트로만 생성 (회원가입 API로 생성 불가)

## 배포
- `.github/workflows/deploy.yml`만 배포를 수행 (Netlify Git 빌드·Render Auto-Deploy는 Off)
- `frontend/**` 변경 → Actions 빌드 후 Netlify 데모 배포 + Render 프런트엔드 Deploy Hook
- `backend/**`, `rpa/**`, `requirements.txt`, `.python-version` 변경 → 검사 후 Render 백엔드 Deploy Hook
- Python 버전은 `.python-version`(3.11)으로 고정 (Render 기본값 3.14)
- 플랫폼별 설정값은 `docs/산출물/배포_환경설정.md` 참고

## 채용 공고 수집원
- 고용24 채용정보 목록/상세 API는 개인 신청 불가 → 공공데이터포털·서울 열린데이터광장을 주 수집원으로 사용
- 사람인 API는 승인 시 추가, 크롤링은 robots.txt·약관 확인 후 저빈도로만

## 문서 규칙
- 작업을 마치면 `docs/md/`에 `YYYY-MM-DD_작업명.md` 형식으로 작업 내용을 기록
- 일별 진행 내역은 `docs/프로젝트_진행일지/`에 팀원별 담당 업무와 함께 기록

## 미결 사항
- 샌드박스 데이터 분리 방식(별도 스키마 vs `is_sandbox` 컬럼)은 2단계 ERD 설계 시 결정

## 빌드·테스트 명령
- 아직 정의되지 않음. 프로젝트 초기화 후 이 섹션에 추가
