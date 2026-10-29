import uuid
from typing import Optional
from sqlalchemy import String, Float, Integer, Boolean, ForeignKey, CheckConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from ..db.base import Base, TimestampMixin

class Building(Base, TimestampMixin):
    __tablename__ = "buildings"
    __table_args__ = (
        CheckConstraint("pv_capacity_kwp >= 0", name="chk_building_pv_capacity_pos"),
        CheckConstraint("pv_panel_tilt_deg >= 0 AND pv_panel_tilt_deg <= 90", name="chk_building_pv_tilt_range"),
        CheckConstraint("pv_panel_azimuth_deg >= 0 AND pv_panel_azimuth_deg <= 360", name="chk_building_pv_azimuth_range"),
        CheckConstraint("pv_system_losses_pct >= 0 AND pv_system_losses_pct <= 50", name="chk_building_pv_losses_range"),
        CheckConstraint("pv_module_count >= 0", name="chk_building_pv_module_count_pos"),
        CheckConstraint("pv_module_wattage_w >= 0", name="chk_building_pv_module_wattage_pos"),
        CheckConstraint("inverter_rating_kw >= 0", name="chk_building_inverter_rating_pos"),
        CheckConstraint("inverter_efficiency_pct > 50 AND inverter_efficiency_pct <= 100", name="chk_building_inverter_eff_range"),
        CheckConstraint("battery_nominal_kwh >= 0", name="chk_building_battery_nominal_pos"),
        CheckConstraint("battery_usable_kwh >= 0", name="chk_building_battery_usable_pos"),
        CheckConstraint("battery_usable_kwh <= battery_nominal_kwh", name="chk_building_battery_usable_lte_nominal"),
        CheckConstraint("battery_min_soc_pct >= 0 AND battery_min_soc_pct <= 100", name="chk_building_battery_min_soc_range"),
        CheckConstraint("battery_initial_soc_pct >= 0 AND battery_initial_soc_pct <= 100", name="chk_building_battery_initial_soc_range"),
        CheckConstraint("battery_min_soc_pct <= battery_initial_soc_pct", name="chk_building_battery_min_soc_lte_initial"),
        CheckConstraint("battery_round_trip_efficiency > 0 AND battery_round_trip_efficiency <= 1.0", name="chk_building_battery_eff_range"),
        CheckConstraint("generator_rating_kw >= 0", name="chk_building_gen_rating_pos"),
        CheckConstraint("generator_fuel_consumption_l_per_kwh >= 0", name="chk_building_gen_fuel_pos"),
        CheckConstraint("generator_min_runtime_min >= 0", name="chk_building_gen_runtime_pos"),
        CheckConstraint("grid_import_limit_kw >= 0", name="chk_building_grid_import_pos"),
        CheckConstraint("grid_export_limit_kw >= 0", name="chk_building_grid_export_pos"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    address: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    timezone: Mapped[str] = mapped_column(String(64), default="Asia/Karachi", nullable=False)

    # Solar PV Equipment Configuration
    pv_capacity_kwp: Mapped[float] = mapped_column(Float, default=10.0, nullable=False)
    pv_panel_tilt_deg: Mapped[float] = mapped_column(Float, default=25.0, nullable=False)
    pv_panel_azimuth_deg: Mapped[float] = mapped_column(Float, default=180.0, nullable=False)
    pv_system_losses_pct: Mapped[float] = mapped_column(Float, default=14.0, nullable=False)
    pv_module_count: Mapped[int] = mapped_column(Integer, default=18, nullable=False)
    pv_module_wattage_w: Mapped[float] = mapped_column(Float, default=550.0, nullable=False)

    # Inverter Equipment Configuration
    inverter_rating_kw: Mapped[float] = mapped_column(Float, default=8.0, nullable=False)
    inverter_efficiency_pct: Mapped[float] = mapped_column(Float, default=96.0, nullable=False)
    inverter_type: Mapped[str] = mapped_column(String(32), default="hybrid", nullable=False)

    # Battery Storage Equipment Configuration
    battery_nominal_kwh: Mapped[float] = mapped_column(Float, default=10.0, nullable=False)
    battery_usable_kwh: Mapped[float] = mapped_column(Float, default=9.0, nullable=False)
    battery_initial_soc_pct: Mapped[float] = mapped_column(Float, default=70.0, nullable=False)
    battery_min_soc_pct: Mapped[float] = mapped_column(Float, default=20.0, nullable=False)
    battery_max_charge_kw: Mapped[float] = mapped_column(Float, default=4.0, nullable=False)
    battery_max_discharge_kw: Mapped[float] = mapped_column(Float, default=4.0, nullable=False)
    battery_round_trip_efficiency: Mapped[float] = mapped_column(Float, default=0.90, nullable=False)
    battery_chemistry: Mapped[str] = mapped_column(String(32), default="LFP", nullable=False)

    # Backup Generator Configuration (Optional resilience asset)
    has_generator: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    generator_rating_kw: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    generator_fuel_type: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    generator_fuel_consumption_l_per_kwh: Mapped[float] = mapped_column(Float, default=0.35, nullable=False)
    generator_min_runtime_min: Mapped[int] = mapped_column(Integer, default=15, nullable=False)

    # Grid Interconnection Configuration
    grid_connection_type: Mapped[str] = mapped_column(String(32), default="single_phase", nullable=False)
    grid_import_limit_kw: Mapped[float] = mapped_column(Float, default=15.0, nullable=False)
    grid_export_limit_kw: Mapped[float] = mapped_column(Float, default=10.0, nullable=False)
    has_net_metering: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Ownership & Multi-tenant Organization Isolation
    owner_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    owner: Mapped["User"] = relationship("User", back_populates="buildings")

    organization_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("organizations.id", ondelete="SET NULL"), nullable=True)
    organization: Mapped[Optional["Organization"]] = relationship("Organization", back_populates="buildings")
