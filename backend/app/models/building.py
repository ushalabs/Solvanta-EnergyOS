import uuid
from typing import Optional
from sqlalchemy import String, Float, ForeignKey, CheckConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from ..db.base import Base, TimestampMixin

class Building(Base, TimestampMixin):
    __tablename__ = "buildings"
    __table_args__ = (
        CheckConstraint("pv_capacity_kwp >= 0", name="chk_building_pv_capacity_pos"),
        CheckConstraint("inverter_rating_kw >= 0", name="chk_building_inverter_rating_pos"),
        CheckConstraint("battery_nominal_kwh >= 0", name="chk_building_battery_nominal_pos"),
        CheckConstraint("battery_usable_kwh >= 0", name="chk_building_battery_usable_pos"),
        CheckConstraint("battery_usable_kwh <= battery_nominal_kwh", name="chk_building_battery_usable_lte_nominal"),
        CheckConstraint("battery_min_soc_pct >= 0 AND battery_min_soc_pct <= 100", name="chk_building_battery_min_soc_range"),
        CheckConstraint("battery_initial_soc_pct >= 0 AND battery_initial_soc_pct <= 100", name="chk_building_battery_initial_soc_range"),
        CheckConstraint("battery_min_soc_pct <= battery_initial_soc_pct", name="chk_building_battery_min_soc_lte_initial"),
        CheckConstraint("battery_round_trip_efficiency > 0 AND battery_round_trip_efficiency <= 1.0", name="chk_building_battery_eff_range"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    address: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    timezone: Mapped[str] = mapped_column(String(64), default="Asia/Karachi", nullable=False)

    # Equipment Configuration (Physical Sizing Baseline)
    pv_capacity_kwp: Mapped[float] = mapped_column(Float, default=10.0, nullable=False)
    inverter_rating_kw: Mapped[float] = mapped_column(Float, default=8.0, nullable=False)
    
    # Battery Storage
    battery_nominal_kwh: Mapped[float] = mapped_column(Float, default=10.0, nullable=False)
    battery_usable_kwh: Mapped[float] = mapped_column(Float, default=9.0, nullable=False)
    battery_initial_soc_pct: Mapped[float] = mapped_column(Float, default=70.0, nullable=False)
    battery_min_soc_pct: Mapped[float] = mapped_column(Float, default=20.0, nullable=False)
    battery_max_charge_kw: Mapped[float] = mapped_column(Float, default=4.0, nullable=False)
    battery_max_discharge_kw: Mapped[float] = mapped_column(Float, default=4.0, nullable=False)
    battery_round_trip_efficiency: Mapped[float] = mapped_column(Float, default=0.90, nullable=False)

    # Ownership & Tenant Isolation
    owner_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    owner: Mapped["User"] = relationship("User", back_populates="buildings")

    organization_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("organizations.id", ondelete="SET NULL"), nullable=True)
    organization: Mapped[Optional["Organization"]] = relationship("Organization", back_populates="buildings")
