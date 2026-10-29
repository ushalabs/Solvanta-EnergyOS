from sqlalchemy import String,ForeignKey,JSON,UniqueConstraint
from sqlalchemy.orm import Mapped,mapped_column
from ..db.base import Base,TimestampMixin
import uuid
class AutomationEvent(Base,TimestampMixin):
 __tablename__='automation_events'
 __table_args__=(UniqueConstraint('actor_id','event_id',name='uq_actor_event'),)
 id:Mapped[str]=mapped_column(String(36),primary_key=True,default=lambda:str(uuid.uuid4()))
 building_id:Mapped[str]=mapped_column(String(36),ForeignKey('buildings.id',ondelete='CASCADE'),nullable=False,index=True)
 actor_id:Mapped[str]=mapped_column(String(36),ForeignKey('users.id',ondelete='CASCADE'),nullable=False)
 event_id:Mapped[str]=mapped_column(String(100),nullable=False)
 data:Mapped[dict]=mapped_column(JSON,nullable=False)
