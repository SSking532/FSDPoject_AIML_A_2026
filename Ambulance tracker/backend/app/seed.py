"""Demo data (fictional) so the prototype is usable straight after first start.

Every seeded account uses the password in settings.DEMO_PASSWORD (default: demo1234).
"""
from datetime import timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from . import models as m
from .config import settings
from .security import hash_password


def seed(db: Session) -> bool:
    if db.scalar(select(m.User).limit(1)) is not None:
        return False

    now = m.utcnow()
    ago = lambda minutes: now - timedelta(minutes=minutes)  # noqa: E731
    pw = hash_password(settings.DEMO_PASSWORD)

    users = [
        m.User(user_id="USR-1001", name="Aarav Sharma", email="patient@smartambulance.demo", phone="+91 98110 24510",
               role="patient", address="B-18, Saket Enclave, New Delhi", emergency_contact="+91 98110 99001",
               blood_group="O+", password_hash=pw),
        m.User(user_id="USR-1002", name="Neha Kapoor", email="neha.k@smartambulance.demo", phone="+91 98182 34012",
               role="patient", address="Karol Bagh, New Delhi", blood_group="A+", password_hash=pw),
        m.User(user_id="USR-1003", name="Ramesh Iyer", email="ramesh.i@smartambulance.demo", phone="+91 98991 55219",
               role="patient", address="Patparganj, East Delhi", blood_group="B+", password_hash=pw),
        m.User(user_id="USR-1004", name="Dr. Meera Nair", email="admin@smartambulance.demo", phone="+91 98100 11220",
               role="admin", department="Central Emergency Dispatch Command", password_hash=pw),
        m.User(user_id="USR-1005", name="Vikram Singh", email="driver@smartambulance.demo", phone="+91 98712 44210",
               role="driver", password_hash=pw),
        m.User(user_id="USR-1006", name="Rohan Kulkarni", email="rohan.k@smartambulance.demo", phone="+91 98223 11894",
               role="driver", password_hash=pw),
        m.User(user_id="USR-1007", name="Suresh Verma", email="suresh.v@smartambulance.demo", phone="+91 98109 73342",
               role="driver", password_hash=pw),
        m.User(user_id="USR-1008", name="Imran Qureshi", email="imran.q@smartambulance.demo", phone="+91 99104 65211",
               role="driver", password_hash=pw),
        m.User(user_id="USR-1009", name="Kavya Reddy", email="kavya.r@smartambulance.demo", phone="+91 98735 20117",
               role="driver", password_hash=pw),
    ]
    db.add_all(users)

    hospitals = [
        m.Hospital(hospital_id="HSP-01", name="Metro Apex Trauma Center", address="Ring Road, Sector 18, New Delhi",
                   contact_number="+91 11 4050 1100", latitude=28.6185, longitude=77.2295),
        m.Hospital(hospital_id="HSP-02", name="St. Jude Cardiac & Emergency Institute", address="42 Institutional Area, Janakpuri",
                   contact_number="+91 11 2554 7800", latitude=28.6289, longitude=77.1842),
        m.Hospital(hospital_id="HSP-03", name="City Care Multispeciality Hospital", address="19 Mayur Vihar Phase II",
                   contact_number="+91 11 2277 9040", latitude=28.6095, longitude=77.2848),
        m.Hospital(hospital_id="HSP-04", name="Southside General Hospital", address="Press Enclave Road, Saket",
                   contact_number="+91 11 2956 4400", latitude=28.5402, longitude=77.1985),
    ]
    db.add_all(hospitals)

    ambulances = [
        m.Ambulance(ambulance_id="AMB-101", vehicle_number="DL-1A-4401", ambulance_type="Advanced Life Support (ALS)",
                    status="EN_ROUTE", latitude=28.5872, longitude=77.2141,
                    current_location="Lodhi Road, heading south", updated_at=ago(1)),
        m.Ambulance(ambulance_id="AMB-102", vehicle_number="DL-1A-7812", ambulance_type="Cardiac Care Unit (CCU)",
                    status="AVAILABLE", latitude=28.5672, longitude=77.2100,
                    current_location="AIIMS Trauma Standby Bay", updated_at=ago(2)),
        m.Ambulance(ambulance_id="AMB-103", vehicle_number="DL-1B-2290", ambulance_type="Basic Life Support (BLS)",
                    status="AVAILABLE", latitude=28.6410, longitude=77.2950,
                    current_location="Preet Vihar Dispatch Hub", updated_at=ago(3)),
        m.Ambulance(ambulance_id="AMB-104", vehicle_number="DL-1C-9045", ambulance_type="Basic Life Support (BLS)",
                    status="OUT_OF_SERVICE", latitude=28.6550, longitude=77.1720,
                    current_location="Central Fleet Depot (servicing)", updated_at=ago(55)),
        m.Ambulance(ambulance_id="AMB-105", vehicle_number="DL-1D-3318", ambulance_type="Advanced Life Support (ALS)",
                    status="AVAILABLE", latitude=28.6519, longitude=77.1905,
                    current_location="Karol Bagh Fire Station Bay", updated_at=ago(1)),
    ]
    db.add_all(ambulances)
    db.flush()

    db.add_all([
        m.Driver(driver_id="DRV-101", user_id="USR-1005", ambulance_id="AMB-101", license_number="DL-04-2019004821",
                 availability="ONLINE", verification_status="VERIFIED", gps_sharing=True),
        m.Driver(driver_id="DRV-102", user_id="USR-1006", ambulance_id="AMB-102", license_number="DL-02-2020019283",
                 availability="ONLINE", verification_status="VERIFIED", gps_sharing=True),
        m.Driver(driver_id="DRV-103", user_id="USR-1007", ambulance_id="AMB-103", license_number="DL-07-2018007612",
                 availability="ONLINE", verification_status="VERIFIED", gps_sharing=True),
        m.Driver(driver_id="DRV-104", user_id="USR-1008", ambulance_id="AMB-104", license_number="DL-09-2021003344",
                 availability="OFF_DUTY", verification_status="PENDING_APPROVAL", gps_sharing=False),
        m.Driver(driver_id="DRV-105", user_id="USR-1009", ambulance_id="AMB-105", license_number="DL-03-2022008817",
                 availability="ONLINE", verification_status="VERIFIED", gps_sharing=True),
    ])

    db.add_all([
        m.EmergencyRequest(request_id="REQ-2041", user_id="USR-1001", patient_name="Aarav Sharma",
                           contact_number="+91 98110 24510", pickup_address="B-18, Saket Enclave, New Delhi",
                           pickup_latitude=28.5245, pickup_longitude=77.2155, emergency_type="Cardiac",
                           ambulance_type_required="Advanced Life Support (ALS)",
                           details="Chest tightness and shortness of breath, patient conscious.",
                           status="EN_ROUTE", assigned_ambulance_id="AMB-101", created_at=ago(16), updated_at=ago(11)),
        m.EmergencyRequest(request_id="REQ-2042", user_id="USR-1002", patient_name="Neha Kapoor",
                           contact_number="+91 98182 34012", pickup_address="Karol Bagh Metro Gate 2",
                           pickup_latitude=28.6440, pickup_longitude=77.1888, emergency_type="Trauma",
                           ambulance_type_required="Advanced Life Support (ALS)",
                           details="Two-wheeler collision, suspected ankle fracture.",
                           status="PENDING", created_at=ago(6), updated_at=ago(6)),
        m.EmergencyRequest(request_id="REQ-2043", user_id="USR-1003", patient_name="Ramesh Iyer",
                           contact_number="+91 98991 55219", pickup_address="45 Patparganj Road, East Delhi",
                           pickup_latitude=28.6254, pickup_longitude=77.2895, emergency_type="Respiratory",
                           ambulance_type_required="Basic Life Support (BLS)",
                           details="Severe asthma episode requiring oxygen support.",
                           status="PENDING", created_at=ago(3), updated_at=ago(3)),
        m.EmergencyRequest(request_id="REQ-2038", user_id="USR-1001", patient_name="Aarav Sharma",
                           contact_number="+91 98110 24510", pickup_address="B-18, Saket Enclave, New Delhi",
                           pickup_latitude=28.5245, pickup_longitude=77.2155, emergency_type="General",
                           ambulance_type_required="Basic Life Support (BLS)",
                           details="High fever and dehydration transfer.", status="COMPLETED",
                           assigned_ambulance_id="AMB-102", created_at=ago(60 * 24 * 4), updated_at=ago(60 * 24 * 4 - 32)),
        m.EmergencyRequest(request_id="REQ-2034", user_id="USR-1002", patient_name="Neha Kapoor",
                           contact_number="+91 98182 34012", pickup_address="Lajpat Nagar Central Market",
                           pickup_latitude=28.5677, pickup_longitude=77.2433, emergency_type="Cardiac",
                           ambulance_type_required="Cardiac Care Unit (CCU)",
                           details="False alarm, patient transported privately.", status="CANCELLED",
                           created_at=ago(60 * 24 * 5), updated_at=ago(60 * 24 * 5 - 4)),
    ])
    db.flush()

    db.add_all([
        m.Assignment(assignment_id="ASN-301", request_id="REQ-2041", ambulance_id="AMB-101", driver_id="DRV-101",
                     hospital_id="HSP-04", assignment_status="ACCEPTED", assigned_at=ago(14), responded_at=ago(13)),
        m.Assignment(assignment_id="ASN-295", request_id="REQ-2038", ambulance_id="AMB-102", driver_id="DRV-102",
                     hospital_id="HSP-02", assignment_status="COMPLETED",
                     assigned_at=ago(60 * 24 * 4 - 2), responded_at=ago(60 * 24 * 4 - 3)),
    ])
    db.flush()

    t1 = m.Trip(trip_id="TRP-901", request_id="REQ-2041", assignment_id="ASN-301", hospital_id="HSP-04",
                destination="Southside General Hospital", status="EN_ROUTE", start_time=ago(13))
    t1.events = [m.TripEvent(status="ACCEPTED", recorded_at=ago(13)), m.TripEvent(status="EN_ROUTE", recorded_at=ago(11))]
    base = 60 * 24 * 4
    t2 = m.Trip(trip_id="TRP-894", request_id="REQ-2038", assignment_id="ASN-295", hospital_id="HSP-02",
                destination="St. Jude Cardiac & Emergency Institute", status="COMPLETED",
                start_time=ago(base - 3), end_time=ago(base - 31))
    t2.events = [
        m.TripEvent(status=s, recorded_at=ago(base - k))
        for s, k in (("ACCEPTED", 3), ("EN_ROUTE", 4), ("ARRIVED", 14), ("IN_TRANSIT", 18), ("COMPLETED", 31))
    ]
    db.add_all([t1, t2])

    for i, (lat, lng) in enumerate([(28.6030, 77.2190), (28.5960, 77.2170), (28.5872, 77.2141)]):
        db.add(m.LocationLog(ambulance_id="AMB-101", latitude=lat, longitude=lng, recorded_at=ago(6 - i * 2)))

    for msg, kind, minutes in (
        ("Southside General Hospital added to the receiving network", "info", 40),
        ("DL-1A-4401 dispatched to REQ-2041 (Cardiac, Saket)", "info", 14),
        ("DL-1A-4401 is en route to pickup for REQ-2041", "info", 11),
        ("New Trauma request REQ-2042 from Karol Bagh Metro Gate 2", "emergency", 6),
        ("New Respiratory request REQ-2043 from 45 Patparganj Road", "emergency", 3),
    ):
        db.add(m.ActivityLog(message=msg, type=kind, created_at=ago(minutes)))

    db.commit()
    return True
