"""Allocation, assignments, trips and GPS location (Sections 3.4 - 3.6, 6.4, 6.5)."""
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import models as m
from ..config import settings
from ..database import get_db
from ..deps import current_driver, get_current_user, get_events, require_roles
from ..geo import rank_candidates
from ..realtime import EventBus
from ..schemas import AssignmentCreateIn, LocationIn, RecommendIn, StatusIn
from ..serializers import (
    ambulance_out,
    assignment_out,
    driver_out,
    hospital_out,
    iso,
    request_out,
    trip_out,
)
from ..services import (
    AMBULANCE_STATUS_FOR_TRIP,
    TRIP_LABELS,
    can_view_request,
    driver_user_id,
    get_or_404,
    log_activity,
    next_id,
    request_channels,
)

router = APIRouter(tags=["Dispatch"])


# --------------------------------------------------------------- allocation
@router.post("/api/assignments/recommend")
def recommend(body: RecommendIn, _: m.User = Depends(require_roles("admin")), db: Session = Depends(get_db)):
    req = get_or_404(db, m.EmergencyRequest, body.request_id, "Request")
    rows = db.execute(
        select(m.Ambulance, m.Driver).outerjoin(m.Driver, m.Driver.ambulance_id == m.Ambulance.ambulance_id)
    ).all()
    ranked = rank_candidates(req.pickup_latitude, req.pickup_longitude, req.ambulance_type_required, rows)
    recommendation = next((c for c in ranked if c["eligible"]), None)
    return {
        "requestId": req.request_id,
        "ambulanceTypeRequired": req.ambulance_type_required,
        "recommendedAmbulanceId": recommendation["ambulance"].ambulance_id if recommendation else None,
        "candidates": [
            {
                "ambulance": ambulance_out(c["ambulance"]),
                "driver": driver_out(c["driver"]) if c["driver"] else None,
                "distanceKm": c["distance_km"],
                "etaMinutes": c["eta_minutes"],
                "eligible": c["eligible"],
                "typeMatch": c["type_match"],
                "reasons": c["reasons"],
            }
            for c in ranked
        ],
    }


@router.post("/api/assignments", status_code=201)
def confirm_assignment(
    body: AssignmentCreateIn,
    admin: m.User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
    events: EventBus = Depends(get_events),
):
    # Row locks (PostgreSQL) stop two dispatchers assigning the same unit at once.
    req = db.scalar(
        select(m.EmergencyRequest).where(m.EmergencyRequest.request_id == body.request_id).with_for_update()
    )
    if req is None:
        raise HTTPException(404, f"Request {body.request_id} was not found.")
    if req.status not in ("PENDING", "NO_AMBULANCE_AVAILABLE"):
        raise HTTPException(409, f"Request {req.request_id} is already {req.status.replace('_', ' ').lower()}.")
    amb = db.scalar(
        select(m.Ambulance).where(m.Ambulance.ambulance_id == body.ambulance_id).with_for_update()
    )
    if amb is None:
        raise HTTPException(404, f"Ambulance {body.ambulance_id} was not found.")
    if amb.status != "AVAILABLE":
        raise HTTPException(409, f"{amb.vehicle_number} is not available (currently {amb.status.replace('_', ' ').lower()}).")
    busy = db.scalar(
        select(m.Assignment).where(
            m.Assignment.ambulance_id == amb.ambulance_id,
            m.Assignment.assignment_status.in_(("PENDING_ACCEPTANCE", "ACCEPTED")),
        )
    )
    if busy:
        raise HTTPException(409, f"{amb.vehicle_number} already has an active assignment ({busy.assignment_id}).")
    drv = amb.driver
    if drv is None:
        raise HTTPException(409, f"{amb.vehicle_number} has no driver linked.")
    if drv.verification_status != "VERIFIED":
        raise HTTPException(409, f"Driver {drv.user.name} has not been approved yet.")
    if drv.availability != "ONLINE":
        raise HTTPException(409, f"Driver {drv.user.name} is off duty.")
    hospital_id = body.hospital_id
    if hospital_id:
        get_or_404(db, m.Hospital, hospital_id, "Hospital")

    asn = m.Assignment(
        assignment_id=next_id(db, m.Assignment),
        request_id=req.request_id,
        ambulance_id=amb.ambulance_id,
        driver_id=drv.driver_id,
        hospital_id=hospital_id,
        assignment_status="PENDING_ACCEPTANCE",
    )
    db.add(asn)
    req.status = "ASSIGNED"
    req.assigned_ambulance_id = amb.ambulance_id
    req.updated_at = m.utcnow()
    amb.status = "ASSIGNED"
    amb.updated_at = m.utcnow()
    log_activity(db, f"{admin.name} assigned {amb.vehicle_number} to {req.request_id}")
    db.commit()

    out = assignment_out(asn)
    events.emit(
        [f"driver:{drv.driver_id}", f"user:{drv.user_id}"],
        "assignment:created",
        out,
        {
            "title": "New emergency assignment",
            "message": f"{req.emergency_type} emergency at {req.pickup_address}. Accept to start the trip.",
            "type": "emergency",
            "roles": ["driver"],
            "link": "/driver/assignments",
        },
    )
    events.emit(
        [f"user:{req.user_id}", f"request:{req.request_id}"],
        "request:updated",
        request_out(req),
        {
            "title": "Ambulance assigned",
            "message": f"{amb.vehicle_number} has been assigned to your request. Waiting for the driver to accept.",
            "type": "info",
            "roles": ["patient"],
            "link": f"/patient/tracking/{req.request_id}",
        },
    )
    events.emit(["admin"], "assignment:created", out)
    return out


@router.get("/api/assignments")
def list_assignments(user: m.User = Depends(get_current_user), db: Session = Depends(get_db)):
    q = select(m.Assignment).order_by(m.Assignment.assigned_at.desc())
    if user.role == "driver":
        q = q.where(m.Assignment.driver_id == current_driver(user).driver_id)
    elif user.role == "patient":
        q = q.where(
            m.Assignment.request_id.in_(
                select(m.EmergencyRequest.request_id).where(m.EmergencyRequest.user_id == user.user_id)
            )
        )
    return [assignment_out(a) for a in db.scalars(q)]


@router.get("/api/assignments/{assignment_id}")
def get_assignment(assignment_id: str, user: m.User = Depends(get_current_user), db: Session = Depends(get_db)):
    asn = get_or_404(db, m.Assignment, assignment_id, "Assignment")
    req = db.get(m.EmergencyRequest, asn.request_id)
    if not can_view_request(db, user, req):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "You cannot view this assignment.")
    return assignment_out(asn)


def _respond(assignment_id: str, action: str, user: m.User, db: Session, events: EventBus):
    asn = get_or_404(db, m.Assignment, assignment_id, "Assignment")
    if user.role == "driver" and asn.driver_id != current_driver(user).driver_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "This assignment belongs to another driver.")
    if user.role == "patient":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not allowed.")
    if asn.assignment_status != "PENDING_ACCEPTANCE":
        raise HTTPException(409, f"Assignment is already {asn.assignment_status.replace('_', ' ').lower()}.")

    req = db.get(m.EmergencyRequest, asn.request_id)
    amb = db.get(m.Ambulance, asn.ambulance_id)
    now = m.utcnow()
    asn.responded_at = now
    trip = None

    if action == "ACCEPTED":
        asn.assignment_status = "ACCEPTED"
        req.status = "ACCEPTED"
        hospital = db.get(m.Hospital, asn.hospital_id) if asn.hospital_id else None
        trip = m.Trip(
            trip_id=next_id(db, m.Trip),
            request_id=req.request_id,
            assignment_id=asn.assignment_id,
            hospital_id=asn.hospital_id,
            destination=hospital.name if hospital else "Nearest receiving hospital",
            status="ACCEPTED",
            start_time=now,
        )
        trip.events.append(m.TripEvent(status="ACCEPTED", recorded_at=now))
        db.add(trip)
        log_activity(db, f"Driver accepted {req.request_id}; trip {trip.trip_id} started")
        note = {
            "title": "Driver accepted your request",
            "message": f"{amb.vehicle_number} is preparing to head to you.",
            "type": "success",
            "roles": ["patient", "admin"],
            "link": f"/patient/tracking/{req.request_id}",
        }
    else:
        asn.assignment_status = "REJECTED"
        req.status = "PENDING"
        req.assigned_ambulance_id = None
        amb.status = "AVAILABLE"
        log_activity(db, f"Assignment {asn.assignment_id} declined; {req.request_id} back in queue", "warning")
        note = {
            "title": "Assignment declined",
            "message": f"{req.request_id} needs a new ambulance.",
            "type": "warning",
            "roles": ["admin"],
            "link": "/admin/assignments",
        }
    req.updated_at = now
    amb.updated_at = now
    db.commit()

    out = assignment_out(asn)
    if trip:
        db.refresh(trip)
        out["tripId"] = trip.trip_id
    channels = ["admin", f"user:{req.user_id}", f"request:{req.request_id}", f"driver:{asn.driver_id}"]
    events.emit(channels, "assignment:updated", out, note)
    return out


@router.patch("/api/assignments/{assignment_id}/status")
def update_assignment_status(
    assignment_id: str,
    body: StatusIn,
    user: m.User = Depends(get_current_user),
    db: Session = Depends(get_db),
    events: EventBus = Depends(get_events),
):
    if body.status not in ("ACCEPTED", "REJECTED"):
        raise HTTPException(422, "Status must be ACCEPTED or REJECTED.")
    return _respond(assignment_id, body.status, user, db, events)


@router.post("/api/assignments/{assignment_id}/accept")
def accept_assignment(assignment_id: str, user: m.User = Depends(require_roles("driver", "admin")),
                      db: Session = Depends(get_db), events: EventBus = Depends(get_events)):
    return _respond(assignment_id, "ACCEPTED", user, db, events)


@router.post("/api/assignments/{assignment_id}/reject")
def reject_assignment(assignment_id: str, user: m.User = Depends(require_roles("driver", "admin")),
                      db: Session = Depends(get_db), events: EventBus = Depends(get_events)):
    return _respond(assignment_id, "REJECTED", user, db, events)


# --------------------------------------------------------------------- trips
@router.get("/api/trips")
def list_trips(user: m.User = Depends(get_current_user), db: Session = Depends(get_db)):
    q = select(m.Trip).join(m.Assignment).order_by(m.Trip.start_time.desc())
    if user.role == "driver":
        q = q.where(m.Assignment.driver_id == current_driver(user).driver_id)
    elif user.role == "patient":
        q = q.where(
            m.Trip.request_id.in_(
                select(m.EmergencyRequest.request_id).where(m.EmergencyRequest.user_id == user.user_id)
            )
        )
    return [trip_out(t, db) for t in db.scalars(q)]


@router.patch("/api/trips/{trip_id}/status")
def update_trip_status(
    trip_id: str,
    body: StatusIn,
    user: m.User = Depends(require_roles("driver", "admin")),
    db: Session = Depends(get_db),
    events: EventBus = Depends(get_events),
):
    trip = get_or_404(db, m.Trip, trip_id, "Trip")
    asn = trip.assignment
    if user.role == "driver" and asn.driver_id != current_driver(user).driver_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "This trip belongs to another driver.")

    flow = m.TRIP_STATUS_FLOW
    if body.status not in flow:
        raise HTTPException(422, f"Unknown trip status {body.status}.")
    if flow.index(body.status) != flow.index(trip.status) + 1:
        raise HTTPException(409, f"Cannot move a trip from {trip.status} to {body.status}.")

    now = m.utcnow()
    trip.status = body.status
    trip.events.append(m.TripEvent(status=body.status, recorded_at=now))
    req = db.get(m.EmergencyRequest, trip.request_id)
    req.status = body.status
    req.updated_at = now
    amb = db.get(m.Ambulance, asn.ambulance_id)
    amb.status = AMBULANCE_STATUS_FOR_TRIP[body.status]
    amb.updated_at = now
    if body.status == "COMPLETED":
        trip.end_time = now
        asn.assignment_status = "COMPLETED"
        if trip.hospital_id:
            hosp = db.get(m.Hospital, trip.hospital_id)
            if hosp:
                amb.latitude, amb.longitude = hosp.latitude, hosp.longitude
                amb.current_location = f"{hosp.name} (handover complete)"
    log_activity(
        db,
        f"Trip {trip_id} ({amb.vehicle_number}) is {TRIP_LABELS[body.status]}",
        "success" if body.status == "COMPLETED" else "info",
    )
    db.commit()
    db.refresh(trip)

    out = trip_out(trip, db)
    events.emit(
        ["admin", f"user:{req.user_id}", f"request:{req.request_id}", f"driver:{asn.driver_id}"],
        "trip:updated",
        out,
        {
            "title": f"Ambulance {TRIP_LABELS[body.status]}",
            "message": f"Request {req.request_id}: {amb.vehicle_number} is {TRIP_LABELS[body.status]}.",
            "type": "success" if body.status in ("ARRIVED", "COMPLETED") else "info",
            "roles": ["patient", "admin"],
            "link": f"/patient/tracking/{req.request_id}",
        },
    )
    return out


# ------------------------------------------------------------------ location
@router.post("/api/location/update")
def update_location(
    body: LocationIn,
    user: m.User = Depends(require_roles("driver", "admin")),
    db: Session = Depends(get_db),
    events: EventBus = Depends(get_events),
):
    amb = get_or_404(db, m.Ambulance, body.ambulance_id, "Ambulance")
    if user.role == "driver":
        drv = current_driver(user)
        if drv.ambulance_id != amb.ambulance_id:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "You can only report the location of your own ambulance.")
        if drv.availability != "ONLINE":
            raise HTTPException(409, "Go online before sharing your location.")
    now = m.utcnow()
    amb.latitude, amb.longitude = body.lat, body.lng
    if body.current_location:
        amb.current_location = body.current_location[:255]
    amb.updated_at = now
    db.add(m.LocationLog(ambulance_id=amb.ambulance_id, latitude=body.lat, longitude=body.lng, recorded_at=now))
    db.commit()

    payload = {
        "ambulanceId": amb.ambulance_id,
        "lat": body.lat,
        "lng": body.lng,
        "currentLocation": amb.current_location,
        "updatedAt": iso(now),
    }
    channels = ["admin", f"ambulance:{amb.ambulance_id}"]
    active_req = db.scalar(
        select(m.EmergencyRequest).where(
            m.EmergencyRequest.assigned_ambulance_id == amb.ambulance_id,
            m.EmergencyRequest.status.in_(("ASSIGNED", "ACCEPTED", "EN_ROUTE", "ARRIVED", "IN_TRANSIT")),
        )
    )
    if active_req:
        channels += [f"user:{active_req.user_id}", f"request:{active_req.request_id}"]
    events.emit(channels, "location:update", payload)
    return payload


def _location_payload(amb: m.Ambulance) -> dict:
    stale_after = timedelta(seconds=settings.LOCATION_STALE_SECONDS)
    updated = amb.updated_at
    if updated is not None and updated.tzinfo is None:
        from datetime import timezone

        updated = updated.replace(tzinfo=timezone.utc)
    age = (m.utcnow() - updated).total_seconds() if updated else None
    return {
        "ambulanceId": amb.ambulance_id,
        "lat": amb.latitude,
        "lng": amb.longitude,
        "currentLocation": amb.current_location,
        "updatedAt": iso(amb.updated_at),
        "ageSeconds": round(age) if age is not None else None,
        "isStale": age is None or age > stale_after.total_seconds(),
    }


@router.get("/api/location/{ambulance_id}")
def latest_location(ambulance_id: str, user: m.User = Depends(get_current_user), db: Session = Depends(get_db)):
    amb = get_or_404(db, m.Ambulance, ambulance_id, "Ambulance")
    if user.role == "patient":
        allowed = db.scalar(
            select(m.EmergencyRequest).where(
                m.EmergencyRequest.user_id == user.user_id,
                m.EmergencyRequest.assigned_ambulance_id == ambulance_id,
            )
        )
        if not allowed:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Location is only shared for your active request.")
    if user.role == "driver" and current_driver(user).ambulance_id != ambulance_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not your ambulance.")
    return _location_payload(amb)


@router.get("/api/location/{ambulance_id}/history")
def location_history(ambulance_id: str, limit: int = 200, _: m.User = Depends(require_roles("admin")),
                     db: Session = Depends(get_db)):
    rows = db.scalars(
        select(m.LocationLog)
        .where(m.LocationLog.ambulance_id == ambulance_id)
        .order_by(m.LocationLog.recorded_at.desc())
        .limit(min(limit, 1000))
    )
    return [{"lat": r.latitude, "lng": r.longitude, "recordedAt": iso(r.recorded_at)} for r in rows]


@router.get("/api/tracking/{request_id}")
def tracking_snapshot(request_id: str, user: m.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Everything a patient's tracking screen needs in one call."""
    req = get_or_404(db, m.EmergencyRequest, request_id, "Request")
    if not can_view_request(db, user, req):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "You cannot track this request.")
    asn = db.scalars(
        select(m.Assignment).where(m.Assignment.request_id == request_id).order_by(m.Assignment.assigned_at.desc())
    ).first()
    amb = db.get(m.Ambulance, req.assigned_ambulance_id) if req.assigned_ambulance_id else None
    trip = db.scalar(select(m.Trip).where(m.Trip.request_id == request_id))
    hosp = db.get(m.Hospital, asn.hospital_id) if asn and asn.hospital_id else None
    drv = db.get(m.Driver, asn.driver_id) if asn and asn.driver_id else None
    return {
        "request": request_out(req),
        "assignment": assignment_out(asn) if asn else None,
        "ambulance": ambulance_out(amb) if amb else None,
        "location": _location_payload(amb) if amb else None,
        "driver": {"name": drv.user.name, "phone": drv.user.phone} if drv else None,
        "hospital": hospital_out(hosp) if hosp else None,
        "trip": trip_out(trip, db) if trip else None,
    }