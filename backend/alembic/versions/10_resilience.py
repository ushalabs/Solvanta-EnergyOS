from alembic import op
import sqlalchemy as sa
revision='10_resilience'
down_revision='9_schedules'
branch_labels=None
depends_on=None
def upgrade():
    op.create_table('resilience_runs',sa.Column('id',sa.String(36),primary_key=True),
      sa.Column('building_id',sa.String(36),sa.ForeignKey('buildings.id',ondelete='CASCADE'),nullable=False,index=True),
      sa.Column('snapshot',sa.JSON(),nullable=False),sa.Column('result',sa.JSON(),nullable=False),
      sa.Column('created_at',sa.DateTime(timezone=True),nullable=False),sa.Column('updated_at',sa.DateTime(timezone=True),nullable=False))
def downgrade():op.drop_table('resilience_runs')
