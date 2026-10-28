"""add_superuser_and_building_constraints

Revision ID: 9e404a9bb98d
Revises: c096aa2185f1
Create Date: 2026-10-29 00:05:35.368171

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9e404a9bb98d'
down_revision: Union[str, Sequence[str], None] = 'c096aa2185f1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('is_superuser', sa.Boolean(), nullable=False, server_default=sa.text('false')))
    
    op.create_check_constraint('chk_building_pv_capacity_pos', 'buildings', 'pv_capacity_kwp >= 0')
    op.create_check_constraint('chk_building_inverter_rating_pos', 'buildings', 'inverter_rating_kw >= 0')
    op.create_check_constraint('chk_building_battery_nominal_pos', 'buildings', 'battery_nominal_kwh >= 0')
    op.create_check_constraint('chk_building_battery_usable_pos', 'buildings', 'battery_usable_kwh >= 0')
    op.create_check_constraint('chk_building_battery_usable_lte_nominal', 'buildings', 'battery_usable_kwh <= battery_nominal_kwh')
    op.create_check_constraint('chk_building_battery_min_soc_range', 'buildings', 'battery_min_soc_pct >= 0 AND battery_min_soc_pct <= 100')
    op.create_check_constraint('chk_building_battery_initial_soc_range', 'buildings', 'battery_initial_soc_pct >= 0 AND battery_initial_soc_pct <= 100')
    op.create_check_constraint('chk_building_battery_min_soc_lte_initial', 'buildings', 'battery_min_soc_pct <= battery_initial_soc_pct')
    op.create_check_constraint('chk_building_battery_eff_range', 'buildings', 'battery_round_trip_efficiency > 0 AND battery_round_trip_efficiency <= 1.0')


def downgrade() -> None:
    op.drop_constraint('chk_building_battery_eff_range', 'buildings', type_='check')
    op.drop_constraint('chk_building_battery_min_soc_lte_initial', 'buildings', type_='check')
    op.drop_constraint('chk_building_battery_initial_soc_range', 'buildings', type_='check')
    op.drop_constraint('chk_building_battery_min_soc_range', 'buildings', type_='check')
    op.drop_constraint('chk_building_battery_usable_lte_nominal', 'buildings', type_='check')
    op.drop_constraint('chk_building_battery_usable_pos', 'buildings', type_='check')
    op.drop_constraint('chk_building_battery_nominal_pos', 'buildings', type_='check')
    op.drop_constraint('chk_building_inverter_rating_pos', 'buildings', type_='check')
    op.drop_constraint('chk_building_pv_capacity_pos', 'buildings', type_='check')
    
    op.drop_column('users', 'is_superuser')
