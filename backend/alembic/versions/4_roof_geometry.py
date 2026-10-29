"""Persist calibrated roof geometry."""
from alembic import op
import sqlalchemy as sa
revision = '4_roof_geometry'
down_revision = '3a4b5c6d7e8f'
branch_labels = None
depends_on = None

def upgrade():
    op.create_table('roofs',
        sa.Column('building_id', sa.String(36), sa.ForeignKey('buildings.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('geometry', sa.JSON(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False))

def downgrade():
    op.drop_table('roofs')
