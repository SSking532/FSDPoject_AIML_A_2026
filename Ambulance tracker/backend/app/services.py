"""Shared domain helpers used by several routers."""
import re

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from . import models as m

# Trip status -> ambulance status / human-readable label
AMBULANCE_STATUS_FOR_TRIP = {
    "ACCEPTED": "ASSIGNED",
    "EN_ROUTE": "EN_ROUTE",
    "ARRIVED": "ON_TRIP",
    "IN_TRANSIT": "ON_TRIP",
    "COMPLETED": "AVAILABLE",
}
ACTIVE_REQUEST_STATUSES = ("PENDING", "ASSIGNED", "ACCEPTED", "EN_ROUTE", "ARRIVED", "IN_TRANSIT")
TRIP_LABELS = {
    "ACCEPTED": "accepted",
    "EN_ROUTE": "en route to pickup",
    "ARRIVED": "arrived at pickup",
    "IN_TRANSIT": "transporting patient to hospital",
    "COMPLETED": "completed",
}

_PK = {
    m.User: ("user_id", "USR-", 1000),
    m.Ambulance: ("ambulance_id", "AMB-", 100),
    m.Driver: ("driver_id", "DRV-", 100),
    m.Hospital: ("hospital_id", "HSP-", 0),
    m.EmergencyRequest: ("request_id", "REQ-", 2000),
    m.Assignment: ("assignment_id", "ASN-", 300),
    m.Trip: ("trip_id", "TRP-", 900),
}


def next_id(db: Session, model) -> str:
    """Generate the next human-friendly id (REQ-2045, AMB-106, ...)."""
    col_name, prefix, floor = _PK[model]
    col = getattr(model, col_name)
    highest = floor
    for (value,) in db.execute(select(col).where(col.like(f"{prefix}%"))):
        match = re.search(r"(\d+)$", value)
        if match:
            highest = max(highest, int(match.group(1)))
    width = 2 if model is m.Hospital else 0
    return f"{prefix}{str(highest + 1).zfill(width)}"


def log_activity(db: Session, message: str, kind: str = "info") -> None:
    db.add(m.ActivityLog(message=message[:255], type=kind))


def get_or_404(db: Session, model, pk: str, label: str):
    obj = db.get(model, pk)
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"{label} {pk} was not found.")
    return obj


def driver_user_id(db: Session, driver_id: str | None) -> str | None:
    if not driver_id:
        return None
    drv = db.get(m.Driver, driver_id)
    return drv.user_id if drv else None


def active_assignment_for_request(db: Session, request_id: str) -> m.Assignment | None:
    return db.scalars(
        select(m.Assignment)
        .where(
            m.Assignment.request_id == request_id,
            m.Assignment.assignment_status.in_(("PENDING_ACCEPTANCE", "ACCEPTED")),
        )
        .order_by(m.Assignment.assigned_at.desc())
    ).first()


def can_view_request(db: Session, user: m.User, req: m.EmergencyRequest) -> bool:
    """RBAC (Section 8.2): patients see their own, drivers see assigned, admins all."""
    if user.role == "admin":
        return True
    if user.role == "patient":
        return req.user_id == user.user_id
    if user.role == "driver" and user.driver:
        return (
            db.scalars(
                select(m.Assignment.assignment_id).where(
                    m.Assignment.request_id == req.request_id,
                    m.Assignment.driver_id == user.driver.driver_id,
                )
            ).first()
            is not None
        )
    return False


def request_channels(db: Session, req: m.EmergencyRequest) -> list[str]:
    channels = ["admin", f"user:{req.user_id}", f"request:{req.request_id}"]
    asn = active_assignment_for_request(db, req.request_id)
    if asn and asn.driver_id:
        channels.append(f"driver:{asn.driver_id}")
    return channels
