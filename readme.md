# jobpick

> 공고를 고르는 서비스가 아니라, **합격까지의 거리를 줄여 주는** 생성형 AI & RPA 커리어 코치

RPA가 채용 공고를 수집하면 생성형 AI(Gemini)가 공고를 정형화하고, 하나의 **Pick 여정**으로 매칭 → 갭 분석 → 자소서 리라이팅 → 모의면접까지 이어 줍니다.

| 단계 | 화면 | 내용 |
|---|---|---|
| 1 | **Match** `/match` | 공고별 적합도와 합격 거리, 레이더 차트, 필터·스크랩 |
| 2 | **Gap** `/gap` | 스크랩한 공고 N개의 요구역량 집계 → 부족 역량 TOP, 주차별 보완 계획 |
| 3 | **Rewrite** `/rewrite` | 문항별 원문 vs AI 제안 diff, 키워드 하이라이트, 수락 시 점수 변동 |
| 4 | **Rehearse** `/rehearse` | 면접관 페르소나, 압박·꼬리 질문, 답변 채점 |
| - | **Journey** `/journey` | **Pick Score**(적합도 50 + 커버리지 30 + 면접 준비도 20)와 추이 |

상세 요구사항: [docs/산출물/요구사항_명세서.md](docs/산출물/요구사항_명세서.md)

## 팀
박미금(조장) · 이오리 · 김모란 · 홍기흥

## 링크
| 구분 | URL |
|---|---|
| GitHub | https://github.com/fsclass-n/jobpick |
| Pages | https://fsclass-n.github.io/jobpick/ |
| Demo (Netlify) | https://jobpick.netlify.app |
| Frontend (Render) | https://jobpick.onrender.com |
| API (Render) | https://jobpick-api.onrender.com |

## 기술 스택
React(Vite)·React Router·Tailwind v4 / FastAPI·PyJWT(권한별 비밀키 분리) / TiDB / Requests·BeautifulSoup4·Playwright·OCR·pandas / Gemini / Netlify·Render·GitHub Actions(CI)

## 권한
| 구분 | 코드 | 로그인 | 비고 |
|---|---|---|---|
| 일반 사용자 | `USER` | `/login` (샘플 데이터 체험 가능) | 체험 모드는 서버 저장 없음 |
| 테스트 관리자 | `TEST_ADMIN` | `/login` 테스트 관리자 버튼 | 관리자 화면 읽기 전용 (변경 요청 서버 403) |
| 실제 관리자 | `ADMIN` | `/admin/login` (링크 비노출) | `.env`의 `ADMIN_ACCESS_KEY`로 진입, 전체 CRUD |

## 로컬 실행
```bash
cp .env.example .env
python -m venv .venv && .venv/Scripts/pip install -r requirements.txt     # macOS/Linux: .venv/bin/pip
.venv/Scripts/python -m uvicorn backend.app.main:app --reload             # http://localhost:8000/docs
cd frontend && npm ci && npm run dev                                      # http://localhost:5173
```

## 배포
Netlify·Render가 GitHub 연동으로 직접 빌드하며(`netlify.toml`, `render.yaml`), GitHub Actions(`.github/workflows/deploy.yml`)는 CI 게이트입니다. GitHub Secrets는 사용하지 않습니다.
