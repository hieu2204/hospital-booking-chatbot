from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import get_current_user
from app.models import PatientProfile, User
from app.schemas import ProfileIn, ProfileOut, ProfileUpdate
from app.security import encrypt, mask
from app.services.booking import owned_profile

router = APIRouter(prefix="/profiles", tags=["Hồ sơ người bệnh"])


def to_out(profile: PatientProfile) -> ProfileOut:
    return ProfileOut(
        id=profile.id,
        full_name=profile.full_name,
        dob=profile.dob,
        gender=profile.gender,
        relation=profile.relation,
        id_number_masked=mask(profile.id_number_enc),
        bhyt_code_masked=mask(profile.bhyt_code_enc),
        bhyt_rate=profile.bhyt_rate,
        hospital_patient_code=profile.hospital_patient_code,
        phone=profile.phone,
        email=profile.email,
        address=profile.address,
    )


def apply_fields(profile: PatientProfile, fields: dict) -> None:
    id_number = fields.pop("id_number", None)
    bhyt_code = fields.pop("bhyt_code", None)
    for name, value in fields.items():
        setattr(profile, name, value)
    if id_number:
        profile.id_number_enc = encrypt(id_number)
    if bhyt_code:
        profile.bhyt_code_enc = encrypt(bhyt_code)


@router.get("", response_model=list[ProfileOut])
def list_profiles(
    user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> list[ProfileOut]:
    profiles = db.scalars(select(PatientProfile).where(PatientProfile.user_id == user.id))
    return [to_out(profile) for profile in profiles]


@router.post("", response_model=ProfileOut, status_code=status.HTTP_201_CREATED)
def create_profile(
    body: ProfileIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> ProfileOut:
    profile = PatientProfile(user_id=user.id)
    apply_fields(profile, body.model_dump())
    db.add(profile)
    db.commit()
    return to_out(profile)


@router.patch("/{profile_id}", response_model=ProfileOut)
def update_profile(
    profile_id: int,
    body: ProfileUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ProfileOut:
    profile = owned_profile(db, user.id, profile_id)
    apply_fields(profile, body.model_dump(exclude_unset=True))
    db.commit()
    return to_out(profile)
