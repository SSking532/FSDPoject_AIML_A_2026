"""Dashboard statistics, activity feed and reports (Sections 3.7)."""
from collections import Counter

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .. import models as m
from ..database import get_db
from ..deps import require_roles
from ..serializers import activity_out

router = APIRouter(prefix="/api", tags=["Administration"])


@router.get("/activity")
def activity(limit: int = 25, _: m.User = Depends(require_roles("admin")), db: Session = Depends(get_db)):
    rows = db.scalars(select(m.ActivityLog).order_by(m.ActivityLog.created_at.desc()).limit(min(limit, 100)))
    return [activity_out(a) for a in rows]


@router.get("/dashboard/stats")
def stats(_: m.User = Depends(require_roles("admin")), db: Session = Depends(get_db)):
    amb_status = Counter(dict(db.execute(select(m.Ambulance.status, func.count()).group_by(m.Ambulance.status)).all()))
    req_status = Counter(
        dict(db.execute(select(m.EmergencyRequest.status, func.count()).group_by(m.EmergencyRequest.status)).all())
    )
    by_type = dict(
        db.execute(select(m.EmergencyRequest.emergency_type, func.count()).group_by(m.EmergencyRequest.emergency_type)).all()
    )
    completed = db.scalars(select(m.Trip).where(m.Trip.status == "COMPLETED")).all()
    durations = [
        (t.end_time - t.start_time).total_seconds() / 60 for t in completed if t.end_time and t.start_time
    ]
    active = sum(req_status[s] for s in ("ASSIGNED", "ACCEPTED", "EN_ROUTE", "ARRIVED", "IN_TRANSIT"))
    return {
        "totalAmbulances": sum(amb_status.values()),
        "availableAmbulances": amb_status["AVAILABLE"],
        "unavailableAmbulances": sum(amb_status.values()) - amb_status["AVAILABLE"],
        "ambulancesByStatus": dict(amb_status),
        "pendingRequests": req_status["PENDING"],
        "activeAssignments": active,
        "completedTrips": len(completed),
        "requestsByStatus": dict(req_status),
        "requestsByType": by_type,
        "averageTripMinutes": round(sum(durations) / len(durations), 1) if durations else None,
        "onlineDrivers": db.scalar(select(func.count()).select_from(m.Driver).where(m.Driver.availability == "ONLINE")),
    }
