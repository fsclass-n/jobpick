# AGENTS.md — jobpick 작업 가이드

## 명령어

| 작업 | 명령 (저장소 루트 기준) |
|---|---|
| 가상환경 | `py -3.11 -m venv .venv` → `.venv/Scripts/python` (Windows) |
| 의존성 | `.venv/Scripts/python -m pip install -r requirements.txt` |
| 백엔드 실행 | `.venv/Scripts/python -m uvicorn backend.app.main:app --reload --port 8000` |
| 백엔드·RPA 테스트 | `.venv/Scripts/python -m pytest -q` (19건, 임시 SQLite 사용) |
| RPA 수집 | `.venv/Scripts/python -m rpa.run --all` / `--source-id N` / `--list` / `--ocr file.pdf` |
| 정식 관리자 생성 | `.venv/Scripts/python -m backend.scripts.create_admin --email ...` (`--totp` 로 TOTP 키 생성) |
| 프런트 개발 | `cd frontend && npm run dev` (API 연동) / `npm run dev:demo` (Mock) |
| 프런트 빌드 | `cd frontend && npm run build` / `npm run build:demo` |
| 산출물 PDF/PPTX | `.venv/Scripts/python docs/build_docs.py` (Playwright Chromium 필요) |

## 규칙

- 환경 변수는 루트 `.env` 하나로 관리합니다. 프런트의 Vite 도 `envDir: '..'` 로 같은 파일을 읽습니다.
  - 새 변수를 추가하면 `.env.example` 에 `[Backend]` / `[Frontend]` / `[RPA]` / `[Secret]` 구분과 함께 적습니다.
- Python 의존성은 루트 `requirements.txt` 하나로 관리하고 버전을 고정합니다.
  - 새 패키지는 게시된 지 7일 이상 지난 버전을 씁니다: `pip install --uploaded-prior-to <date>`, `npm install --before=<date>`
- 권한은 3종으로 분리되어 있습니다: `USER`, `TEST_ADMIN`, `ADMIN`.
  - 관리자 API는 `backend/app/routers/admin.py` 의 `build_admin_router()` 팩토리 하나로 운영(`/api/admin`)과 샌드박스(`/api/sandbox/admin`)를 동시에 만듭니다.
  - 새 관리자 기능도 이 팩토리 안에 추가하고, `is_sandbox` 범위 필터를 반드시 적용합니다.
- 프런트 API 인터페이스는 `frontend/src/api/http.js` (실 API)와 `frontend/src/api/mock.js` (Netlify 데모)가 같습니다. API를 추가·변경하면 두 파일을 함께 수정합니다.
- 분석 엔진의 규칙 기반 로직은 두 곳에 있습니다: `backend/app/services/analyzer.py` 와 JS 포팅본 `frontend/src/lib/analyzer.js`. 점수 산식을 바꾸면 둘 다 수정합니다.
- 샘플 공고 `rpa/data/sample_jobs.json` 은 백엔드 시드와 프런트 Mock 이 함께 씁니다. 회사명은 모두 가상입니다.

## 알려진 주의사항

- Windows Git Bash 에서 Python 에 `/path` 인자를 넘기면 경로가 변환됩니다. 필요하면 `MSYS_NO_PATHCONV=1` 을 붙입니다.
- 최신 Chromium 의 `window.scrollTo` 는 Promise 를 반환합니다. `useEffect(() => window.scrollTo(...))` 처럼 화살표 함수가 값을 반환하게 쓰지 말고 블록 문으로 작성합니다.
- 로그인 이메일은 `.test` / `.local` 테스트 도메인을 허용해야 하므로 `EmailStr` 대신 형식 정규식으로 검사합니다. 회원가입은 `EmailStr` 을 씁니다.
