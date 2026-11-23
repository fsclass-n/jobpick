"""정식 관리자 계정 생성/비밀번호 재설정 (회원가입·관리자 화면으로는 정식 관리자를 만들 수 없음)

사용 예:
  python -m backend.scripts.create_admin --email ops@jobpick.kr --name 운영자
  python -m backend.scripts.create_admin --totp     # 2단계 인증용 ADMIN_TOTP_SECRET 생성
"""
import argparse
import getpass
import sys

import pyotp
from sqlalchemy import func, select

from backend.app.database import SessionLocal
from backend.app.main import init_db
from backend.app.models import Role, User
from backend.app.security import PASSWORD_RULE_MESSAGE, hash_password, is_valid_password


def main() -> int:
    parser = argparse.ArgumentParser(description="jobpick 정식 관리자 계정 관리")
    parser.add_argument("--email")
    parser.add_argument("--name", default="jobpick 운영 관리자")
    parser.add_argument("--totp", action="store_true", help="TOTP 비밀키 생성 후 종료")
    args = parser.parse_args()
    sys.stdout.reconfigure(encoding="utf-8")

    if args.totp:
        secret = pyotp.random_base32()
        print(f"ADMIN_TOTP_SECRET={secret}")
        print("인증 앱 등록 URI:", pyotp.TOTP(secret).provisioning_uri(name="admin", issuer_name="jobpick"))
        return 0
    if not args.email:
        parser.error("--email 이 필요합니다.")
    password = getpass.getpass("새 비밀번호: ")
    if not is_valid_password(password):
        print(PASSWORD_RULE_MESSAGE)
        return 1
    if password != getpass.getpass("비밀번호 확인: "):
        print("비밀번호가 일치하지 않습니다.")
        return 1
    init_db()
    with SessionLocal() as db:
        user = db.scalar(select(User).where(func.lower(User.email) == args.email.lower()))
        if user and user.role != Role.ADMIN:
            print("이미 일반/테스트 계정으로 사용 중인 이메일입니다. 다른 이메일을 사용하세요.")
            return 1
        if not user:
            user = User(email=args.email.lower(), name=args.name, role=Role.ADMIN)
            db.add(user)
        user.password_hash = hash_password(password)
        user.failed_attempts, user.locked_until, user.is_active = 0, None, True
        db.commit()
    print(f"정식 관리자 계정이 준비되었습니다: {args.email}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
