"""AC-bus energy balance, quarter-hour means; no physical control."""
import math
from ..schemas.simulation import Plant, SimulationInput

def simulate(plant: Plant, demand: list[float], critical: list[float], pv: list[float], options: SimulationInput, protect_critical: bool = False):
    if any(len(v)!=96 for v in (demand,critical,pv)):
        raise ValueError('Expected 96 quarter-hour values')
    if any(not math.isfinite(x) or x<0 for v in (demand,critical,pv) for x in v):
        raise ValueError('Profiles must be finite and non-negative')
    if any(c>d+1e-9 for c,d in zip(critical,demand)): raise ValueError('Critical demand exceeds total demand')
    dt=.25; eta=math.sqrt(plant.round_trip_efficiency)
    energy=plant.nominal_kwh*plant.initial_soc/100
    floor=max(plant.nominal_kwh-plant.usable_kwh,plant.nominal_kwh*plant.reserve_soc/100)
    future_need=[0.0]*97
    for j in range(95,-1,-1):
        online=not any(o.start_min<=j*15<o.end_min for o in options.outages)
        assured=pv[j]+(plant.grid_import_kw if online else 0)
        future_need[j]=future_need[j+1]+max(0,critical[j]-assured)*dt/eta
    gen_until=0; trace=[]
    for i,(load,crit,solar) in enumerate(zip(demand,critical,pv)):
        minute=i*15; available=not any(o.start_min<=minute<o.end_min for o in options.outages)
        before=energy
        deficit=max(0,load-solar)
        grid=min(deficit,plant.grid_import_kw) if available else 0
        deficit-=grid
        discharge=min(deficit,plant.discharge_kw,max(0,energy-floor)*eta/dt)
        unrestricted=discharge
        if protect_critical:
            critical_deficit=max(0,crit-solar-grid)
            critical_discharge=min(discharge,critical_deficit)
            free_energy=max(0,energy-floor-critical_discharge*dt/eta-future_need[i+1])
            discharge=critical_discharge+min(max(0,discharge-critical_discharge),free_energy*eta/dt)
        reason='Preserve battery for future critical deficit; defer noncritical service' if discharge<unrestricted-1e-9 else 'Serve demand within source and battery constraints'
        energy-=discharge*dt/eta;deficit-=discharge
        if options.use_generator and plant.generator_kw>0 and deficit>1e-9:
            gen_until=max(gen_until,minute+max(15,plant.generator_min_minutes))
        generator=plant.generator_kw if options.use_generator and minute<gen_until else 0
        surplus=max(0,solar+grid+discharge+generator-load)
        charge=min(surplus,plant.charge_kw,max(0,plant.nominal_kwh-energy)/eta/dt) if discharge<=1e-9 else 0
        energy+=charge*dt*eta;surplus-=charge
        export=min(surplus,plant.grid_export_kw) if available else 0
        curtailed=surplus-export
        unmet=max(0,load-solar-grid-discharge-generator)
        served=load-unmet
        unserved_critical=max(0,crit-served)
        residual=solar+grid+discharge+generator-(served+charge+export+curtailed)
        trace.append(dict(minute=minute,duration_hours=dt,pv_kw=solar,load_kw=load,critical_kw=crit,
            grid_available=available,grid_import_kw=grid,grid_export_kw=export,generator_kw=generator,
            charge_kw=charge,discharge_kw=discharge,curtailed_kw=curtailed,unmet_kw=unmet,
            unserved_critical_kw=unserved_critical,battery_start_kwh=before,battery_end_kwh=energy,
            protected_future_kwh=future_need[i+1] if protect_critical else 0,dispatch_reason=reason,
            soc_pct=100*energy/plant.nominal_kwh if plant.nominal_kwh else 0,balance_error_kw=residual))
    def total(key):return sum(t[key]*dt for t in trace)
    return dict(schema_version='energy-trace-v1',step_minutes=15,trace=trace,
        summary=dict(load_kwh=total('load_kw'),pv_kwh=total('pv_kw'),grid_import_kwh=total('grid_import_kw'),
          grid_export_kwh=total('grid_export_kw'),generator_kwh=total('generator_kw'),
          generator_fuel_l=total('generator_kw')*plant.fuel_l_kwh,unmet_kwh=total('unmet_kw'),
          unserved_critical_kwh=total('unserved_critical_kw'),curtailed_kwh=total('curtailed_kw'),
          final_soc_pct=trace[-1]['soc_pct'],generator_remaining_minutes=max(0,gen_until-1440)),
        assumptions=['Quarter-hour mean AC powers; battery efficiency split equally between charge/discharge.',
          ('Critical reserve heuristic: preserve battery for remaining critical deficit; PV, grid, battery, generator dispatch.' if protect_critical else 'Fixed baseline order: PV, grid, battery, generator. Critical demand served first for unmet-energy accounting.'),
          'Selected appliances run continuously from earliest start for required runtime; no scheduling optimization.',
          'PV uses representative solar-hour profile as a scenario assumption, not a dated weather forecast.'])

def load_profiles(items):
    demand=[0.0]*96;critical=[0.0]*96
    for a in items:
        if not a['selected']:continue
        start=a['earliest_min'];end=start+a['required_runtime_min']
        for i in range(96):
            overlap=max(0,min(end,i*15+15)-max(start,i*15))
            power=a['rated_power_w']/1000*overlap/15
            demand[i]+=power
            if a['critical']:critical[i]+=power
    return demand,critical
