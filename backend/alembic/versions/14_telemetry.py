from alembic import op
import sqlalchemy as sa
revision='14_telemetry'
down_revision='13_events'
branch_labels=None
depends_on=None
def upgrade():
 for table in ['telemetry_runs','incidents']:
  extra=[sa.Column('run_id',sa.String(36),sa.ForeignKey('simulation_runs.id',ondelete='CASCADE'),nullable=False)] if table=='telemetry_runs' else [sa.Column('telemetry_id',sa.String(36),sa.ForeignKey('telemetry_runs.id',ondelete='CASCADE'),nullable=False)]
  op.create_table(table,sa.Column('id',sa.String(36),primary_key=True),sa.Column('building_id',sa.String(36),sa.ForeignKey('buildings.id',ondelete='CASCADE'),nullable=False,index=True),*extra,sa.Column('data',sa.JSON(),nullable=False),sa.Column('created_at',sa.DateTime(timezone=True),nullable=False),sa.Column('updated_at',sa.DateTime(timezone=True),nullable=False))
def downgrade():
 op.drop_table('incidents');op.drop_table('telemetry_runs')
