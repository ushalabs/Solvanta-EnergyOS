import uuid
from sqlalchemy import String,ForeignKey,JSON
from sqlalchemy.orm import Mapped,mapped_column
from ..db.base import Base,TimestampMixin
class EnergyPlan(Base,TimestampMixin):
    __tablename__='energy_plans'
    id:Mapped[str]=mapped_column(String(36),primary_key=True,default=lambda:str(uuid.uuid4()))
    building_id:Mapped[str]=mapped_column(String(36),ForeignKey('buildings.id',ondelete='CASCADE'),nullable=False,index=True)
    snapshot:Mapped[dict]=mapped_column(JSON,nullable=False)

