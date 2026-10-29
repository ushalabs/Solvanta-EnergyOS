from fastapi import APIRouter,Depends,HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from ....db.session import get_db
from ....models.user import User
from ....models.simulation import SimulationRun
from ....schemas.simulation import Plant,SimulationInput
from ....services.simulation import simulate,load_profiles
from ...deps import get_current_user
from .buildings import get_building
from .appliances import list_appliances
from .pv import read_pv
router=APIRouter()

async def calculate(building_id,options,user,db):
    b=await get_building(building_id,user,db)
    loads=await list_appliances(building_id,user,db)
    pv=await read_pv(building_id,user,db)
    try:
        plant=Plant(nominal_kwh=b.battery_nominal_kwh,usable_kwh=b.battery_usable_kwh,
          initial_soc=b.battery_initial_soc_pct,reserve_soc=b.battery_min_soc_pct,
          charge_kw=b.battery_max_charge_kw,discharge_kw=b.battery_max_discharge_kw,
          round_trip_efficiency=b.battery_round_trip_efficiency,grid_import_kw=b.grid_import_limit_kw,
          grid_export_kw=b.grid_export_limit_kw if b.has_net_metering else 0,
          generator_kw=b.generator_rating_kw if b.has_generator else 0,
          generator_min_minutes=b.generator_min_runtime_min,fuel_l_kwh=b.generator_fuel_consumption_l_per_kwh)
        if options.use_generator and plant.generator_kw<=0: raise ValueError('Configure an enabled generator with positive rating first')
        demand,critical=load_profiles(loads['items'])
        profile=pv['profile'].model_dump()
        solar=[p['ac_kw'] for p in profile['timeline'] for _ in range(4)]
        result=simulate(plant,demand,critical,solar,options)
    except ValueError as e: raise HTTPException(422,str(e)) from e
    return dict(plant=plant.model_dump(),appliances=loads['items'],pv=profile,options=options.model_dump()),result

@router.post('/{building_id}/simulations',status_code=201)
async def run_simulation(building_id:str,options:SimulationInput,user:User=Depends(get_current_user),db:AsyncSession=Depends(get_db)):
    snapshot,result=await calculate(building_id,options,user,db)
    run=SimulationRun(building_id=building_id,snapshot=snapshot,result=result)
    db.add(run);await db.commit();await db.refresh(run)
    return dict(id=run.id,created_at=run.created_at,snapshot=run.snapshot,result=run.result)

@router.get('/{building_id}/simulations')
async def list_runs(building_id:str,user:User=Depends(get_current_user),db:AsyncSession=Depends(get_db)):
    await get_building(building_id,user,db)
    runs=(await db.execute(select(SimulationRun).where(SimulationRun.building_id==building_id).order_by(SimulationRun.created_at.desc()).limit(20))).scalars().all()
    return [dict(id=r.id,created_at=r.created_at,summary=r.result['summary']) for r in runs]

@router.get('/{building_id}/simulations/{run_id}')
async def read_run(building_id:str,run_id:str,user:User=Depends(get_current_user),db:AsyncSession=Depends(get_db)):
    await get_building(building_id,user,db)
    run=await db.get(SimulationRun,run_id)
    if not run or run.building_id!=building_id:raise HTTPException(404,'Simulation not found in this building')
    return dict(id=run.id,created_at=run.created_at,snapshot=run.snapshot,result=run.result)
