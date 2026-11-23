# 04. API 명세서

- 기본 URL은 환경에 따라 다릅니다.
  - 운영: `https://jobpick-api.onrender.com`
  - 로컬: `http://localhost:8000`
- 대화형 문서는 `/docs` (Swagger UI)와 `/redoc` 에서 볼 수 있습니다.
- 인증은 `Authorization: Bearer <access_token>` 헤더로 합니다.
- 오류 응답 형식은 `{"detail": "메시지"}` 입니다. 입력 검증 오류(422)일 때 `detail` 은 배열입니다.

## 인증 범위 표기

| 표기 | 허용 토큰 |
|---|---|
| 공개 | 토큰 불필요 |
| 사용자 | 일반 사용자(`user`) 또는 테스트 관리자(`sandbox`) 토큰 |
| 샌드박스 | 테스트 관리자(`sandbox`) 토큰만 |
| 관리자 | 정식 관리자(`admin`) 토큰만 — 별도 비밀키로 서명 |

허용되지 않은 종류의 유효한 토큰으로 요청하면 **403** 이 반환됩니다. 토큰이 없거나 만료·위조된 경우는 **401** 입니다.

## 1. 인증

| 메서드 | 경로 | 범위 | 설명 |
|---|---|---|---|
| POST | `/api/auth/signup` | 공개 | 회원가입 (비밀번호 규칙 검증) → 사용자 토큰 |
| POST | `/api/auth/login` | 공개 | 일반 사용자·테스트 관리자 로그인. 정식 관리자 계정은 401 |
| GET | `/api/auth/me` | 사용자 | 내 정보 |
| GET | `/api/auth/test-accounts` | 공개 | 간편 로그인용 테스트 계정 (`ENABLE_TEST_ACCOUNTS`). 정식 관리자 미포함 |
| GET | `/api/auth/oauth/providers` | 공개 | 소셜 로그인 설정 여부 |
| GET | `/api/auth/oauth/{provider}/login` | 공개 | `google`·`naver`·`kakao` 인가 페이지로 리디렉션 |
| GET | `/api/auth/oauth/{provider}/callback` | 공개 | 코드 교환 후 `FRONTEND_URL/oauth/callback#token=...` 로 리디렉션 |
| POST | `/api/admin/auth/login` | 공개 | **정식 관리자 전용 로그인** (`otp` 선택) → 관리자 토큰 |
| GET | `/api/admin/auth/config` | 공개 | 관리자 로그인 활성화·OTP 필요 여부·세션 시간 |
| GET | `/api/admin/auth/me` | 관리자 | |
| POST | `/api/admin/auth/logout` | 관리자 | 로그아웃 기록 |

### 요청/응답 예시

```http
POST /api/auth/login
Content-Type: application/json

{"email": "user@jobpick.test", "password": "Jobpick!2026"}
```

```json
{
  "access_token": "eyJhbGciOi...",
  "token_type": "bearer",
  "session": "user",
  "expires_in": 43200,
  "user": {"id": 2, "email": "user@jobpick.test", "name": "테스트 사용자", "role": "USER", "...": "..."}
}
```

상태 코드는 다음과 같습니다.

| 코드 | 의미 |
|---|---|
| 401 | 자격 증명 불일치 |
| 403 | 비활성 계정 |
| 409 | 이메일 중복 (가입 시) |
| 422 | 비밀번호 규칙 위반 |
| 423 | 로그인 잠금 |

## 2. 채용 공고

| 메서드 | 경로 | 범위 | 파라미터 / 설명 |
|---|---|---|---|
| GET | `/api/jobs` | 공개(토큰 있으면 스크랩 여부 포함) | `q, category, location, career, company_size, sort=latest\|deadline, page, size≤50` |
| GET | `/api/jobs/filters` | 공개 | 필터 선택지 |
| GET | `/api/jobs/keywords/popular` | 공개 | `limit` — 전체·직무별 인기 키워드 |
| GET | `/api/jobs/{job_id}` | 공개 | 공고 상세 |
| POST / DELETE | `/api/jobs/{job_id}/scrap` | 사용자 | 스크랩 / 해제 (204) |
| GET | `/api/jobs/scraps/me` | 사용자 | 내 스크랩 목록 |

## 3. 자소서·이력서

| 메서드 | 경로 | 범위 | 설명 |
|---|---|---|---|
| GET | `/api/resumes` | 사용자 | 내 자소서 목록 |
| POST | `/api/resumes?source_type=&file_token=` | 사용자 | 생성 `{title, target_job, items:[{question, answer}]}` (v1) |
| GET | `/api/resumes/{id}` | 사용자 | 상세 + 버전 이력 |
| PUT | `/api/resumes/{id}` | 사용자 | 수정 → 내용이 바뀐 경우 버전 +1 |
| POST | `/api/resumes/{id}/restore/{version}` | 사용자 | 지정 버전으로 복원 (새 버전으로 기록) |
| DELETE | `/api/resumes/{id}` | 사용자 | 삭제 (업로드 원본 포함) |
| POST | `/api/resumes/ocr` | 사용자 | `multipart/form-data` `file` (PDF·PNG·JPG·WEBP·TXT, 10MB) → `{text, items, engine, pages, file_token}` |

## 4. AI 분석

| 메서드 | 경로 | 범위 | 설명 |
|---|---|---|---|
| POST | `/api/analyses` | 사용자 | `{resume_id, job_id}` → 분석 리포트 (201) |
| GET | `/api/analyses?resume_id=&job_id=&limit=` | 사용자 | 분석 이력 요약 |
| GET | `/api/analyses/{id}` | 사용자 | 리포트 상세 |
| DELETE | `/api/analyses/{id}` | 사용자 | 삭제 |
| GET | `/api/dashboard` | 사용자 | 대시보드 요약 (자소서·분석·스크랩 수, 평균/최고 점수, 추이) |

### 분석 리포트 응답 예시 (`result` 일부)

```json
{
  "score": 71.2,
  "keyword_match_rate": 80.0,
  "engine": "rule",
  "status": "success",
  "result": {
    "grade": {"label": "합격 가능성 보통", "level": "medium"},
    "summary": "핀브릿지 '데이터 분석가 (주니어)' 공고 대비 적합도는 71.2점...",
    "section_scores": {"keyword": 80.0, "requirements": 100.0, "preferred": 50.0, "talent": 50.0, "writing": 76.0},
    "matched_keywords": ["SQL", "Python", "pandas", "통계"],
    "missing_keywords": ["A/B 테스트"],
    "question_feedback": [
      {"question": "1. 지원 동기", "score": 82.4, "feedback": ["..."], "example": "\"... \""}
    ],
    "next_actions": ["..."]
  }
}
```

## 5. 관리자 (정식 `/api/admin` · 샌드박스 `/api/sandbox/admin`)

정식 관리자와 샌드박스는 같은 엔드포인트 구조를 씁니다. 다만 **인증 의존성과 데이터 범위(`is_sandbox`)가 다릅니다.**

| 메서드 | 경로 (접두사 생략) | 설명 |
|---|---|---|
| GET | `/stats?days=7~60` | 모니터링 통계 (일별 수집, 출처별 성공률, 분석 성공/폴백/실패, 엔진 비율, 점수 분포, 직무별 공고) |
| GET | `/users?q=&role=&page=&size=` | 회원 목록 |
| PATCH | `/users/{id}/role` | `{"role": "USER" \| "TEST_ADMIN"}` — 본인·정식 관리자 대상 불가 |
| PATCH | `/users/{id}/active` | `{"is_active": bool}` |
| GET / POST | `/crawl/sources` | 수집 대상 목록 / 추가 (샌드박스는 `kind=sample` 만) |
| PUT / DELETE | `/crawl/sources/{id}` | 수정 / 삭제 |
| POST | `/crawl/sources/{id}/run` | 즉시 실행 (202, 백그라운드) |
| GET | `/crawl/runs` | 최근 실행 이력 |
| GET | `/logs?action=&limit=` | **정식 관리자 전용** 관리자 접속 로그 (샌드박스에는 없음 → 404) |

## 6. 헬스 체크

| 메서드 | 경로 | 응답 |
|---|---|---|
| GET | `/api/health` | `{"status":"ok","env":"production","ai_engine":"gemini\|rule","admin_login":true}` |
