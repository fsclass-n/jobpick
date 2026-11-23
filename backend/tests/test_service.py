from backend.app.services.analyzer import analyze_rule_based
from backend.app.services.resume_parser import parse_resume_text

JOB = {
    "company": "테스트", "title": "백엔드 개발자", "description": "",
    "requirements": ["Python 웹 개발 경험", "SQL 이해"], "preferred": ["Docker 경험"], "talent": ["협업"],
    "keywords": ["Python", "SQL", "Docker", "협업"],
}


def test_rule_analyzer_rewards_matching_resume():
    good = [{"question": "경험", "answer": "Python 과 SQL 로 API 를 개발했고 Docker 로 배포했습니다. 팀원 4명과 협업해 "
                                         "응답 시간을 40% 단축한 결과를 얻었고 그 과정에서 많이 배웠습니다. " * 4}]
    bad = [{"question": "경험", "answer": "열심히 하겠습니다."}]
    good_res, bad_res = analyze_rule_based(JOB, good), analyze_rule_based(JOB, bad)
    assert good_res["score"] > bad_res["score"] + 30
    assert good_res["keyword_match_rate"] == 100.0
    assert set(bad_res["missing_keywords"]) >= {"Python", "SQL"}
    assert bad_res["question_feedback"][0]["suggested_keywords"]


def test_resume_parser_splits_questions():
    text = "홍길동 지원서\n1. 지원 동기를 작성해 주세요.\n저는 개발자입니다.\n2. 성장 과정 (500자)\n어릴 때부터"
    items = parse_resume_text(text)
    assert [i["question"] for i in items][1:] == ["1. 지원 동기를 작성해 주세요.", "2. 성장 과정 (500자)"]
    assert items[1]["answer"] == "저는 개발자입니다."


def test_resume_versioning_and_analysis(client, user_headers):
    body = {"title": "버전 테스트", "target_job": "백엔드",
            "items": [{"question": "지원 동기", "answer": "Python 으로 서비스를 만들었습니다."}]}
    resume = client.post("/api/resumes", json=body, headers=user_headers).json()
    assert resume["version"] == 1
    body["items"][0]["answer"] += " SQL 최적화로 응답 속도를 50% 개선했습니다."
    updated = client.put(f"/api/resumes/{resume['id']}", json=body, headers=user_headers).json()
    assert updated["version"] == 2 and len(updated["versions"]) == 2
    restored = client.post(f"/api/resumes/{resume['id']}/restore/1", headers=user_headers).json()
    assert restored["version"] == 3 and restored["items"][0]["answer"] == "Python 으로 서비스를 만들었습니다."

    job_id = client.get("/api/jobs", params={"category": "백엔드"}).json()["items"][0]["id"]
    res = client.post("/api/analyses", json={"resume_id": resume["id"], "job_id": job_id}, headers=user_headers)
    assert res.status_code == 201
    data = res.json()
    assert data["engine"] == "rule" and 0 < data["score"] <= 100
    assert data["result"]["question_feedback"]
    assert client.get("/api/dashboard", headers=user_headers).json()["analysis_count"] >= 1


def test_ocr_text_upload(client, user_headers):
    content = "1. 지원 동기\nPython 개발 경험이 있습니다.\n2. 입사 후 포부\n성장하겠습니다.".encode()
    res = client.post("/api/resumes/ocr", files={"file": ("resume.txt", content, "text/plain")}, headers=user_headers)
    assert res.status_code == 200, res.text
    assert len(res.json()["items"]) == 2 and res.json()["file_token"]
    bad = client.post("/api/resumes/ocr", files={"file": ("a.exe", b"MZ", "application/octet-stream")},
                      headers=user_headers)
    assert bad.status_code == 415


def test_job_scrap(client, user_headers):
    job_id = client.get("/api/jobs").json()["items"][0]["id"]
    assert client.post(f"/api/jobs/{job_id}/scrap", headers=user_headers).status_code == 204
    assert client.get(f"/api/jobs/{job_id}", headers=user_headers).json()["is_scrapped"]
    assert client.delete(f"/api/jobs/{job_id}/scrap", headers=user_headers).status_code == 204
    assert client.post(f"/api/jobs/{job_id}/scrap").status_code == 401
