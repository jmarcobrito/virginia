from fastapi import Depends, Header, HTTPException, Query, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.config import settings
from app.database import supabase

bearer_scheme = HTTPBearer(auto_error=False)


def _user_from_credentials(creds: HTTPAuthorizationCredentials | None):
    if not creds or not creds.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Nao autenticado",
        )

    try:
        result = supabase.auth.get_user(creds.credentials)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token invalido ou expirado",
        )

    if not result.user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Nao autenticado",
        )

    return result.user


def require_user(
    creds: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
):
    return _user_from_credentials(creds)


def user_role(user) -> str:
    app_meta = getattr(user, "app_metadata", None) or {}
    return app_meta.get("role") or app_meta.get("user_role") or "usuario"


def require_admin(user=Depends(require_user)):
    if user_role(user) != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso negado",
        )
    return user


def require_webhook_secret(
    x_virginia_webhook_secret: str | None = Header(default=None),
    webhook_secret: str | None = Query(default=None),
):
    expected = settings.virginia_webhook_secret
    if not expected:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Webhook secret nao configurado",
        )
    if expected not in (x_virginia_webhook_secret, webhook_secret):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Webhook nao autorizado",
        )


def require_user_or_webhook(
    creds: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    x_virginia_webhook_secret: str | None = Header(default=None),
    webhook_secret: str | None = Query(default=None),
):
    expected = settings.virginia_webhook_secret
    if expected and expected in (x_virginia_webhook_secret, webhook_secret):
        return {"type": "webhook"}
    return _user_from_credentials(creds)
