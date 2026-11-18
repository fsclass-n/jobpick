# jobpick

> 생성형 AI & RPA 기반 맞춤형 커리어 컨설팅 시스템

RPA가 채용 공고를 수집하면, 생성형 AI가 사용자의 자소서와 대조해 합격 가능성을 분석하고 수정 가이드라인을 써주는 형태입니다.

- 채용 플랫폼·공공 채용정보 API에서 공고 자동 수집 (RPA)
- 공고의 자격요건·우대사항·인재상과 자소서·이력서를 대조해 **합격 가능성(적합도)** 산출 (Google Gemini)
- 문항별 강점·보완점 진단과 **수정 가이드라인** 제공

상세 요구사항은 [docs/산출물/요구사항_명세서.md](docs/산출물/요구사항_명세서.md)를 참고하세요.

## 팀
| 이름 | 역할 |
|---|---|
| 박미금 | 조장 |
| 이오리 | 팀원 |
| 김모란 | 팀원 |
| 홍기흥 | 팀원 |

## 링크
| 구분 | URL |
|---|---|
| GitHub Repository | https://github.com/fsclass-n/jobpick |
| GitHub Pages | https://fsclass-n.github.io/jobpick/ |
| Frontend Demo (Netlify) | https://jobpick.netlify.app |
| Frontend (Render) | https://jobpick.onrender.com |
| Backend API (Render) | https://jobpick-api.onrender.com |

## 기술 스택
| 영역 | 기술 |
|---|---|
| Frontend | React (Vite), React Router, Tailwind CSS v4 |
| Backend | Python 3.11, FastAPI, JWT(권한별 분리), bcrypt, OAuth 2.0 (Google·Naver·Kakao), TOTP |
| Database / Storage | TiDB Cloud (MySQL 호환, 로컬은 SQLite 가능), 로컬/클라우드 버킷 |
| RPA / Data | Requests, BeautifulSoup4, Playwright, OCR, NumPy, pandas |
| AI | Google Gemini API |
| Infra / CI·CD | Render, Netlify, Docker Compose, GitHub Actions |

## 권한 체계
| 구분 | 권한 코드 | 로그인 경로 | 접근 경로 |
|---|---|---|---|
| 일반 사용자 | `USER` | `/login` | 서비스 페이지 / `/api/**` |
| 테스트 관리자 | `TEST_ADMIN` | `/login` (간편 로그인) | `/sandbox/admin/**` / `/api/sandbox/admin/**` |
| 정식 관리자 | `ADMIN` | `/admin/login` (TOTP 필수) | `/admin/**` / `/api/admin/**` |

## 디렉터리 구조
```plaintext
jobpick/
├── backend/           # FastAPI API 서버 (인증, AI 분석 엔진)
├── frontend/          # React (Vite, Tailwind CSS)
├── rpa/               # 채용 공고 수집·OCR 자동화 스크립트
├── docs/              # 진행일지, 설계서, PDF, 발표자료
│   ├── md/
│   ├── 프로젝트_진행일지/
│   ├── 산출물/
│   └── pdf/
├── .github/workflows/ # GitHub Actions 배포 설정
├── .env.example       # 환경 변수 예시 (프런트/백엔드/RPA 구분)
├── requirements.txt   # Python 통합 의존성
└── docker-compose.yml
```

## 개발 단계
1. **프런트엔드 + Netlify 데모**: Mock 데이터·Mock 인증으로 화면 구성
2. **백엔드·RPA·AI 통합**: FastAPI, 권한별 인증, 공고 수집, OCR/LLM 분석, TiDB 연동 로컬 검증
3. **Render 배포**: 프런트엔드(Static Site) + 백엔드 API(Web Service)

## 로컬 환경 설정
```bash
cp .env.example .env           # 값 채우기 (정식 관리자 계정 정보는 넣지 않음)
python -m venv .venv           # Python 3.11.x
```
