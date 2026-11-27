from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import models as m
from ..database import get_db
from ..deps import get_current_user, get_events, require_roles
from ..geo import DEFAULT_TYPE_FOR_EMERGENCY
from ..realtime import EventBus
from ..schemas import RequestCreateIn, StatusIn
from ..serializers import request_out
from ..services import (
    ACTIVE_REQUEST_STATUSES,
    active_assignment_for_request,
    can_view_request,
    get_or_404,
    log_activity,
    next_id,
    request_channels,
)

router = APIRouter(prefix="/api/requests", tags=["Emergency Requests"])


@router.post("", status_code=201)
def create_request(
    body: RequestCreateIn,
    user: m.User = Depends(require_roles("patient", "admin")),
    db: Session = Depends(get_db),
    events: EventBus = Depends(get_events),
):
    lat = body.lat if body.lat is not None else body.pickup_latitude
    lng = body.lng if body.lng is not None else body.pickup_longitude
    if lat is None or lng is None:
        raise HTTPException(422, "Pickup coordinates are required. Allow location access or enter them manually.")

    emergency_type = (body.emergency_type or body.category or "General").strip()
    if emergency_type not in m.EMERGENCY_TYPES:
        raise HTTPException(422, f"Unknown emergency type '{emergency_type}'.")
    required = body.ambulance_type_required or DEFAULT_TYPE_FOR_EMERGENCY[emergency_type]
    if required not in m.AMBULANCE_TYPES:
        raise HTTPException(422, f"Unknown ambulance type '{required}'.")

    if user.role == "patient":
        open_req = db.scalar(
            select(m.EmergencyRequest).where(
                m.EmergencyRequest.user_id == user.user_id,
                m.EmergencyRequest.status.in_(ACTIVE_REQUEST_STATUSES),
            )
        )
        if open_req:
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                f"You already have an active request ({open_req.request_id}). Track or cancel it first.",
            )

    req = m.EmergencyRequest(
        request_id=next_id(db, m.EmergencyRequest),
        user_id=user.user_id,
        patient_name=(body.patient_name or user.name).strip(),
        contact_number=(body.contact_number or user.phone).strip(),
        pickup_address=body.pickup_address.strip(),
        pickup_latitude=lat,
        pickup_longitude=lng,
        emergency_type=emergency_type,
        ambulance_type_required=required,
        details=(body.details or "").strip(),
        status="PENDING",
    )
    db.add(req)
    log_activity(
        db,
        f"New {emergency_type} request {req.request_id} from {req.patient_name} at {req.pickup_address}",
        "emergency",
    )
    db.commit()
    out = request_out(req)
    events.emit(
        ["admin", f"user:{user.user_id}"],
        "request:created",
        out,
        {
            "title": f"New {emergency_type} request ({req.request_id})",
            "message": f"{req.patient_name} needs an ambulance at {req.pickup_address}.",
            "type": "emergency",
            "roles": ["admin"],
            "link": "/admin/requests",
        },
    )
    return out


@router.get("")
def list_requests(
    status_filter: str | None = None,
    user: m.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = select(m.EmergencyRequest).order_by(m.EmergencyRequest.created_at.desc())
    if user.role == "patient":
        q = q.where(m.EmergencyRequest.user_id == user.user_id)
    elif user.role == "driver":
        driver_id = user.driver.driver_id if user.driver else "-"
        q = q.where(
            m.EmergencyRequest.request_id.in_(
                select(m.Assignment.request_id).where(m.Assignment.driver_id == driver_id)
            )
        )
    if status_filter:
        q = q.where(m.EmergencyRequest.status == status_filter)
    return [request_out(r) for r in db.scalars(q)]


@router.get("/{request_id}")
def get_request(request_id: str, user: m.User = Depends(get_current_user), db: Session = Depends(get_db)):
    req = get_or_404(db, m.EmergencyRequest, request_id, "Request")
    if not can_view_request(db, user, req):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "You cannot view this request.")
    return request_out(req)


@router.patch("/{request_id}/status")
def update_request_status(
    request_id: str,
    body: StatusIn,
    _: m.User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
    events: EventBus = Depends(get_events),
):
    """Administrative override, e.g. marking NO_AMBULANCE_AVAILABLE.
    Normal progress is driven by trip status updates."""
    req = get_or_404(db, m.EmergencyRequest, request_id, "Request")
    if body.status not in ("PENDING", "NO_AMBULANCE_AVAILABLE"):
        raise HTTPException(
            422, "Only PENDING or NO_AMBULANCE_AVAILABLE can be set directly; use assignments and trips for the rest."
        )
    if req.status not in ("PENDING", "NO_AMBULANCE_AVAILABLE"):
        raise HTTPException(409, f"Request is already {req.status}.")
    req.status = body.status
    req.updated_at = m.utcnow()
    log_activity(db, f"Request {request_id} marked {body.status}", "warning")
    db.commit()
    out = request_out(req)
    events.emit(request_channels(db, req), "request:updated", out)
    return out


def _cancel(request_id: str, user: m.User, db: Session, events: EventBus):
    req = get_or_404(db, m.EmergencyRequest, request_id, "Request")
    if user.role == "patient" and req.user_id != user.user_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "You can only cancel your own requests.")
    if user.role == "driver":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Drivers cannot cancel requests.")
    if req.status not in ("PENDING", "ASSIGNED", "ACCEPTED", "NO_AMBULANCE_AVAILABLE"):
        raise HTTPException(409, f"A request that is {req.status.replace('_', ' ').lower()} can no longer be cancelled.")

    channels = request_channels(db, req)
    asn = active_assignment_for_request(db, request_id)
    if asn:
        asn.assignment_status = "CANCELLED"
        amb = db.get(m.Ambulance, asn.ambulance_id)
        if amb:
            amb.status = "AVAILABLE"
            amb.updated_at = m.utcnow()
        trip = db.scalar(select(m.Trip).where(m.Trip.assignment_id == asn.assignment_id))
        if trip:
            db.delete(trip)
    req.status = "CANCELLED"
    req.updated_at = m.utcnow()
    log_activity(db, f"Request {request_id} was cancelled by {user.name}", "warning")
    db.commit()
    out = request_out(req)
    events.emit(
        channels,
        "request:cancelled",
        out,
        {
            "title": "Assignment cancelled",
            "message": f"Request {request_id} was cancelled.",
            "type": "warning",
            "roles": ["admin", "driver"],
            "link": "/admin/requests",
        },
    )
    return out


@router.post("/{request_id}/cancel")
def cancel_request(
    request_id: str,
    user: m.User = Depends(get_current_user),
    db: Session = Depends(get_db),
    events: EventBus = Depends(get_events),
):
    return _cancel(request_id, user, db, events)


@router.patch("/{request_id}/cancel", include_in_schema=False)
def cancel_request_patch(
    request_id: str,
    user: m.User = Depends(get_current_user),
    db: Session = Depends(get_db),
    events: EventBus = Depends(get_events),
):
    return _cancel(request_id, user, db, events)
