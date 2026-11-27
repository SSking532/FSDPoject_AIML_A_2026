"""WebSocket endpoints (Section 6.6). Authenticate with ?token=<JWT>."""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, status

from .. import models as m
from ..database import SessionLocal
from ..deps import user_from_token
from ..realtime import manager
from ..services import can_view_request

router = APIRouter()


def _personal_channels(user: m.User) -> list[str]:
    channels = [f"user:{user.user_id}"]
    if user.role == "admin":
        channels.append("admin")
    if user.role == "driver" and user.driver:
        channels.append(f"driver:{user.driver.driver_id}")
    return channels


async def _serve(ws: WebSocket, channels: list[str]) -> None:
    await manager.connect(ws, channels)
    await ws.send_json({"event": "connected", "data": {"channels": channels}})
    try:
        while True:
            text = await ws.receive_text()
            if text == "ping":
                await ws.send_text("pong")
    except WebSocketDisconnect:
        pass
    finally:
        await manager.disconnect(ws)


async def _authenticate(ws: WebSocket) -> m.User | None:
    token = ws.query_params.get("token")
    with SessionLocal() as db:
        user = user_from_token(db, token)
        if user is not None:
            _ = user.driver  # load relationship before the session closes
    if user is None:
        await ws.close(code=status.WS_1008_POLICY_VIOLATION)
    return user


@router.websocket("/ws/updates")
async def ws_updates(ws: WebSocket):
    """Single multiplexed stream used by the React app: every event relevant to the signed-in user."""
    user = await _authenticate(ws)
    if user:
        await _serve(ws, _personal_channels(user))


@router.websocket("/ws/admin")
async def ws_admin(ws: WebSocket):
    user = await _authenticate(ws)
    if user is None:
        return
    if user.role != "admin":
        await ws.close(code=status.WS_1008_POLICY_VIOLATION)
        return
    await _serve(ws, ["admin"])


@router.websocket("/ws/ambulance/{ambulance_id}")
async def ws_ambulance(ws: WebSocket, ambulance_id: str):
    user = await _authenticate(ws)
    if user is None:
        return
    with SessionLocal() as db:
        allowed = user.role == "admin" or (
            user.role == "driver" and user.driver and user.driver.ambulance_id == ambulance_id
        )
        if user.role == "patient":
            allowed = (
                db.query(m.EmergencyRequest)
                .filter_by(user_id=user.user_id, assigned_ambulance_id=ambulance_id)
                .first()
                is not None
            )
    if not allowed:
        await ws.close(code=status.WS_1008_POLICY_VIOLATION)
        return
    await _serve(ws, [f"ambulance:{ambulance_id}"])


@router.websocket("/ws/requests/{request_id}")
async def ws_request(ws: WebSocket, request_id: str):
    user = await _authenticate(ws)
    if user is None:
        return
    with SessionLocal() as db:
        req = db.get(m.EmergencyRequest, request_id)
        allowed = req is not None and can_view_request(db, db.merge(user), req)
    if not allowed:
        await ws.close(code=status.WS_1008_POLICY_VIOLATION)
        return
    await _serve(ws, [f"request:{request_id}"])
