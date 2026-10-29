import uuid
from sqlalchemy import String,ForeignKey,JSON
from sqlalchemy.orm import Mapped,mapped_column
from ..db.base import Base,TimestampMixin
class TelemetryRun(Base,TimestampMixin):
 __tablename__='telemetry_runs'
 id:Mapped[str]=mapped_column(String(36),primary_key=True,default=lambda:str(uuid.uuid4()))
 building_id:Mapped[str]=mapped_column(String(36),ForeignKey('buildings.id',ondelete='CASCADE'),nullable=False,index=True)
 run_id:Mapped[str]=mapped_column(String(36),ForeignKey('simulation_runs.id',ondelete='CASCADE'),nullable=False)
 data:Mapped[dict]=mapped_column(JSON,nullable=False)
class Incident(Base,TimestampMixin):
 __tablename__='incidents'
 id:Mapped[str]=mapped_column(String(36),primary_key=True,default=lambda:str(uuid.uuid4()))
 building_id:Mapped[str]=mapped_column(String(36),ForeignKey('buildings.id',ondelete='CASCADE'),nullable=False,index=True)
 telemetry_id:Mapped[str]=mapped_column(String(36),ForeignKey('telemetry_runs.id',ondelete='CASCADE'),nullable=False)
 data:Mapped[dict]=mapped_column(JSON,nullable=False)
