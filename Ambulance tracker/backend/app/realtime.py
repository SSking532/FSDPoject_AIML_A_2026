"""WebSocket connection manager (Section 2.4 / 6.6).

Every socket subscribes to one or more *channels*:

    admin                 every administrator
    user:{user_id}        a single patient / driver / admin account
    driver:{driver_id}    the driver behind a given driver profile
    ambulance:{id}        anyone watching an ambulance's position
    request:{id}          anyone watching a request's status

Route handlers queue events through ``EventBus`` and the events are delivered
after the database transaction commits (via FastAPI BackgroundTasks).
"""
import asyncio
import json
from collections import defaultdict

from fastapi import BackgroundTasks, WebSocket


class ConnectionManager:
    def __init__(self) -> None:
        self.channels: dict[str, set[WebSocket]] = defaultdict(set)
        self._lock = asyncio.Lock()

    async def connect(self, ws: WebSocket, channels: list[str]) -> None:
        await ws.accept()
        async with self._lock:
            for ch in channels:
                self.channels[ch].add(ws)

    async def disconnect(self, ws: WebSocket) -> None:
        async with self._lock:
            for subs in self.channels.values():
                subs.discard(ws)

    async def publish(self, channels: list[str], message: dict) -> None:
        targets: set[WebSocket] = set()
        async with self._lock:
            for ch in channels:
                targets |= self.channels.get(ch, set())
        payload = json.dumps(message, default=str)
        dead = []
        for ws in targets:
            try:
                await ws.send_text(payload)
            except Exception:  # noqa: BLE001 - socket already gone
                dead.append(ws)
        for ws in dead:
            await self.disconnect(ws)


manager = ConnectionManager()


class EventBus:
    """Collects events during a request and flushes them after the response."""

    def __init__(self, background: BackgroundTasks) -> None:
        self.background = background

    def emit(
        self,
        channels: list[str],
        event: str,
        data: dict | None = None,
        notification: dict | None = None,
    ) -> None:
        message = {"event": event, "data": data or {}}
        if notification:
            message["notification"] = notification
        self.background.add_task(manager.publish, list(dict.fromkeys(channels)), message)
