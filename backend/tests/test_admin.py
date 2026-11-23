def _user_id(client, headers, prefix, email):
    users = client.get(f"{prefix}/users", params={"q": email}, headers=headers).json()["items"]
    return users[0]["id"]


def test_sandbox_and_production_users_are_isolated(client, sandbox_headers, admin_headers):
    sandbox_users = client.get("/api/sandbox/admin/users", headers=sandbox_headers).json()["items"]
    prod_users = client.get("/api/admin/users", headers=admin_headers).json()["items"]
    assert sandbox_users and all(u["is_sandbox"] for u in sandbox_users)
    assert prod_users and not any(u["is_sandbox"] for u in prod_users)
    prod_id = _user_id(client, admin_headers, "/api/admin", "user@jobpick.test")
    res = client.patch(f"/api/sandbox/admin/users/{prod_id}/role", json={"role": "TEST_ADMIN"}, headers=sandbox_headers)
    assert res.status_code == 404


def test_role_change_rules(client, admin_headers, sandbox_headers):
    member_id = _user_id(client, admin_headers, "/api/admin", "member1@jobpick.example")
    res = client.patch(f"/api/admin/users/{member_id}/role", json={"role": "TEST_ADMIN"}, headers=admin_headers)
    assert res.status_code == 200 and res.json()["role"] == "TEST_ADMIN"
    client.patch(f"/api/admin/users/{member_id}/role", json={"role": "USER"}, headers=admin_headers)
    admin_id = _user_id(client, admin_headers, "/api/admin", "root@jobpick.local")
    assert client.patch(f"/api/admin/users/{admin_id}/role", json={"role": "USER"}, headers=admin_headers).status_code == 400
    assert client.patch(f"/api/admin/users/{member_id}/role", json={"role": "ADMIN"}, headers=admin_headers).status_code == 422
    dummy_id = client.get("/api/sandbox/admin/users", headers=sandbox_headers).json()["items"][0]["id"]
    assert client.patch(f"/api/sandbox/admin/users/{dummy_id}/role", json={"role": "TEST_ADMIN"},
                        headers=sandbox_headers).status_code == 200
    logs = client.get("/api/admin/logs", params={"action": "role_change"}, headers=admin_headers).json()
    assert any(l["action"] == "sandbox:role_change" for l in logs)
    assert any(l["action"] == "admin:role_change" for l in logs)


def test_sandbox_crawl_restricted_to_sample(client, sandbox_headers, admin_headers):
    body = {"name": "실수집", "kind": "worknet", "keywords": ["개발"], "schedule": "매일 06:00"}
    assert client.post("/api/sandbox/admin/crawl/sources", json=body, headers=sandbox_headers).status_code == 403
    sources = client.get("/api/sandbox/admin/crawl/sources", headers=sandbox_headers).json()
    prod_sources = client.get("/api/admin/crawl/sources", headers=admin_headers).json()
    assert {s["id"] for s in sources}.isdisjoint({s["id"] for s in prod_sources})
    assert client.post(f"/api/sandbox/admin/crawl/sources/{prod_sources[0]['id']}/run",
                       headers=sandbox_headers).status_code == 404
    res = client.post(f"/api/sandbox/admin/crawl/sources/{sources[0]['id']}/run", headers=sandbox_headers)
    assert res.status_code == 202
    runs = client.get("/api/sandbox/admin/crawl/runs", headers=sandbox_headers).json()
    assert runs[0]["trigger"] == "manual" and runs[0]["status"] == "success"


def test_stats_shape(client, admin_headers):
    stats = client.get("/api/admin/stats", headers=admin_headers).json()
    assert stats["scope"] == "production"
    assert len(stats["daily_collection"]) == 14
    assert 0 <= stats["totals"]["analysis_success_rate"] <= 100
