"""Distance helpers and the allocation ranking (Section 3.4)."""
import math

AVERAGE_URBAN_SPEED_KMH = 38.0

# Which ambulance types can serve which required type.
# A request that needs BLS can be served by any unit; ALS needs ALS or CCU;
# CCU needs a cardiac care unit.
TYPE_COMPATIBILITY = {
    "Basic Life Support (BLS)": {
        "Basic Life Support (BLS)",
        "Advanced Life Support (ALS)",
        "Cardiac Care Unit (CCU)",
    },
    "Advanced Life Support (ALS)": {
        "Advanced Life Support (ALS)",
        "Cardiac Care Unit (CCU)",
    },
    "Cardiac Care Unit (CCU)": {"Cardiac Care Unit (CCU)"},
}

DEFAULT_TYPE_FOR_EMERGENCY = {
    "Cardiac": "Cardiac Care Unit (CCU)",
    "Stroke": "Advanced Life Support (ALS)",
    "Trauma": "Advanced Life Support (ALS)",
    "Respiratory": "Advanced Life Support (ALS)",
    "Maternity": "Basic Life Support (BLS)",
    "General": "Basic Life Support (BLS)",
}


def haversine_km(lat1, lng1, lat2, lng2) -> float | None:
    if None in (lat1, lng1, lat2, lng2):
        return None
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lng2 - lng1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return round(2 * r * math.atan2(math.sqrt(a), math.sqrt(1 - a)), 2)


def eta_minutes(distance_km: float | None) -> int | None:
    if distance_km is None:
        return None
    return max(2, round(distance_km / AVERAGE_URBAN_SPEED_KMH * 60))


def is_type_compatible(required: str | None, offered: str) -> bool:
    if not required:
        return True
    return offered in TYPE_COMPATIBILITY.get(required, {required})


def rank_candidates(pickup_lat, pickup_lng, required_type, candidates):
    """candidates: iterable of (ambulance, driver_or_None).

    Returns a list of dicts sorted best-first. Ineligible units are kept (at the
    end) with a reason so the dispatcher can see why they were skipped.
    """
    ranked = []
    for amb, drv in candidates:
        dist = haversine_km(pickup_lat, pickup_lng, amb.latitude, amb.longitude)
        reasons = []
        if amb.status != "AVAILABLE":
            reasons.append(f"Unit is {amb.status.replace('_', ' ').lower()}")
        if drv is None:
            reasons.append("No driver linked")
        elif drv.verification_status != "VERIFIED":
            reasons.append("Driver awaiting approval")
        elif drv.availability != "ONLINE":
            reasons.append("Driver off duty")
        type_ok = is_type_compatible(required_type, amb.ambulance_type)
        if not type_ok:
            reasons.append("Category does not match")
        ranked.append(
            {
                "ambulance": amb,
                "driver": drv,
                "distance_km": dist,
                "eta_minutes": eta_minutes(dist),
                "eligible": not reasons,
                "type_match": type_ok,
                "reasons": reasons,
            }
        )
    ranked.sort(
        key=lambda c: (not c["eligible"], c["distance_km"] if c["distance_km"] is not None else 9e9)
    )
    return ranked