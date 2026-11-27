"""Ambulances, drivers and hospitals (Sections 3.3, 6.3)."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .. import models as m
from ..config import settings
from ..database import get_db
from ..deps import current_driver, get_current_user, get_events, require_roles
from ..realtime import EventBus
from ..schemas import AmbulanceIn, AvailabilityIn, DriverIn, GpsIn, HospitalIn
from ..security import hash_password
from ..serializers import ambulance_out, driver_out, hospital_out
from ..services import get_or_404, log_activity, next_id

router = APIRouter(tags=["Fleet"])


# ---------------------------------------------------------------- ambulances
def _visible_ambulances(db: Session, user: m.User):
    q = select(m.Ambulance).order_by(m.Ambulance.ambulance_id)
    if user.role == "admin":
        return db.scalars(q).all()
    if user.role == "driver":
        amb_id = user.driver.ambulance_id if user.driver else None
        return db.scalars(q.where(m.Ambulance.ambulance_id == amb_id)).all() if amb_id else []
    # Location privacy (8.4): a patient only sees the unit assigned to one of their requests.
    assigned = select(m.EmergencyRequest.assigned_ambulance_id).where(
        m.EmergencyRequest.user_id == user.user_id,
        m.EmergencyRequest.assigned_ambulance_id.is_not(None),
    )
    return db.scalars(q.where(m.Ambulance.ambulance_id.in_(assigned))).all()


@router.get("/api/ambulances")
def list_ambulances(user: m.User = Depends(get_current_user), db: Session = Depends(get_db)):
    return [ambulance_out(a) for a in _visible_ambulances(db, user)]


@router.get("/api/ambulances/available")
def list_available(_: m.User = Depends(require_roles("admin")), db: Session = Depends(get_db)):
    q = (
        select(m.Ambulance)
        .join(m.Driver, m.Driver.ambulance_id == m.Ambulance.ambulance_id)
        .where(m.Ambulance.status == "AVAILABLE", m.Driver.availability == "ONLINE")
    )
    return [ambulance_out(a) for a in db.scalars(q)]


def _link_driver(db: Session, amb: m.Ambulance, driver_id: str | None):
    current = amb.driver
    if current and current.driver_id != driver_id:
        current.ambulance_id = None
        db.flush()
    if driver_id:
        drv = get_or_404(db, m.Driver, driver_id, "Driver")
        drv.ambulance_id = amb.ambulance_id
    db.flush()
    db.refresh(amb)


@router.post("/api/ambulances", status_code=201)
def create_ambulance(
    body: AmbulanceIn,
    _: m.User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
    events: EventBus = Depends(get_events),
):
    number = (body.registration_number or body.vehicle_number or "").strip().upper()
    a_type = body.category or body.ambulance_type
    if not number:
        raise HTTPException(422, "Vehicle registration number is required.")
    if a_type not in m.AMBULANCE_TYPES:
        raise HTTPException(422, f"Ambulance type must be one of: {', '.join(m.AMBULANCE_TYPES)}")
    if db.scalar(select(m.Ambulance).where(func.upper(m.Ambulance.vehicle_number) == number)):
        raise HTTPException(409, f"Vehicle {number} is already registered.")
    status_value = body.status or "AVAILABLE"
    if status_value not in m.AMBULANCE_STATUSES:
        raise HTTPException(422, "Invalid ambulance status.")
    amb = m.Ambulance(
        ambulance_id=next_id(db, m.Ambulance),
        vehicle_number=number,
        ambulance_type=a_type,
        status=status_value,
        latitude=body.lat if body.lat is not None else 28.6139,
        longitude=body.lng if body.lng is not None else 77.2090,
        current_location=body.current_location or "Central Fleet Hub",
    )
    db.add(amb)
    db.flush()
    if body.driver_id:
        _link_driver(db, amb, body.driver_id)
    log_activity(db, f"Registered ambulance {number}")
    db.commit()
    db.refresh(amb)
    out = ambulance_out(amb)
    events.emit(["admin"], "ambulance:updated", out)
    return out


def _update_ambulance(ambulance_id, body: AmbulanceIn, db: Session, events: EventBus):
    amb = get_or_404(db, m.Ambulance, ambulance_id, "Ambulance")
    data = body.model_dump(exclude_unset=True)
    number = data.get("registration_number") or data.get("vehicle_number")
    if number:
        number = number.strip().upper()
        clash = db.scalar(
            select(m.Ambulance).where(
                func.upper(m.Ambulance.vehicle_number) == number,
                m.Ambulance.ambulance_id != ambulance_id,
            )
        )
        if clash:
            raise HTTPException(409, f"Vehicle {number} is already registered.")
        amb.vehicle_number = number
    a_type = data.get("category") or data.get("ambulance_type")
    if a_type:
        if a_type not in m.AMBULANCE_TYPES:
            raise HTTPException(422, "Invalid ambulance type.")
        amb.ambulance_type = a_type
    if "status" in data and data["status"]:
        new_status = data["status"]
        if new_status not in m.AMBULANCE_STATUSES:
            raise HTTPException(422, "Invalid ambulance status.")
        busy = amb.status in ("ASSIGNED", "EN_ROUTE", "ON_TRIP")
        if busy and new_status in ("AVAILABLE", "OUT_OF_SERVICE") and new_status != amb.status:
            raise HTTPException(409, "This unit is on an active assignment. Complete or cancel it first.")
        if new_status in ("ASSIGNED", "EN_ROUTE", "ON_TRIP") and not busy:
            raise HTTPException(422, "Assignment statuses are set automatically by dispatch.")
        amb.status = new_status
    if "current_location" in data and data["current_location"]:
        amb.current_location = data["current_location"]
    if data.get("lat") is not None and data.get("lng") is not None:
        amb.latitude, amb.longitude = data["lat"], data["lng"]
    if "driver_id" in data:
        _link_driver(db, amb, data["driver_id"] or None)
    amb.updated_at = m.utcnow()
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "That driver is already linked to another ambulance.")
    db.refresh(amb)
    out = ambulance_out(amb)
    events.emit(["admin", f"ambulance:{amb.ambulance_id}"], "ambulance:updated", out)
    return out


@router.patch("/api/ambulances/{ambulance_id}")
def patch_ambulance(
    ambulance_id: str,
    body: AmbulanceIn,
    _: m.User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
    events: EventBus = Depends(get_events),
):
    return _update_ambulance(ambulance_id, body, db, events)


@router.put("/api/ambulances/{ambulance_id}", include_in_schema=False)
def put_ambulance(
    ambulance_id: str,
    body: AmbulanceIn,
    _: m.User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
    events: EventBus = Depends(get_events),
):
    return _update_ambulance(ambulance_id, body, db, events)


# ------------------------------------------------------------------- drivers
@router.get("/api/drivers")
def list_drivers(user: m.User = Depends(get_current_user), db: Session = Depends(get_db)):
    q = select(m.Driver).order_by(m.Driver.driver_id)
    if user.role == "driver":
        q = q.where(m.Driver.user_id == user.user_id)
    elif user.role == "patient":
        # Patients can see the name/phone of the driver serving their request.
        assigned = select(m.Assignment.driver_id).join(
            m.EmergencyRequest, m.EmergencyRequest.request_id == m.Assignment.request_id
        ).where(
            m.EmergencyRequest.user_id == user.user_id,
            m.Assignment.assignment_status.in_(("PENDING_ACCEPTANCE", "ACCEPTED", "COMPLETED")),
        )
        q = q.where(m.Driver.driver_id.in_(assigned))
    return [driver_out(d) for d in db.scalars(q)]


@router.post("/api/drivers", status_code=201)
def create_driver(
    body: DriverIn,
    _: m.User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
    events: EventBus = Depends(get_events),
):
    if not (body.name and body.email and body.phone and body.license_number):
        raise HTTPException(422, "Name, email, phone and license number are required.")
    email = body.email.strip().lower()
    if db.scalar(select(m.User).where(func.lower(m.User.email) == email)):
        raise HTTPException(409, "An account with this email already exists.")
    license_no = body.license_number.strip().upper()
    if db.scalar(select(m.Driver).where(m.Driver.license_number == license_no)):
        raise HTTPException(409, "A driver with this license number already exists.")
    user = m.User(
        user_id=next_id(db, m.User),
        name=body.name.strip(),
        email=email,
        phone=body.phone.strip(),
        password_hash=hash_password(body.password or settings.DEMO_PASSWORD),
        role="driver",
    )
    db.add(user)
    db.flush()
    drv = m.Driver(
        driver_id=next_id(db, m.Driver),
        user_id=user.user_id,
        license_number=license_no,
        availability=body.availability if body.availability in m.DRIVER_AVAILABILITY else "OFF_DUTY",
        verification_status=body.verification_status or "VERIFIED",
        gps_sharing=False,
    )
    db.add(drv)
    db.flush()
    if body.assigned_ambulance_id:
        amb = get_or_404(db, m.Ambulance, body.assigned_ambulance_id, "Ambulance")
        if amb.driver:
            amb.driver.ambulance_id = None
            db.flush()
        drv.ambulance_id = amb.ambulance_id
    log_activity(db, f"Registered driver {user.name}")
    db.commit()
    db.refresh(drv)
    out = driver_out(drv)
    events.emit(["admin"], "driver:updated", out)
    return out


def _update_driver(driver_id: str, body: DriverIn, db: Session, events: EventBus):
    drv = get_or_404(db, m.Driver, driver_id, "Driver")
    data = body.model_dump(exclude_unset=True)
    if data.get("name"):
        drv.user.name = data["name"].strip()
    if data.get("phone"):
        drv.user.phone = data["phone"].strip()
    if data.get("email"):
        email = data["email"].strip().lower()
        clash = db.scalar(select(m.User).where(func.lower(m.User.email) == email, m.User.user_id != drv.user_id))
        if clash:
            raise HTTPException(409, "Another account already uses this email.")
        drv.user.email = email
    if data.get("license_number"):
        drv.license_number = data["license_number"].strip().upper()
    if data.get("availability"):
        if data["availability"] not in m.DRIVER_AVAILABILITY:
            raise HTTPException(422, "Availability must be ONLINE or OFF_DUTY.")
        drv.availability = data["availability"]
    approved_now = False
    if data.get("verification_status"):
        approved_now = drv.verification_status != "VERIFIED" and data["verification_status"] == "VERIFIED"
        drv.verification_status = data["verification_status"]
        if approved_now:
            log_activity(db, f"Driver {drv.user.name} approved", "success")
    if "gps_sharing" in data and data["gps_sharing"] is not None:
        drv.gps_sharing = bool(data["gps_sharing"])
    if "assigned_ambulance_id" in data:
        target = data["assigned_ambulance_id"] or None
        if target:
            amb = get_or_404(db, m.Ambulance, target, "Ambulance")
            if amb.driver and amb.driver.driver_id != drv.driver_id:
                amb.driver.ambulance_id = None
                db.flush()
        drv.ambulance_id = target
    if data.get("password"):
        drv.user.password_hash = hash_password(data["password"])
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "That change conflicts with an existing record.")
    db.refresh(drv)
    out = driver_out(drv)
    events.emit(
        ["admin", f"driver:{drv.driver_id}"],
        "driver:updated",
        out,
        {
            "title": "You're approved",
            "message": "A dispatcher verified your account. Go on duty to start receiving assignments.",
            "type": "success",
            "roles": ["driver"],
            "link": "/driver/dashboard",
        }
        if approved_now
        else None,
    )
    return out


@router.patch("/api/drivers/{driver_id}")
def patch_driver(driver_id: str, body: DriverIn, _: m.User = Depends(require_roles("admin")),
                 db: Session = Depends(get_db), events: EventBus = Depends(get_events)):
    return _update_driver(driver_id, body, db, events)


@router.put("/api/drivers/{driver_id}", include_in_schema=False)
def put_driver(driver_id: str, body: DriverIn, _: m.User = Depends(require_roles("admin")),
               db: Session = Depends(get_db), events: EventBus = Depends(get_events)):
    return _update_driver(driver_id, body, db, events)


def _driver_self_or_admin(driver_id: str, user: m.User, db: Session) -> m.Driver:
    drv = get_or_404(db, m.Driver, driver_id, "Driver")
    if user.role == "driver" and current_driver(user).driver_id != driver_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "You can only update your own status.")
    if user.role == "patient":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not allowed.")
    return drv


@router.patch("/api/drivers/{driver_id}/availability")
def set_availability(
    driver_id: str,
    body: AvailabilityIn,
    user: m.User = Depends(get_current_user),
    db: Session = Depends(get_db),
    events: EventBus = Depends(get_events),
):
    drv = _driver_self_or_admin(driver_id, user, db)
    if body.availability not in m.DRIVER_AVAILABILITY:
        raise HTTPException(422, "Availability must be ONLINE or OFF_DUTY.")
    if body.availability == "OFF_DUTY" and drv.ambulance and drv.ambulance.status in ("ASSIGNED", "EN_ROUTE", "ON_TRIP"):
        raise HTTPException(409, "Finish your active trip before going off duty.")
    drv.availability = body.availability
    log_activity(db, f"Driver {drv.user.name} is now {body.availability.replace('_', ' ').lower()}")
    db.commit()
    out = driver_out(drv)
    events.emit(["admin", f"driver:{driver_id}"], "driver:updated", out)
    return out


@router.patch("/api/drivers/{driver_id}/gps")
def set_gps_sharing(
    driver_id: str,
    body: GpsIn,
    user: m.User = Depends(get_current_user),
    db: Session = Depends(get_db),
    events: EventBus = Depends(get_events),
):
    drv = _driver_self_or_admin(driver_id, user, db)
    drv.gps_sharing = body.gps_sharing
    db.commit()
    out = driver_out(drv)
    events.emit(["admin", f"driver:{driver_id}"], "driver:updated", out)
    return out


# ----------------------------------------------------------------- hospitals
@router.get("/api/hospitals")
def list_hospitals(_: m.User = Depends(get_current_user), db: Session = Depends(get_db)):
    return [hospital_out(h) for h in db.scalars(select(m.Hospital).order_by(m.Hospital.hospital_id))]


@router.post("/api/hospitals", status_code=201)
def create_hospital(body: HospitalIn, _: m.User = Depends(require_roles("admin")),
                    db: Session = Depends(get_db), events: EventBus = Depends(get_events)):
    h = m.Hospital(
        hospital_id=next_id(db, m.Hospital),
        name=body.name.strip(),
        address=body.address.strip(),
        contact_number=(body.contact_number or "").strip(),
        latitude=body.lat,
        longitude=body.lng,
    )
    db.add(h)
    log_activity(db, f"Added hospital {h.name}")
    db.commit()
    out = hospital_out(h)
    events.emit(["admin"], "hospital:updated", out)
    return out


def _update_hospital(hospital_id: str, body: HospitalIn, db: Session, events: EventBus):
    h = get_or_404(db, m.Hospital, hospital_id, "Hospital")
    h.name, h.address = body.name.strip(), body.address.strip()
    h.contact_number = (body.contact_number or "").strip()
    h.latitude, h.longitude = body.lat, body.lng
    db.commit()
    out = hospital_out(h)
    events.emit(["admin"], "hospital:updated", out)
    return out


@router.put("/api/hospitals/{hospital_id}")
def put_hospital(hospital_id: str, body: HospitalIn, _: m.User = Depends(require_roles("admin")),
                 db: Session = Depends(get_db), events: EventBus = Depends(get_events)):
    return _update_hospital(hospital_id, body, db, events)


@router.patch("/api/hospitals/{hospital_id}", include_in_schema=False)
def patch_hospital(hospital_id: str, body: HospitalIn, _: m.User = Depends(require_roles("admin")),
                   db: Session = Depends(get_db), events: EventBus = Depends(get_events)):
    return _update_hospital(hospital_id, body, db, events)


@router.delete("/api/hospitals/{hospital_id}")
def delete_hospital(hospital_id: str, _: m.User = Depends(require_roles("admin")),
                    db: Session = Depends(get_db), events: EventBus = Depends(get_events)):
    h = get_or_404(db, m.Hospital, hospital_id, "Hospital")
    db.delete(h)
    log_activity(db, f"Removed hospital {h.name}", "warning")
    db.commit()
    events.emit(["admin"], "hospital:deleted", {"id": hospital_id})
    return {"id": hospital_id, "deleted": True}