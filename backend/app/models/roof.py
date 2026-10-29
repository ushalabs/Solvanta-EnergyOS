from sqlalchemy import ForeignKey, String, JSON
from sqlalchemy.orm import Mapped, mapped_column
from ..db.base import Base, TimestampMixin


class Roof(Base, TimestampMixin):
    __tablename__ = 'roofs'
    building_id: Mapped[str] = mapped_column(String(36), ForeignKey('buildings.id', ondelete='CASCADE'), primary_key=True)
    geometry: Mapped[dict] = mapped_column(JSON, nullable=False)
