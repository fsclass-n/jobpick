from backend.app.security import is_valid_password

from .conftest import ADMIN, SANDBOX, USER


def test_password_rule():
    assert is_valid_password("Abcdef1!")
    for weak in ("abcdefg1!", "ABCDEFG1!", "Abcdefgh!", "Abcdefg12", "Ab1!"):
        assert not is_valid_password(weak)


def test_signup_validates_password(client):
    res = client.post("/api/auth/signup", json={"email": "new@jobpick.kr", "password": "weakpass", "name": "신규"})
    assert res.status_code == 422
    res = client.post("/api/auth/signup", json={"email": "new@jobpick.kr", "password": "Strong!2026", "name": "신규"})
    assert res.status_code == 201
    assert res.json()["session"] == "user" and res.json()["user"]["role"] == "USER"
    assert client.post("/api/auth/signup", json={"email": "new@jobpick.kr", "password": "Strong!2026",
                                                 "name": "중복"}).status_code == 409


def test_login_sessions_are_separated(client):
    user = client.post("/api/auth/login", json=dict(zip(("email", "password"), USER))).json()
    sandbox = client.post("/api/auth/login", json=dict(zip(("email", "password"), SANDBOX))).json()
    assert user["session"] == "user" and sandbox["session"] == "sandbox"
    # 정식 관리자는 일반 로그인 경로로 로그인할 수 없음 (존재 여부도 노출하지 않음)
    res = client.post("/api/auth/login", json=dict(zip(("email", "password"), ADMIN)))
    assert res.status_code == 401
    # 일반/테스트 관리자 계정은 정식 관리자 로그인 경로로 로그인할 수 없음
    for creds in (USER, SANDBOX):
        assert client.post("/api/admin/auth/login", json=dict(zip(("email", "password"), creds))).status_code == 401


def test_token_scopes(client, user_headers, sandbox_headers, admin_headers):
    assert client.get("/api/admin/stats", headers=user_headers).status_code == 403
    assert client.get("/api/admin/stats", headers=sandbox_headers).status_code == 403
    assert client.get("/api/admin/stats", headers=admin_headers).status_code == 200
    assert client.get("/api/sandbox/admin/stats", headers=user_headers).status_code == 403
    assert client.get("/api/sandbox/admin/stats", headers=admin_headers).status_code == 403
    assert client.get("/api/sandbox/admin/stats", headers=sandbox_headers).status_code == 200
    assert client.get("/api/resumes", headers=admin_headers).status_code == 403
    assert client.get("/api/admin/logs", headers=sandbox_headers).status_code == 403
    assert client.get("/api/sandbox/admin/logs", headers=sandbox_headers).status_code == 404
    assert client.get("/api/admin/stats", headers={"Authorization": "Bearer invalid"}).status_code == 401


def test_test_accounts_never_include_admin(client):
    data = client.get("/api/auth/test-accounts").json()
    emails = [a["email"] for a in data["accounts"]]
    assert {a["type"] for a in data["accounts"]} == {"user", "sandbox"}
    assert ADMIN[0] not in emails


def test_lockout_after_failed_attempts(client):
    client.post("/api/auth/signup", json={"email": "lock@jobpick.kr", "password": "Strong!2026", "name": "잠금"})
    for _ in range(5):
        assert client.post("/api/auth/login", json={"email": "lock@jobpick.kr", "password": "Wrong!2026"}).status_code == 401
    res = client.post("/api/auth/login", json={"email": "lock@jobpick.kr", "password": "Strong!2026"})
    assert res.status_code == 423


def test_admin_login_is_logged(client, admin_headers):
    logs = client.get("/api/admin/logs", headers=admin_headers).json()
    assert any(l["action"] == "admin:login" and l["success"] for l in logs)
