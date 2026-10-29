"""Shared authenticated tool service for the HTTP gateway and MCP stdio adapter."""
import asyncio
import copy
from datetime import datetime, timedelta, timezone
from typing import Literal
from uuid import UUID

from fastapi import HTTPException
from fastapi.encoders import jsonable_encoder
from pydantic import BaseModel, ConfigDict, Field
from ..api.v1.endpoints.buildings import get_building, get_building_equipment
from ..api.v1.endpoints.plans import audit, serialize
from ..api.v1.endpoints.telemetry import incidents
from ..models.plan import EnergyPlan
from ..models.simulation import SimulationRun
from ..models.schedule import Schedule
from ..models.resilience import ResilienceRun
from ..schemas.simulation import Plant, SimulationInput
from .simulation import simulate, load_profiles
from .forecast import forecast
from .scheduling import solve_schedule
from .resilience import compare_resilience
from .plans import variants

ToolName = Literal['get_building_profile', 'get_energy_scenario', 'run_outage_simulation',
                   'forecast_energy', 'optimize_appliance_schedule', 'optimize_resilience',
                   'compare_energy_configurations', 'get_energy_anomalies', 'propose_energy_plan']
BUILDING_TOOLS = {'get_building_profile', 'get_energy_anomalies'}
TOOL_NAMES = list(ToolName.__args__)

class BuildingArguments(BaseModel):
    model_config = ConfigDict(extra='forbid')
    building_id: UUID

class ScenarioArguments(BaseModel):
    model_config = ConfigDict(extra='forbid')
    scenario_id: UUID

class CompareArguments(ScenarioArguments):
    variations: list[Literal[0, 1, 2]] = Field(default_factory=lambda: [0, 1, 2], min_length=1, max_length=3)

def argument_model(name):
    return BuildingArguments if name in BUILDING_TOOLS else CompareArguments if name == 'compare_energy_configurations' else ScenarioArguments

class ToolResult(BaseModel):
    tool: ToolName
    source: Literal['CONFIGURATION', 'SIMULATED']
    building_id: UUID
    scenario_id: UUID | None = None
    record_id: UUID | None = None
    units: dict[str, str] = Field(default_factory=lambda: {'power': 'kW', 'energy': 'kWh', 'soc': '%', 'time': 'minutes from midnight', 'appliance_power': 'W'})
    provenance: str
    data: dict

async def dispatch(name: ToolName, arguments: dict, user, db) -> ToolResult:
    if name not in TOOL_NAMES:
        raise HTTPException(404, 'Unknown tool')
    args = argument_model(name).model_validate(arguments)
    run = None
    if name in BUILDING_TOOLS:
        building_id = str(args.building_id)
    else:
        run = await db.get(SimulationRun, str(args.scenario_id))
        if run is None:
            raise HTTPException(404, 'Saved scenario not found')
        building_id = run.building_id
    await get_building(building_id, user, db)
    record_id = None
    if name == 'get_building_profile':
        data = (await get_building_equipment(building_id, user, db)).model_dump()
    elif name == 'get_energy_anomalies':
        data = {'incidents': await incidents(building_id, user, db), 'meaning': 'SIMULATED detector evidence; hypotheses are not physical diagnoses'}
    else:
        snapshot = copy.deepcopy(run.snapshot)
        options = SimulationInput(**snapshot['options'])
        if name == 'get_energy_scenario':
            data = {'snapshot': snapshot, 'result': run.result}
        elif name == 'run_outage_simulation':
            demand, critical = load_profiles(snapshot['appliances'])
            solar = [p['ac_kw'] for p in snapshot['pv']['timeline'] for _ in range(4)]
            result = simulate(Plant(**snapshot['plant']), demand, critical, solar, options)
            record = SimulationRun(building_id=building_id, snapshot=snapshot, result=result)
            db.add(record); await db.flush(); record_id = record.id
            data = {'result': result}
        elif name == 'forecast_energy':
            data = forecast(snapshot, options, run.result, run.id)
        elif name == 'optimize_appliance_schedule':
            if options.use_generator:
                raise HTTPException(422, 'Scheduler budget excludes generator; select a scenario without generator dispatch')
            budget = [(snapshot['pv']['timeline'][minute // 60]['ac_kw'] +
                       (0 if any(o.start_min <= minute < o.end_min for o in options.outages) else snapshot['plant']['grid_import_kw'])) * 1000 for minute in range(1440)]
            data = await asyncio.to_thread(solve_schedule, snapshot['appliances'], budget)
            data['supply_policy'] = 'PV plus available grid only; battery and generator excluded'
            if data['validated']:
                snapshot['budget_w'] = budget
                record = Schedule(building_id=building_id, snapshot=snapshot, result=data)
                db.add(record); await db.flush(); record_id = record.id
        elif name == 'optimize_resilience':
            data = compare_resilience(snapshot)
            record = ResilienceRun(building_id=building_id, snapshot=snapshot, result=data)
            db.add(record); await db.flush(); record_id = record.id
        elif name == 'compare_energy_configurations':
            data = {'variants': [{k: v for k, v in item.items() if k != 'snapshot'} for item in variants(snapshot) if item['index'] in args.variations]}
        else:
            record = EnergyPlan(building_id=building_id, snapshot=dict(state='PENDING_APPROVAL', revision=2, selected_variant=0,
                expires_at=(datetime.now(timezone.utc) + timedelta(minutes=60)).isoformat(), variants=variants(snapshot),
                run_id=None, receipts={}, verification_errors=[], source_scenario_id=run.id))
            db.add(record); await db.flush(); record_id = record.id
            audit(db, user, record, 'create', {'source': 'MCP-compatible tool', 'scenario_id': run.id})
            audit(db, user, record, 'submit', {'to': 'PENDING_APPROVAL', 'revision': 2})
            data = serialize(record)
    await db.commit()
    return ToolResult(tool=name, source='CONFIGURATION' if name == 'get_building_profile' else 'SIMULATED',
        building_id=building_id, scenario_id=run.id if run else None, record_id=record_id,
        provenance='Immutable saved scenario; deterministic engines, no observed telemetry or physical actuation' if run else 'Authorized building records',
        data=jsonable_encoder(data))
