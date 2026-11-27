import os
import tempfile

import pytest

_tmp = tempfile.mkdtemp()
os.environ.setdefault("DATABASE_URL", f"sqlite:///{_tmp}/test.db")
os.environ["SEED_DEMO_DATA"] = "true"
os.environ["JWT_SECRET"] = "test-secret-key-that-is-long-enough-for-hs256"

from fastapi.testclient import TestClient  # noqa: E402

from app.database import Base, SessionLocal, engine  # noqa: E402
from app.main import app  # noqa: E402
from app.seed import seed  # noqa: E402

PASSWORD = "demo1234"


@pytest.fixture()
def client():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        seed(db)
    with TestClient(app) as c:
        yield c


def login(client, email):
    r = client.post("/api/auth/login", json={"email": email, "password": PASSWORD})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}, r.json()


@pytest.fixture()
def admin(client):
    return login(client, "admin@smartambulance.demo")[0]


@pytest.fixture()
def patient(client):
    return login(client, "patient@smartambulance.demo")[0]


@pytest.fixture()
def driver(client):
    return login(client, "driver@smartambulance.demo")[0]
