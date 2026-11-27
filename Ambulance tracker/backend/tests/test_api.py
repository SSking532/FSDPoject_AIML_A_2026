"""Integration tests covering the full emergency workflow (Section 4.1) and RBAC (8.2)."""
from tests.conftest import login


def test_health(client):
    assert client.get("/api/health").json()["status"] == "ok"


def test_register_login_me(client):
    r = client.post("/api/auth/register", json={
        "name": "Test Patient", "email": "New@Example.com", "phone": "+91 90000 00000", "password": "secret12"})
    assert r.status_code == 201
    body = r.json()
    assert body["user"]["role"] == "patient" and body["user"]["email"] == "new@example.com"
    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {body['access_token']}"})
    assert me.json()["name"] == "Test Patient"
    # duplicate email
    assert client.post("/api/auth/register", json={
        "name": "Xavier", "email": "new@example.com", "phone": "+91 90000 00001", "password": "secret12"}).status_code == 409
    # role cannot be escalated through registration
    r2 = client.post("/api/auth/register", json={
        "name": "Sneaky", "email": "s@example.com", "phone": "+91 90000 00002", "password": "secret12", "role": "admin"})
    assert r2.json()["user"]["role"] == "patient"


def test_bad_login_and_unauthenticated(client):
    assert client.post("/api/auth/login", json={"email": "admin@smartambulance.demo", "password": "nope"}).status_code == 401
    assert client.get("/api/requests").status_code == 401


def test_rbac(client, patient, driver):
    assert client.get("/api/drivers", headers=patient).json() != None  # noqa: E711
    assert client.post("/api/ambulances", headers=patient, json={}).status_code == 403
    assert client.post("/api/assignments/recommend", headers=driver, json={"requestId": "REQ-2042"}).status_code == 403
    # patient only sees own requests
    ids = {r["id"] for r in client.get("/api/requests", headers=patient).json()}
    assert ids == {"REQ-2041", "REQ-2038"}
    assert client.get("/api/requests/REQ-2042", headers=patient).status_code == 403
    # location privacy: patient cannot read an unrelated ambulance
    assert client.get("/api/location/AMB-103", headers=patient).status_code == 403
    assert client.get("/api/location/AMB-101", headers=patient).status_code == 200


def test_full_emergency_workflow(client, admin):
    # 1. a new patient registers and raises a request
    reg = client.post("/api/auth/register", json={
        "name": "Riya Das", "email": "riya@example.com", "phone": "+91 91111 22222", "password": "secret12"}).json()
    p = {"Authorization": f"Bearer {reg['access_token']}"}
    r = client.post("/api/requests", headers=p, json={
        "category": "Trauma", "pickupAddress": "Rajiv Chowk Gate 7", "lat": 28.6328, "lng": 77.2197,
        "details": "Fall from stairs"})
    assert r.status_code == 201, r.text
    req = r.json()
    assert req["status"] == "PENDING" and req["ambulanceTypeRequired"] == "Advanced Life Support (ALS)"
    # a second active request is refused
    assert client.post("/api/requests", headers=p, json={
        "category": "General", "pickupAddress": "x road", "lat": 28.6, "lng": 77.2}).status_code == 409

    # 2. allocation recommends the nearest eligible ALS/CCU unit
    rec = client.post("/api/assignments/recommend", headers=admin, json={"requestId": req["id"]}).json()
    best = rec["recommendedAmbulanceId"]
    assert best == "AMB-105"  # Karol Bagh ALS is closest eligible
    eligible = [c for c in rec["candidates"] if c["eligible"]]
    assert all(c["ambulance"]["category"] != "Basic Life Support (BLS)" for c in eligible)

    # 3. admin confirms
    asn = client.post("/api/assignments", headers=admin, json={
        "requestId": req["id"], "ambulanceId": best, "hospitalId": "HSP-01"}).json()
    assert asn["status"] == "PENDING_ACCEPTANCE"
    # double assignment of the same unit is blocked
    other = client.post("/api/assignments", headers=admin, json={"requestId": "REQ-2042", "ambulanceId": best})
    assert other.status_code == 409

    # 4. the right driver accepts (another driver cannot)
    wrong, _ = login(client, "driver@smartambulance.demo")
    assert client.post(f"/api/assignments/{asn['id']}/accept", headers=wrong).status_code == 403
    d, _ = login(client, "kavya.r@smartambulance.demo")
    acc = client.post(f"/api/assignments/{asn['id']}/accept", headers=d).json()
    trip_id = acc["tripId"]

    # 5. GPS update is visible to the patient
    loc = client.post("/api/location/update", headers=d, json={"ambulanceId": best, "lat": 28.64, "lng": 77.20})
    assert loc.status_code == 200
    snap = client.get(f"/api/tracking/{req['id']}", headers=p).json()
    assert snap["location"]["lat"] == 28.64 and snap["driver"]["name"] == "Kavya Reddy"
    assert snap["hospital"]["id"] == "HSP-01"

    # 6. status flow, skipping a step is rejected
    assert client.patch(f"/api/trips/{trip_id}/status", headers=d, json={"status": "IN_TRANSIT"}).status_code == 409
    for s in ("EN_ROUTE", "ARRIVED", "IN_TRANSIT", "COMPLETED"):
        res = client.patch(f"/api/trips/{trip_id}/status", headers=d, json={"status": s})
        assert res.status_code == 200, res.text
    trip = res.json()
    assert [h["status"] for h in trip["statusHistory"]] == ["ACCEPTED", "EN_ROUTE", "ARRIVED", "IN_TRANSIT", "COMPLETED"]
    assert trip["completedAt"]

    # 7. availability restored, request completed
    amb = next(a for a in client.get("/api/ambulances", headers=admin).json() if a["id"] == best)
    assert amb["status"] == "AVAILABLE"
    assert client.get(f"/api/requests/{req['id']}", headers=p).json()["status"] == "COMPLETED"
    stats = client.get("/api/dashboard/stats", headers=admin).json()
    assert stats["completedTrips"] == 2


def test_reject_returns_to_queue(client, admin):
    client.post("/api/assignments", headers=admin, json={"requestId": "REQ-2043", "ambulanceId": "AMB-103"})
    d, _ = login(client, "suresh.v@smartambulance.demo")
    asn = client.get("/api/assignments", headers=d).json()[0]
    client.post(f"/api/assignments/{asn['id']}/reject", headers=d)
    req = client.get("/api/requests/REQ-2043", headers=admin).json()
    assert req["status"] == "PENDING" and req["assignedAmbulanceId"] is None
    amb = next(a for a in client.get("/api/ambulances", headers=admin).json() if a["id"] == "AMB-103")
    assert amb["status"] == "AVAILABLE"


def test_cancel_frees_ambulance(client, admin):
    client.post("/api/assignments", headers=admin, json={"requestId": "REQ-2042", "ambulanceId": "AMB-105"})
    p, _ = login(client, "neha.k@smartambulance.demo")
    assert client.post("/api/requests/REQ-2042/cancel", headers=p).json()["status"] == "CANCELLED"
    amb = next(a for a in client.get("/api/ambulances", headers=admin).json() if a["id"] == "AMB-105")
    assert amb["status"] == "AVAILABLE"
    # en-route requests can no longer be cancelled
    p1, _ = login(client, "patient@smartambulance.demo")
    assert client.post("/api/requests/REQ-2041/cancel", headers=p1).status_code == 409


def test_fleet_crud(client, admin):
    a = client.post("/api/ambulances", headers=admin, json={
        "registrationNumber": "dl-9z-0001", "category": "Basic Life Support (BLS)"}).json()
    assert a["registrationNumber"] == "DL-9Z-0001" and a["id"] == "AMB-106"
    assert client.post("/api/ambulances", headers=admin, json={
        "registrationNumber": "DL-9Z-0001", "category": "Basic Life Support (BLS)"}).status_code == 409
    d = client.post("/api/drivers", headers=admin, json={
        "name": "New Driver", "email": "nd@example.com", "phone": "+91 9", "licenseNumber": "lic-1",
        "assignedAmbulanceId": a["id"], "availability": "ONLINE"}).json()
    assert d["assignedAmbulanceId"] == a["id"]
    nd, me = login(client, "nd@example.com")
    assert me["user"]["role"] == "driver"
    h = client.post("/api/hospitals", headers=admin, json={
        "name": "Test Hospital", "address": "Somewhere", "contactNumber": "1", "lat": 28.6, "lng": 77.2}).json()
    assert client.delete(f"/api/hospitals/{h['id']}", headers=admin).status_code == 200
    # cannot take a busy unit out of service
    assert client.patch("/api/ambulances/AMB-101", headers=admin, json={"status": "OUT_OF_SERVICE"}).status_code == 409


def test_websocket_receives_events(client, admin):
    token = admin["Authorization"].split()[1]
    with client.websocket_connect(f"/ws/updates?token={token}") as ws:
        assert ws.receive_json()["event"] == "connected"
        p, _ = login(client, "ramesh.i@smartambulance.demo")
        client.post("/api/requests/REQ-2043/cancel", headers=p)
        msg = ws.receive_json()
        assert msg["event"] == "request:cancelled" and msg["data"]["id"] == "REQ-2043"


def test_websocket_rejects_bad_token(client):
    import pytest
    from starlette.websockets import WebSocketDisconnect
    with pytest.raises(WebSocketDisconnect):
        with client.websocket_connect("/ws/admin?token=bad") as ws:
            ws.receive_json()
