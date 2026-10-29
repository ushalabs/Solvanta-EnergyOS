from alembic import op
import sqlalchemy as sa
revision='7_simulation'
down_revision='6_appliances'
branch_labels=None
depends_on=None
def upgrade():
    op.create_table('simulation_runs',sa.Column('id',sa.String(36),primary_key=True),
      sa.Column('building_id',sa.String(36),sa.ForeignKey('buildings.id',ondelete='CASCADE'),nullable=False,index=True),
      sa.Column('snapshot',sa.JSON(),nullable=False),sa.Column('result',sa.JSON(),nullable=False),
      sa.Column('created_at',sa.DateTime(timezone=True),nullable=False),sa.Column('updated_at',sa.DateTime(timezone=True),nullable=False))
def downgrade():op.drop_table('simulation_runs')
