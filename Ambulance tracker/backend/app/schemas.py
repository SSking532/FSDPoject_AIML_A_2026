"""Request bodies. Both camelCase (frontend) and snake_case (design doc) are accepted."""
from pydantic import BaseModel, ConfigDict, Field, field_validator
from pydantic.alias_generators import to_camel


class In(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, extra="ignore")


class RegisterIn(In):
    name: str = Field(min_length=2, max_length=120)
    email: str = Field(min_length=5, max_length=160)
    phone: str = Field(min_length=6, max_length=32)
    password: str = Field(min_length=6, max_length=128)
    role: str = "patient"
    # driver sign-up
    license_number: str | None = Field(default=None, max_length=48)
    vehicle_number: str | None = Field(default=None, max_length=32)
    ambulance_type: str | None = None
    lat: float | None = Field(default=None, ge=-90, le=90)
    lng: float | None = Field(default=None, ge=-180, le=180)
    # dispatcher sign-up
    admin_code: str | None = None
    department: str | None = Field(default=None, max_length=160)

    @field_validator("email")
    @classmethod
    def _email(cls, v: str) -> str:
        v = v.strip().lower()
        if "@" not in v or "." not in v.split("@")[-1]:
            raise ValueError("Enter a valid email address")
        return v


class LoginIn(In):
    email: str
    password: str


class ForgotIn(In):
    email: str


class ProfileUpdateIn(In):
    name: str | None = None
    phone: str | None = None
    address: str | None = None
    emergency_contact: str | None = None
    blood_group: str | None = None
    department: str | None = None


class RequestCreateIn(In):
    category: str = Field(default="General", validation_alias="category")
    emergency_type: str | None = None
    ambulance_type_required: str | None = None
    pickup_address: str = Field(min_length=3, max_length=255)
    lat: float | None = Field(default=None, ge=-90, le=90)
    lng: float | None = Field(default=None, ge=-180, le=180)
    pickup_latitude: float | None = Field(default=None, ge=-90, le=90)
    pickup_longitude: float | None = Field(default=None, ge=-180, le=180)
    patient_name: str | None = None
    contact_number: str | None = None
    details: str | None = Field(default=None, max_length=2000)


class StatusIn(In):
    status: str


class AmbulanceIn(In):
    registration_number: str | None = None
    vehicle_number: str | None = None
    category: str | None = None
    ambulance_type: str | None = None
    status: str | None = None
    driver_id: str | None = None
    current_location: str | None = None
    lat: float | None = Field(default=None, ge=-90, le=90)
    lng: float | None = Field(default=None, ge=-180, le=180)


class DriverIn(In):
    name: str | None = None
    email: str | None = None
    phone: str | None = None
    password: str | None = None
    license_number: str | None = None
    assigned_ambulance_id: str | None = None
    availability: str | None = None
    verification_status: str | None = None
    gps_sharing: bool | None = None


class AvailabilityIn(In):
    availability: str


class GpsIn(In):
    gps_sharing: bool


class HospitalIn(In):
    name: str = Field(min_length=2)
    address: str = Field(min_length=2)
    contact_number: str | None = None
    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)


class RecommendIn(In):
    request_id: str


class AssignmentCreateIn(In):
    request_id: str
    ambulance_id: str
    hospital_id: str | None = None


class LocationIn(In):
    ambulance_id: str
    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)
    current_location: str | None = None