"""Persist PV engineering assumptions."""
from alembic import op
import sqlalchemy as sa
revision='5_pv_design'
down_revision='4_roof_geometry'
branch_labels=None
depends_on=None

def upgrade():
    op.create_table('pv_designs',
        sa.Column('building_id',sa.String(36),sa.ForeignKey('buildings.id',ondelete='CASCADE'),primary_key=True),
        sa.Column('parameters',sa.JSON(),nullable=False),
        sa.Column('created_at',sa.DateTime(timezone=True),nullable=False),
        sa.Column('updated_at',sa.DateTime(timezone=True),nullable=False))

def downgrade():
    op.drop_table('pv_designs')
