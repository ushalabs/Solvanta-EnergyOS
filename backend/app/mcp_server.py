"""Run with python -m app.mcp_server; JWT comes from the process environment."""
import os
from uuid import UUID
from typing import Annotated, Literal
from pydantic import Field, ValidationError
from fastapi import HTTPException
from mcp.server.fastmcp import FastMCP
from mcp.server.fastmcp.exceptions import ToolError
from .db.session import AsyncSessionLocal
from .api.deps import get_current_user
from .services.operations import dispatch, ToolResult

mcp = FastMCP('Solvanta EnergyOS')

async def invoke(name, arguments):
    token = os.environ.get('SOLVANTA_MCP_TOKEN', '')
    if not token:
        raise ToolError('Authentication required: set SOLVANTA_MCP_TOKEN in the server environment')
    async with AsyncSessionLocal() as db:
        try:
            user = await get_current_user(db=db, token=token)
            return await dispatch(name, arguments, user, db)
        except HTTPException as exc:
            raise ToolError(f'{exc.status_code}: {exc.detail}') from None
        except (ValidationError, ValueError):
            raise ToolError('Invalid scenario or tool arguments') from None
        except Exception:
            # Never send SQL parameters, connection strings or credentials through MCP.
            raise ToolError('Tool failed; check local backend diagnostics') from None

@mcp.tool()
async def get_building_profile(building_id: UUID) -> ToolResult:
    """Read the authorized building's saved equipment configuration."""
    return await invoke('get_building_profile', {'building_id': building_id})

@mcp.tool()
async def get_energy_scenario(scenario_id: UUID) -> ToolResult:
    """Read an immutable saved simulation snapshot and result; scenario_id is a simulation run UUID."""
    return await invoke('get_energy_scenario', {'scenario_id': scenario_id})

@mcp.tool()
async def run_outage_simulation(scenario_id: UUID) -> ToolResult:
    """Run baseline dispatch from the saved scenario and persist a new SIMULATED run. No physical control."""
    return await invoke('run_outage_simulation', {'scenario_id': scenario_id})

@mcp.tool()
async def forecast_energy(scenario_id: UUID) -> ToolResult:
    """Project deterministic daily persistence from this saved run's final battery SoC."""
    return await invoke('forecast_energy', {'scenario_id': scenario_id})

@mcp.tool()
async def optimize_appliance_schedule(scenario_id: UUID) -> ToolResult:
    """Validate and save a minute-resolution PV/grid schedule; infeasibility is an explicit result."""
    return await invoke('optimize_appliance_schedule', {'scenario_id': scenario_id})

@mcp.tool()
async def optimize_resilience(scenario_id: UUID) -> ToolResult:
    """Compare baseline and critical-reserve heuristic using identical saved inputs."""
    return await invoke('optimize_resilience', {'scenario_id': scenario_id})

@mcp.tool()
async def compare_energy_configurations(scenario_id: UUID,
    variations: Annotated[list[Literal[0, 1, 2]], Field(min_length=1, max_length=3)]) -> ToolResult:
    """Compare presets: 0 current, 1 battery +50%, 2 PV +25%; hypothetical capacity changes only."""
    return await invoke('compare_energy_configurations', {'scenario_id': scenario_id, 'variations': variations})

@mcp.tool()
async def get_energy_anomalies(building_id: UUID) -> ToolResult:
    """Read persisted SIMULATED anomaly evidence for an authorized building."""
    return await invoke('get_energy_anomalies', {'building_id': building_id})

@mcp.tool()
async def propose_energy_plan(scenario_id: UUID) -> ToolResult:
    """Save a PENDING_APPROVAL proposal. Human approval is required in Plan Review; this tool cannot approve."""
    return await invoke('propose_energy_plan', {'scenario_id': scenario_id})

if __name__ == '__main__':
    mcp.run(transport='stdio')
