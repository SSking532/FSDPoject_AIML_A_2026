from fastapi import BackgroundTasks, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from . import models as m
from .database import get_db
from .realtime import EventBus
from .security import decode_access_token

bearer = HTTPBearer(auto_error=False)


def user_from_token(db: Session, token: str | None) -> m.User | None:
    if not token:
        return None
    try:
        payload = decode_access_token(token)
    except Exception:  # noqa: BLE001 - any decode failure means unauthenticated
        return None
    return db.get(m.User, payload.get("sub"))


def get_current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: Session = Depends(get_db),
) -> m.User:
    user = user_from_token(db, creds.credentials if creds else None)
    if user is None:
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            "Your session has expired. Please sign in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


def require_roles(*roles: str):
    def checker(user: m.User = Depends(get_current_user)) -> m.User:
        if user.role not in roles:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "You do not have access to this resource.")
        return user

    return checker


def get_events(background: BackgroundTasks) -> EventBus:
    return EventBus(background)


def current_driver(user: m.User) -> m.Driver:
    if user.role != "driver" or user.driver is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Driver profile not found for this account.")
    return user.driver
