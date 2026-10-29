import uuid
from sqlalchemy import String, ForeignKey, Float, Integer, Boolean, CheckConstraint, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from ..db.base import Base, TimestampMixin

class Appliance(Base, TimestampMixin):
    __tablename__='appliances'
    __table_args__=(CheckConstraint('rated_power_w > 0'), CheckConstraint('required_runtime_min > 0 AND required_runtime_min <= 1440'), CheckConstraint('earliest_min >= 0 AND latest_min <= 1440 AND earliest_min < latest_min'), CheckConstraint('max_interruptions >= 0'),)
    id: Mapped[str]=mapped_column(String(36),primary_key=True,default=lambda:str(uuid.uuid4()))
    building_id: Mapped[str]=mapped_column(String(36),ForeignKey('buildings.id',ondelete='CASCADE'),nullable=False,index=True)
    name: Mapped[str]=mapped_column(String(100),nullable=False)
    rated_power_w: Mapped[float]=mapped_column(Float,nullable=False)
    priority: Mapped[str]=mapped_column(String(12),nullable=False)
    critical: Mapped[bool]=mapped_column(Boolean,nullable=False,default=False)
    flexible: Mapped[bool]=mapped_column(Boolean,nullable=False,default=False)
    required_runtime_min: Mapped[int]=mapped_column(Integer,nullable=False)
    earliest_min: Mapped[int]=mapped_column(Integer,nullable=False)
    latest_min: Mapped[int]=mapped_column(Integer,nullable=False)
    interruptible: Mapped[bool]=mapped_column(Boolean,nullable=False,default=False)
    max_interruptions: Mapped[int]=mapped_column(Integer,nullable=False,default=0)

class ScenarioSelection(Base, TimestampMixin):
    __tablename__='scenario_selections'
    __table_args__=(UniqueConstraint('building_id','appliance_id',name='uq_scenario_appliance'),)
    id: Mapped[str]=mapped_column(String(36),primary_key=True,default=lambda:str(uuid.uuid4()))
    building_id: Mapped[str]=mapped_column(String(36),ForeignKey('buildings.id',ondelete='CASCADE'),nullable=False,index=True)
    appliance_id: Mapped[str]=mapped_column(String(36),ForeignKey('appliances.id',ondelete='CASCADE'),nullable=False)
    selected: Mapped[bool]=mapped_column(Boolean,nullable=False,default=False)
