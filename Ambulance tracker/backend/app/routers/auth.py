from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .. import models as m
from ..database import get_db
from ..deps import get_current_user
from ..config import settings
from ..geo import TYPE_COMPATIBILITY
from ..schemas import ForgotIn, LoginIn, ProfileUpdateIn, RegisterIn
from ..security import create_access_token, hash_password, verify_password
from ..serializers import user_out
from ..services import log_activity, next_id

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


def _token_response(user: m.User) -> dict:
    return {
        "access_token": create_access_token(user.user_id, user.role),
        "token_type": "bearer",
        "user": user_out(user),
    }


@router.post("/register", status_code=201)
def register(body: RegisterIn, db: Session = Depends(get_db)):
    """Self-registration for all three roles.

    * patient    - ready to use immediately
    * driver     - needs a licence number; can register their ambulance in the same
                   step. Starts *pending approval* until a dispatcher verifies them.
    * admin      - (dispatcher) needs the organisation's dispatcher access code.
    """
    role = (body.role or "patient").strip().lower()
    if role not in m.ROLES:
        raise HTTPException(422, "Choose patient, driver or dispatcher.")

    exists = db.scalar(select(m.User).where(func.lower(m.User.email) == body.email))
    if exists:
        raise HTTPException(status.HTTP_409_CONFLICT, "An account with this email already exists.")

    if role == "admin" and (body.admin_code or "").strip() != settings.ADMIN_SIGNUP_CODE:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "That dispatcher access code is not valid.")

    license_no = vehicle_no = None
    if role == "driver":
        license_no = (body.license_number or "").strip().upper()
        if len(license_no) < 5:
            raise HTTPException(422, "Enter your driving licence number.")
        if db.scalar(select(m.Driver).where(m.Driver.license_number == license_no)):
            raise HTTPException(status.HTTP_409_CONFLICT, "A driver with this licence number already exists.")
        vehicle_no = (body.vehicle_number or "").strip().upper() or None
        if vehicle_no:
            if body.ambulance_type not in TYPE_COMPATIBILITY:
                raise HTTPException(422, "Choose the ambulance type (BLS, ALS or CCU).")
            if db.scalar(select(m.Ambulance).where(func.upper(m.Ambulance.vehicle_number) == vehicle_no)):
                raise HTTPException(status.HTTP_409_CONFLICT, f"Vehicle {vehicle_no} is already registered.")

    user = m.User(
        user_id=next_id(db, m.User),
        name=body.name.strip(),
        email=body.email,
        phone=body.phone.strip(),
        password_hash=hash_password(body.password),
        role=role,
        department=(body.department or "Emergency Dispatch").strip() if role == "admin" else None,
    )
    db.add(user)
    db.flush()

    if role == "driver":
        ambulance_id = None
        if vehicle_no:
            amb = m.Ambulance(
                ambulance_id=next_id(db, m.Ambulance),
                vehicle_number=vehicle_no,
                ambulance_type=body.ambulance_type,
                status="AVAILABLE",
                latitude=body.lat if body.lat is not None else 28.6139,
                longitude=body.lng if body.lng is not None else 77.2090,
                current_location="Registered by driver",
            )
            db.add(amb)
            db.flush()
            ambulance_id = amb.ambulance_id
        db.add(
            m.Driver(
                driver_id=next_id(db, m.Driver),
                user_id=user.user_id,
                ambulance_id=ambulance_id,
                license_number=license_no,
                availability="OFF_DUTY",
                verification_status="PENDING_APPROVAL" if settings.DRIVER_REQUIRES_APPROVAL else "VERIFIED",
                gps_sharing=False,
            )
        )
        log_activity(
            db,
            f"New driver sign-up: {user.name}"
            + (f" with {vehicle_no}" if vehicle_no else "")
            + (" (awaiting approval)" if settings.DRIVER_REQUIRES_APPROVAL else ""),
            "warning",
        )
    else:
        label = "dispatcher" if role == "admin" else "patient"
        log_activity(db, f"New {label} account registered: {user.name}")

    db.commit()
    db.refresh(user)
    return _token_response(user)


@router.post("/login")
def login(body: LoginIn, db: Session = Depends(get_db)):
    user = db.scalar(select(m.User).where(func.lower(m.User.email) == body.email.strip().lower()))
    if user is None or not verify_password(body.password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Incorrect email or password.")
    return _token_response(user)


@router.get("/me")
def me(user: m.User = Depends(get_current_user)):
    return user_out(user)


@router.patch("/me")
def update_me(
    body: ProfileUpdateIn,
    user: m.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    for field, value in body.model_dump(exclude_unset=True).items():
        if value is not None:
            setattr(user, field, value.strip() if isinstance(value, str) else value)
    db.commit()
    db.refresh(user)
    return user_out(user)


@router.post("/forgot-password")
def forgot_password(body: ForgotIn):
    # The prototype has no email gateway; respond identically whether or not the
    # account exists so the endpoint cannot be used to discover accounts.
    return {
        "ok": True,
        "message": f"If an account exists for {body.email}, recovery instructions have been sent.",
    }