"""Convert ORM rows into the camelCase JSON shapes the React frontend consumes."""
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from . import models as m


def iso(dt: datetime | None) -> str | None:
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def user_out(user: m.User) -> dict:
    data = {
        "id": user.user_id,
        "name": user.name,
        "email": user.email,
        "phone": user.phone,
        "role": user.role,
        "address": user.address,
        "emergencyContact": user.emergency_contact,
        "bloodGroup": user.blood_group,
        "department": user.department,
        "createdAt": iso(user.created_at),
    }
    if user.driver is not None:
        data.update(
            driverId=user.driver.driver_id,
            licenseNumber=user.driver.license_number,
            assignedAmbulanceId=user.driver.ambulance_id,
            verificationStatus=user.driver.verification_status,
            availability=user.driver.availability,
        )
    return data


def ambulance_out(amb: m.Ambulance) -> dict:
    drv = amb.driver
    return {
        "id": amb.ambulance_id,
        "registrationNumber": amb.vehicle_number,
        "category": amb.ambulance_type,
        "driverId": drv.driver_id if drv else None,
        "driverName": drv.user.name if drv else "Unassigned",
        "status": amb.status,
        "currentLocation": amb.current_location,
        "lat": amb.latitude,
        "lng": amb.longitude,
        "lastUpdated": iso(amb.updated_at),
    }


def driver_out(drv: m.Driver) -> dict:
    return {
        "id": drv.driver_id,
        "userId": drv.user_id,
        "name": drv.user.name,
        "email": drv.user.email,
        "phone": drv.user.phone,
        "licenseNumber": drv.license_number,
        "assignedAmbulanceId": drv.ambulance_id,
        "availability": drv.availability,
        "verificationStatus": drv.verification_status,
        "gpsSharing": drv.gps_sharing,
    }


def hospital_out(h: m.Hospital) -> dict:
    return {
        "id": h.hospital_id,
        "name": h.name,
        "shortName": " ".join(h.name.split()[:2]),
        "address": h.address,
        "contactNumber": h.contact_number,
        "lat": h.latitude,
        "lng": h.longitude,
    }


def request_out(r: m.EmergencyRequest) -> dict:
    return {
        "id": r.request_id,
        "patientId": r.user_id,
        "patientName": r.patient_name,
        "contactNumber": r.contact_number,
        "category": r.emergency_type,
        "ambulanceTypeRequired": r.ambulance_type_required,
        "pickupAddress": r.pickup_address,
        "lat": r.pickup_latitude,
        "lng": r.pickup_longitude,
        "details": r.details or "",
        "status": r.status,
        "assignedAmbulanceId": r.assigned_ambulance_id,
        "createdAt": iso(r.created_at),
        "updatedAt": iso(r.updated_at),
    }


def assignment_out(a: m.Assignment) -> dict:
    return {
        "id": a.assignment_id,
        "requestId": a.request_id,
        "ambulanceId": a.ambulance_id,
        "driverId": a.driver_id,
        "hospitalId": a.hospital_id,
        "status": a.assignment_status,
        "assignedAt": iso(a.assigned_at),
        "respondedAt": iso(a.responded_at),
    }


def trip_out(t: m.Trip, db: Session | None = None) -> dict:
    req = db.get(m.EmergencyRequest, t.request_id) if db else None
    return {
        "id": t.trip_id,
        "requestId": t.request_id,
        "assignmentId": t.assignment_id,
        "ambulanceId": t.assignment.ambulance_id,
        "driverId": t.assignment.driver_id,
        "hospitalId": t.hospital_id,
        "pickupAddress": req.pickup_address if req else None,
        "destinationName": t.destination,
        "status": t.status,
        "startedAt": iso(t.start_time),
        "completedAt": iso(t.end_time),
        "statusHistory": [{"status": e.status, "time": iso(e.recorded_at)} for e in t.events],
    }


def activity_out(a: m.ActivityLog) -> dict:
    return {
        "id": f"ACT-{a.activity_id}",
        "message": a.message,
        "type": a.type,
        "time": iso(a.created_at),
    }