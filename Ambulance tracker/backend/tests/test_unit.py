"""Unit tests: distance calculation, filtering, allocation ranking, hashing, tokens."""
from types import SimpleNamespace as NS

from app.geo import eta_minutes, haversine_km, is_type_compatible, rank_candidates
from app.security import create_access_token, decode_access_token, hash_password, verify_password

ALS, BLS, CCU = "Advanced Life Support (ALS)", "Basic Life Support (BLS)", "Cardiac Care Unit (CCU)"


def test_haversine_known_distance():
    # Connaught Place -> India Gate is roughly 2.3 km
    d = haversine_km(28.6315, 77.2167, 28.6129, 77.2295)
    assert 2.0 < d < 2.6


def test_haversine_zero_and_missing():
    assert haversine_km(28.6, 77.2, 28.6, 77.2) == 0
    assert haversine_km(None, 77.2, 28.6, 77.2) is None


def test_eta_has_floor():
    assert eta_minutes(0.1) == 2
    assert eta_minutes(19) == 30


def test_type_compatibility():
    assert is_type_compatible(BLS, CCU)
    assert is_type_compatible(ALS, CCU)
    assert not is_type_compatible(ALS, BLS)
    assert not is_type_compatible(CCU, ALS)


def _amb(i, lat, lng, status="AVAILABLE", t=ALS):
    return NS(ambulance_id=i, latitude=lat, longitude=lng, status=status, ambulance_type=t)


def test_ranking_prefers_nearest_eligible():
    online = NS(availability="ONLINE")
    cands = [
        (_amb("far", 28.70, 77.30), online),
        (_amb("near_busy", 28.601, 77.201, status="ON_TRIP"), online),
        (_amb("near_wrong_type", 28.602, 77.202, t=BLS), online),
        (_amb("near_offduty", 28.603, 77.203), NS(availability="OFF_DUTY")),
        (_amb("near_ok", 28.61, 77.21), online),
    ]
    ranked = rank_candidates(28.60, 77.20, ALS, cands)
    assert ranked[0]["ambulance"].ambulance_id == "near_ok"
    assert ranked[1]["ambulance"].ambulance_id == "far"
    assert all(not c["eligible"] for c in ranked[2:])
    reasons = {c["ambulance"].ambulance_id: c["reasons"] for c in ranked}
    assert "Category does not match" in reasons["near_wrong_type"]
    assert "Driver off duty" in reasons["near_offduty"]


def test_password_hashing():
    h = hash_password("s3cret!")
    assert h != "s3cret!" and verify_password("s3cret!", h)
    assert not verify_password("wrong", h)
    assert hash_password("s3cret!") != h  # salted


def test_jwt_roundtrip():
    payload = decode_access_token(create_access_token("USR-1", "admin"))
    assert payload["sub"] == "USR-1" and payload["role"] == "admin"
