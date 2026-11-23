import os
import tempfile
from pathlib import Path

_tmp = Path(tempfile.mkdtemp(prefix="jobpick-test-"))
os.environ.update({
    "APP_ENV": "test",
    "DATABASE_URL": f"sqlite:///{(_tmp / 'test.db').as_posix()}",
    "STORAGE_DIR": str(_tmp / "storage"),
    "USER_JWT_SECRET": "test-user-secret-0123456789-abcdefghijklmnop",
    "ADMIN_JWT_SECRET": "test-admin-secret-0123456789-abcdefghijklmno",
    "ADMIN_INITIAL_EMAIL": "root@jobpick.local",
    "ADMIN_INITIAL_PASSWORD": "Root!Admin2026",
    "ADMIN_TOTP_SECRET": "",
    "GEMINI_API_KEY": "",
    "SEED_ON_STARTUP": "true",
    "SEED_DEMO_HISTORY": "true",
    "ENABLE_TEST_ACCOUNTS": "true",
    "CRAWL_DELAY_SECONDS": "0",
})

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from backend.app.main import app  # noqa: E402

USER = ("user@jobpick.test", "Jobpick!2026")
SANDBOX = ("sandbox@jobpick.test", "Sandbox!2026")
ADMIN = ("root@jobpick.local", "Root!Admin2026")


@pytest.fixture(scope="session")
def client():
    with TestClient(app) as c:
        yield c


def _login(client, path, creds):
    res = client.post(path, json={"email": creds[0], "password": creds[1]})
    assert res.status_code == 200, res.text
    return {"Authorization": f"Bearer {res.json()['access_token']}"}


@pytest.fixture()
def user_headers(client):
    return _login(client, "/api/auth/login", USER)


@pytest.fixture()
def sandbox_headers(client):
    return _login(client, "/api/auth/login", SANDBOX)


@pytest.fixture()
def admin_headers(client):
    return _login(client, "/api/admin/auth/login", ADMIN)
