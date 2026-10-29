from alembic import op
import sqlalchemy as sa
revision='6_appliances'
down_revision='5_pv_design'
branch_labels=None
depends_on=None

def upgrade():
    op.create_table('appliances',
      sa.Column('id',sa.String(36),primary_key=True),
      sa.Column('building_id',sa.String(36),sa.ForeignKey('buildings.id',ondelete='CASCADE'),nullable=False,index=True),
      sa.Column('name',sa.String(100),nullable=False),sa.Column('rated_power_w',sa.Float(),nullable=False),
      sa.Column('priority',sa.String(12),nullable=False),sa.Column('critical',sa.Boolean(),nullable=False),
      sa.Column('flexible',sa.Boolean(),nullable=False),sa.Column('required_runtime_min',sa.Integer(),nullable=False),
      sa.Column('earliest_min',sa.Integer(),nullable=False),sa.Column('latest_min',sa.Integer(),nullable=False),
      sa.Column('interruptible',sa.Boolean(),nullable=False),sa.Column('max_interruptions',sa.Integer(),nullable=False),
      sa.Column('created_at',sa.DateTime(timezone=True),nullable=False),sa.Column('updated_at',sa.DateTime(timezone=True),nullable=False),
      sa.CheckConstraint('rated_power_w > 0'),sa.CheckConstraint('required_runtime_min > 0 AND required_runtime_min <= 1440'),
      sa.CheckConstraint('earliest_min >= 0 AND latest_min <= 1440 AND earliest_min < latest_min'),sa.CheckConstraint('max_interruptions >= 0'))
    op.create_table('scenario_selections',
      sa.Column('id',sa.String(36),primary_key=True),
      sa.Column('building_id',sa.String(36),sa.ForeignKey('buildings.id',ondelete='CASCADE'),nullable=False,index=True),
      sa.Column('appliance_id',sa.String(36),sa.ForeignKey('appliances.id',ondelete='CASCADE'),nullable=False),
      sa.Column('selected',sa.Boolean(),nullable=False),
      sa.Column('created_at',sa.DateTime(timezone=True),nullable=False),sa.Column('updated_at',sa.DateTime(timezone=True),nullable=False),
      sa.UniqueConstraint('building_id','appliance_id',name='uq_scenario_appliance'))

def downgrade():
    op.drop_table('scenario_selections')
    op.drop_table('appliances')
