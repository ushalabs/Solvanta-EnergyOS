"""phase3_equipment_models

Revision ID: 3a4b5c6d7e8f
Revises: 9e404a9bb98d
Create Date: 2026-10-29 06:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3a4b5c6d7e8f'
down_revision: Union[str, Sequence[str], None] = '9e404a9bb98d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add Solar PV configuration columns
    op.add_column('buildings', sa.Column('pv_panel_tilt_deg', sa.Float(), nullable=False, server_default=sa.text('25.0')))
    op.add_column('buildings', sa.Column('pv_panel_azimuth_deg', sa.Float(), nullable=False, server_default=sa.text('180.0')))
    op.add_column('buildings', sa.Column('pv_system_losses_pct', sa.Float(), nullable=False, server_default=sa.text('14.0')))
    op.add_column('buildings', sa.Column('pv_module_count', sa.Integer(), nullable=False, server_default=sa.text('18')))
    op.add_column('buildings', sa.Column('pv_module_wattage_w', sa.Float(), nullable=False, server_default=sa.text('550.0')))

    # 2. Add Inverter configuration columns
    op.add_column('buildings', sa.Column('inverter_efficiency_pct', sa.Float(), nullable=False, server_default=sa.text('96.0')))
    op.add_column('buildings', sa.Column('inverter_type', sa.String(length=32), nullable=False, server_default=sa.text("'hybrid'")))

    # 3. Add Battery chemistry column
    op.add_column('buildings', sa.Column('battery_chemistry', sa.String(length=32), nullable=False, server_default=sa.text("'LFP'")))

    # 4. Add Backup Generator configuration columns
    op.add_column('buildings', sa.Column('has_generator', sa.Boolean(), nullable=False, server_default=sa.text('false')))
    op.add_column('buildings', sa.Column('generator_rating_kw', sa.Float(), nullable=False, server_default=sa.text('0.0')))
    op.add_column('buildings', sa.Column('generator_fuel_type', sa.String(length=32), nullable=True))
    op.add_column('buildings', sa.Column('generator_fuel_consumption_l_per_kwh', sa.Float(), nullable=False, server_default=sa.text('0.35')))
    op.add_column('buildings', sa.Column('generator_min_runtime_min', sa.Integer(), nullable=False, server_default=sa.text('15')))

    # 5. Add Grid Interconnection configuration columns
    op.add_column('buildings', sa.Column('grid_connection_type', sa.String(length=32), nullable=False, server_default=sa.text("'single_phase'")))
    op.add_column('buildings', sa.Column('grid_import_limit_kw', sa.Float(), nullable=False, server_default=sa.text('15.0')))
    op.add_column('buildings', sa.Column('grid_export_limit_kw', sa.Float(), nullable=False, server_default=sa.text('10.0')))
    op.add_column('buildings', sa.Column('has_net_metering', sa.Boolean(), nullable=False, server_default=sa.text('true')))

    # 6. Physical constraints
    op.create_check_constraint('chk_building_pv_tilt_range', 'buildings', 'pv_panel_tilt_deg >= 0 AND pv_panel_tilt_deg <= 90')
    op.create_check_constraint('chk_building_pv_azimuth_range', 'buildings', 'pv_panel_azimuth_deg >= 0 AND pv_panel_azimuth_deg <= 360')
    op.create_check_constraint('chk_building_pv_losses_range', 'buildings', 'pv_system_losses_pct >= 0 AND pv_system_losses_pct <= 50')
    op.create_check_constraint('chk_building_pv_module_count_pos', 'buildings', 'pv_module_count >= 0')
    op.create_check_constraint('chk_building_pv_module_wattage_pos', 'buildings', 'pv_module_wattage_w >= 0')
    op.create_check_constraint('chk_building_inverter_eff_range', 'buildings', 'inverter_efficiency_pct > 50 AND inverter_efficiency_pct <= 100')
    op.create_check_constraint('chk_building_gen_rating_pos', 'buildings', 'generator_rating_kw >= 0')
    op.create_check_constraint('chk_building_gen_fuel_pos', 'buildings', 'generator_fuel_consumption_l_per_kwh >= 0')
    op.create_check_constraint('chk_building_gen_runtime_pos', 'buildings', 'generator_min_runtime_min >= 0')
    op.create_check_constraint('chk_building_grid_import_pos', 'buildings', 'grid_import_limit_kw >= 0')
    op.create_check_constraint('chk_building_grid_export_pos', 'buildings', 'grid_export_limit_kw >= 0')


def downgrade() -> None:
    op.drop_constraint('chk_building_grid_export_pos', 'buildings', type_='check')
    op.drop_constraint('chk_building_grid_import_pos', 'buildings', type_='check')
    op.drop_constraint('chk_building_gen_runtime_pos', 'buildings', type_='check')
    op.drop_constraint('chk_building_gen_fuel_pos', 'buildings', type_='check')
    op.drop_constraint('chk_building_gen_rating_pos', 'buildings', type_='check')
    op.drop_constraint('chk_building_inverter_eff_range', 'buildings', type_='check')
    op.drop_constraint('chk_building_pv_module_wattage_pos', 'buildings', type_='check')
    op.drop_constraint('chk_building_pv_module_count_pos', 'buildings', type_='check')
    op.drop_constraint('chk_building_pv_losses_range', 'buildings', type_='check')
    op.drop_constraint('chk_building_pv_azimuth_range', 'buildings', type_='check')
    op.drop_constraint('chk_building_pv_tilt_range', 'buildings', type_='check')

    op.drop_column('buildings', 'has_net_metering')
    op.drop_column('buildings', 'grid_export_limit_kw')
    op.drop_column('buildings', 'grid_import_limit_kw')
    op.drop_column('buildings', 'grid_connection_type')
    op.drop_column('buildings', 'generator_min_runtime_min')
    op.drop_column('buildings', 'generator_fuel_consumption_l_per_kwh')
    op.drop_column('buildings', 'generator_fuel_type')
    op.drop_column('buildings', 'generator_rating_kw')
    op.drop_column('buildings', 'has_generator')
    op.drop_column('buildings', 'battery_chemistry')
    op.drop_column('buildings', 'inverter_type')
    op.drop_column('buildings', 'inverter_efficiency_pct')
    op.drop_column('buildings', 'pv_module_wattage_w')
    op.drop_column('buildings', 'pv_module_count')
    op.drop_column('buildings', 'pv_system_losses_pct')
    op.drop_column('buildings', 'pv_panel_azimuth_deg')
    op.drop_column('buildings', 'pv_panel_tilt_deg')
