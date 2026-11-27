"""SQLAlchemy models mirroring Section 5.2 of the System Design Document.

Column names follow the design document (user_id, vehicle_number, ambulance_type,
pickup_latitude, ...). A few extra columns support the UI (address, details,
current_location, verification_status, ...).
"""
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


# Controlled vocabularies (Section 5.4: "statuses should use controlled values")
ROLES = ("patient", "driver", "admin")
AMBULANCE_TYPES = (
    "Basic Life Support (BLS)",
    "Advanced Life Support (ALS)",
    "Cardiac Care Unit (CCU)",
)
AMBULANCE_STATUSES = ("AVAILABLE", "ASSIGNED", "EN_ROUTE", "ON_TRIP", "OUT_OF_SERVICE")
DRIVER_AVAILABILITY = ("ONLINE", "OFF_DUTY")
REQUEST_STATUSES = (
    "CREATED",
    "PENDING",
    "ASSIGNED",
    "ACCEPTED",
    "EN_ROUTE",
    "ARRIVED",
    "IN_TRANSIT",
    "COMPLETED",
    "CANCELLED",
    "NO_AMBULANCE_AVAILABLE",
)
ASSIGNMENT_STATUSES = (
    "PENDING_ACCEPTANCE",
    "ACCEPTED",
    "REJECTED",
    "CANCELLED",
    "COMPLETED",
)
TRIP_STATUS_FLOW = ("ACCEPTED", "EN_ROUTE", "ARRIVED", "IN_TRANSIT", "COMPLETED")
EMERGENCY_TYPES = ("Cardiac", "Trauma", "Respiratory", "Stroke", "Maternity", "General")


def _in(col: str, values) -> str:
    return f"{col} IN ({', '.join(repr(v) for v in values)})"


class User(Base):
    __tablename__ = "users"
    __table_args__ = (CheckConstraint(_in("role", ROLES), name="ck_users_role"),)

    user_id: Mapped[str] = mapped_column(String(32), primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(160), unique=True, index=True)
    phone: Mapped[str] = mapped_column(String(32))
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(16), index=True)
    address: Mapped[str | None] = mapped_column(String(255), nullable=True)
    emergency_contact: Mapped[str | None] = mapped_column(String(32), nullable=True)
    blood_group: Mapped[str | None] = mapped_column(String(16), nullable=True)
    department: Mapped[str | None] = mapped_column(String(160), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    driver: Mapped["Driver | None"] = relationship(back_populates="user", uselist=False)


class Ambulance(Base):
    __tablename__ = "ambulances"
    __table_args__ = (
        CheckConstraint(_in("status", AMBULANCE_STATUSES), name="ck_ambulance_status"),
    )

    ambulance_id: Mapped[str] = mapped_column(String(32), primary_key=True)
    vehicle_number: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    ambulance_type: Mapped[str] = mapped_column(String(64))
    status: Mapped[str] = mapped_column(String(24), default="AVAILABLE", index=True)
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    current_location: Mapped[str | None] = mapped_column(String(255), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    driver: Mapped["Driver | None"] = relationship(back_populates="ambulance", uselist=False)


class Driver(Base):
    __tablename__ = "drivers"
    __table_args__ = (
        CheckConstraint(_in("availability", DRIVER_AVAILABILITY), name="ck_driver_avail"),
    )

    driver_id: Mapped[str] = mapped_column(String(32), primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.user_id", ondelete="CASCADE"), unique=True)
    ambulance_id: Mapped[str | None] = mapped_column(
        ForeignKey("ambulances.ambulance_id", ondelete="SET NULL"), unique=True, nullable=True
    )
    license_number: Mapped[str] = mapped_column(String(48), unique=True)
    availability: Mapped[str] = mapped_column(String(16), default="OFF_DUTY")
    verification_status: Mapped[str] = mapped_column(String(24), default="VERIFIED")
    gps_sharing: Mapped[bool] = mapped_column(Boolean, default=False)

    user: Mapped[User] = relationship(back_populates="driver")
    ambulance: Mapped[Ambulance | None] = relationship(back_populates="driver")


class Hospital(Base):
    __tablename__ = "hospitals"

    hospital_id: Mapped[str] = mapped_column(String(32), primary_key=True)
    name: Mapped[str] = mapped_column(String(160))
    address: Mapped[str] = mapped_column(String(255))
    contact_number: Mapped[str | None] = mapped_column(String(32), nullable=True)
    latitude: Mapped[float] = mapped_column(Float)
    longitude: Mapped[float] = mapped_column(Float)


class EmergencyRequest(Base):
    __tablename__ = "emergency_requests"
    __table_args__ = (
        CheckConstraint(_in("status", REQUEST_STATUSES), name="ck_request_status"),
        Index("ix_requests_status_created", "status", "created_at"),
    )

    request_id: Mapped[str] = mapped_column(String(32), primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.user_id"), index=True)
    patient_name: Mapped[str] = mapped_column(String(120))
    contact_number: Mapped[str] = mapped_column(String(32))
    pickup_address: Mapped[str] = mapped_column(String(255))
    pickup_latitude: Mapped[float] = mapped_column(Float)
    pickup_longitude: Mapped[float] = mapped_column(Float)
    emergency_type: Mapped[str] = mapped_column(String(32))
    ambulance_type_required: Mapped[str] = mapped_column(String(64))
    details: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="PENDING")
    assigned_ambulance_id: Mapped[str | None] = mapped_column(
        ForeignKey("ambulances.ambulance_id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Assignment(Base):
    __tablename__ = "assignments"
    __table_args__ = (
        CheckConstraint(_in("assignment_status", ASSIGNMENT_STATUSES), name="ck_asn_status"),
    )

    assignment_id: Mapped[str] = mapped_column(String(32), primary_key=True)
    request_id: Mapped[str] = mapped_column(ForeignKey("emergency_requests.request_id"), index=True)
    ambulance_id: Mapped[str] = mapped_column(ForeignKey("ambulances.ambulance_id"), index=True)
    driver_id: Mapped[str | None] = mapped_column(ForeignKey("drivers.driver_id"), nullable=True, index=True)
    hospital_id: Mapped[str | None] = mapped_column(
        ForeignKey("hospitals.hospital_id", ondelete="SET NULL"), nullable=True
    )
    assigned_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    responded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    assignment_status: Mapped[str] = mapped_column(String(24), default="PENDING_ACCEPTANCE")


class Trip(Base):
    __tablename__ = "trips"
    __table_args__ = (
        CheckConstraint(_in("status", TRIP_STATUS_FLOW), name="ck_trip_status"),
    )

    trip_id: Mapped[str] = mapped_column(String(32), primary_key=True)
    request_id: Mapped[str] = mapped_column(ForeignKey("emergency_requests.request_id"), index=True)
    assignment_id: Mapped[str] = mapped_column(ForeignKey("assignments.assignment_id"), unique=True)
    hospital_id: Mapped[str | None] = mapped_column(
        ForeignKey("hospitals.hospital_id", ondelete="SET NULL"), nullable=True
    )
    start_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    end_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    destination: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status: Mapped[str] = mapped_column(String(24), default="ACCEPTED")

    events: Mapped[list["TripEvent"]] = relationship(
        order_by="TripEvent.recorded_at", cascade="all, delete-orphan"
    )
    assignment: Mapped[Assignment] = relationship()


class TripEvent(Base):
    """Status history for a trip (one row per status change)."""

    __tablename__ = "trip_events"

    event_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    trip_id: Mapped[str] = mapped_column(ForeignKey("trips.trip_id", ondelete="CASCADE"), index=True)
    status: Mapped[str] = mapped_column(String(24))
    recorded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class LocationLog(Base):
    __tablename__ = "location_logs"

    log_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    ambulance_id: Mapped[str] = mapped_column(
        ForeignKey("ambulances.ambulance_id", ondelete="CASCADE"), index=True
    )
    latitude: Mapped[float] = mapped_column(Float)
    longitude: Mapped[float] = mapped_column(Float)
    recorded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)


class ActivityLog(Base):
    """Operational feed shown on the administrator dashboard."""

    __tablename__ = "activity_logs"

    activity_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    message: Mapped[str] = mapped_column(String(255))
    type: Mapped[str] = mapped_column(String(16), default="info")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)
