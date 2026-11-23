"""소셜 로그인 (Google / Naver / Kakao, OAuth 2.0 Authorization Code)"""
import secrets
from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode

import httpx
import jwt
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import RedirectResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import settings
from ..database import get_db
from ..models import Role, User, utcnow
from ..services.auth_service import find_user, issue_token

router = APIRouter(prefix="/api/auth/oauth", tags=["oauth"])

PROVIDERS = {
    "google": {
        "authorize": "https://accounts.google.com/o/oauth2/v2/auth",
        "token": "https://oauth2.googleapis.com/token",
        "profile": "https://openidconnect.googleapis.com/v1/userinfo",
        "scope": "openid email profile",
    },
    "naver": {
        "authorize": "https://nid.naver.com/oauth2.0/authorize",
        "token": "https://nid.naver.com/oauth2.0/token",
        "profile": "https://openapi.naver.com/v1/nid/me",
        "scope": "",
    },
    "kakao": {
        "authorize": "https://kauth.kakao.com/oauth/authorize",
        "token": "https://kauth.kakao.com/oauth/token",
        "profile": "https://kapi.kakao.com/v2/user/me",
        "scope": "profile_nickname account_email",
    },
}
STATE_AUD = "jobpick:oauth-state"
NONCE_COOKIE = "jp_oauth_nonce"


def _credentials(provider: str) -> tuple[str, str]:
    return getattr(settings, f"{provider}_client_id"), getattr(settings, f"{provider}_client_secret")


def _redirect_uri(provider: str) -> str:
    return f"{settings.backend_url}/api/auth/oauth/{provider}/callback"


def _front(path: str, **params) -> RedirectResponse:
    return RedirectResponse(f"{settings.frontend_url}{path}#{urlencode(params)}", status_code=status.HTTP_302_FOUND)


def _extract_profile(provider: str, data: dict) -> tuple[str, str | None, str]:
    if provider == "google":
        return data["sub"], data.get("email"), data.get("name") or "Google 사용자"
    if provider == "naver":
        info = data.get("response", {})
        return info["id"], info.get("email"), info.get("name") or info.get("nickname") or "네이버 사용자"
    account = data.get("kakao_account", {})
    return str(data["id"]), account.get("email"), account.get("profile", {}).get("nickname") or "카카오 사용자"


@router.get("/providers")
def providers():
    return {name: bool(all(_credentials(name))) for name in PROVIDERS}


@router.get("/{provider}/login")
def oauth_login(provider: str):
    if provider not in PROVIDERS:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "지원하지 않는 로그인 방식입니다.")
    client_id, client_secret = _credentials(provider)
    if not client_id or not client_secret:
        return _front("/login", error=f"{provider} 로그인이 아직 설정되지 않았습니다.")
    nonce = secrets.token_urlsafe(16)
    state = jwt.encode({"aud": STATE_AUD, "provider": provider, "nonce": nonce,
                        "exp": datetime.now(timezone.utc) + timedelta(minutes=10)},
                       settings.user_jwt_secret, algorithm="HS256")
    params = {"response_type": "code", "client_id": client_id, "redirect_uri": _redirect_uri(provider), "state": state}
    if PROVIDERS[provider]["scope"]:
        params["scope"] = PROVIDERS[provider]["scope"]
    response = RedirectResponse(f"{PROVIDERS[provider]['authorize']}?{urlencode(params)}")
    response.set_cookie(NONCE_COOKIE, nonce, max_age=600, httponly=True, samesite="lax",
                        secure=settings.backend_url.startswith("https"))
    return response


@router.get("/{provider}/callback")
def oauth_callback(provider: str, request: Request, code: str = "", state: str = "", error: str = "",
                   db: Session = Depends(get_db)):
    if provider not in PROVIDERS or error or not code:
        return _front("/login", error="소셜 로그인이 취소되었거나 실패했습니다.")
    try:
        claims = jwt.decode(state, settings.user_jwt_secret, algorithms=["HS256"], audience=STATE_AUD)
    except jwt.PyJWTError:
        return _front("/login", error="로그인 요청이 만료되었습니다. 다시 시도해 주세요.")
    if claims.get("provider") != provider or claims.get("nonce") != request.cookies.get(NONCE_COOKIE):
        return _front("/login", error="잘못된 로그인 요청입니다.")

    client_id, client_secret = _credentials(provider)
    conf = PROVIDERS[provider]
    try:
        with httpx.Client(timeout=10) as client:
            token_res = client.post(conf["token"], data={
                "grant_type": "authorization_code", "code": code, "client_id": client_id,
                "client_secret": client_secret, "redirect_uri": _redirect_uri(provider), "state": state,
            }, headers={"Accept": "application/json"})
            token_res.raise_for_status()
            access_token = token_res.json()["access_token"]
            profile_res = client.get(conf["profile"], headers={"Authorization": f"Bearer {access_token}"})
            profile_res.raise_for_status()
            provider_id, email, name = _extract_profile(provider, profile_res.json())
    except (httpx.HTTPError, KeyError, ValueError):
        return _front("/login", error="소셜 계정 정보를 가져오지 못했습니다.")

    user = db.scalar(select(User).where(User.provider == provider, User.provider_id == provider_id))
    if not user and email:
        user = find_user(db, email)
        if user and user.role == Role.ADMIN:
            return _front("/login", error="해당 계정은 소셜 로그인을 사용할 수 없습니다.")
    if not user:
        user = User(email=(email or f"{provider}_{provider_id}@social.jobpick").lower(), name=name, role=Role.USER,
                    provider=provider, provider_id=provider_id)
        db.add(user)
    elif user.role == Role.ADMIN or not user.is_active:
        return _front("/login", error="해당 계정은 소셜 로그인을 사용할 수 없습니다.")
    user.last_login_at = utcnow()
    db.commit()
    issued = issue_token(user)
    response = _front("/oauth/callback", token=issued["access_token"], session=issued["session"])
    response.delete_cookie(NONCE_COOKIE)
    return response
