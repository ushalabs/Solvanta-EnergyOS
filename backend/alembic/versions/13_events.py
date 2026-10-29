from alembic import op
import sqlalchemy as sa
revision='13_events'
down_revision='11_plans'
branch_labels=None
depends_on=None
def upgrade():
 op.create_table('automation_events',sa.Column('id',sa.String(36),primary_key=True),sa.Column('building_id',sa.String(36),sa.ForeignKey('buildings.id',ondelete='CASCADE'),nullable=False,index=True),sa.Column('actor_id',sa.String(36),sa.ForeignKey('users.id',ondelete='CASCADE'),nullable=False),sa.Column('event_id',sa.String(100),nullable=False),sa.Column('data',sa.JSON(),nullable=False),sa.Column('created_at',sa.DateTime(timezone=True),nullable=False),sa.Column('updated_at',sa.DateTime(timezone=True),nullable=False),sa.UniqueConstraint('actor_id','event_id',name='uq_actor_event'))
def downgrade():op.drop_table('automation_events')
