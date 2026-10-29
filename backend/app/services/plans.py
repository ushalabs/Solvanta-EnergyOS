import copy,math
from .simulation import simulate,load_profiles
from ..schemas.simulation import Plant,SimulationInput

def execute_snapshot(snapshot):
 p=Plant(**snapshot['plant']);d,c=load_profiles(snapshot['appliances']);pv=[v['ac_kw'] for v in snapshot['pv']['timeline'] for _ in range(4)]
 return simulate(p,d,c,pv,SimulationInput(**snapshot['options']),protect_critical=True)

def variants(snapshot):
 proposals=[]
 for index,name in enumerate(['Current configuration','Battery capacity +50%','PV capacity +25%']):
  s=copy.deepcopy(snapshot)
  if index==1:
   s['plant']['nominal_kwh']*=1.5;s['plant']['usable_kwh']*=1.5
  if index==2:
   for v in s['pv']['timeline']:
    v['ac_kw']=min(s['pv']['inverter_kw'],v['ac_kw']*1.25)
    if 'dc_kw' in v:v['dc_kw']*=1.25
    if 'energy_kwh' in v:v['energy_kwh']=v['ac_kw']*v.get('duration_hours',1)
   for key in ['dc_capacity_kwp','dc_ac_ratio']:
    if key in s['pv']:s['pv'][key]*=1.25
   if 'daily_energy_kwh' in s['pv']:s['pv']['daily_energy_kwh']=sum(v.get('energy_kwh',v['ac_kw']) for v in s['pv']['timeline'])
   s['pv']['source']+='; hypothetical 25% PV expansion, clipped to existing inverter'
  result=execute_snapshot(s)
  proposals.append(dict(index=index,name=name,snapshot=s,summary=result['summary'],tradeoff=['Existing equipment assumptions retained','Larger hypothetical battery; power limits unchanged; installation and cost not assessed','Hypothetical added PV; roof feasibility and cost require a new design assessment'][index]))
 return proposals

def verify_result(snapshot,result):
 errors=[];p=Plant(**snapshot['plant']);eta=math.sqrt(p.round_trip_efficiency);floor=max(p.nominal_kwh-p.usable_kwh,p.nominal_kwh*p.reserve_soc/100)
 expected=execute_snapshot(snapshot)
 if result!=expected:errors.append('Replay differs from immutable approved inputs')
 trace=result.get('trace',[])
 if len(trace)!=96:return ['Expected 96 intervals']
 previous=p.nominal_kwh*p.initial_soc/100
 for row in trace:
  if not all(isinstance(row.get(k),(int,float)) and math.isfinite(row[k]) for k in ['battery_end_kwh','charge_kw','discharge_kw','load_kw','pv_kw','grid_import_kw','grid_export_kw','generator_kw','unmet_kw','curtailed_kw']):
   errors.append('Nonfinite or missing physical value');break
  e=row['battery_end_kwh'];charge=row['charge_kw'];discharge=row['discharge_kw']
  if e<floor-1e-7 or e>p.nominal_kwh+1e-7:errors.append('Battery bounds violated')
  if charge<0 or discharge<0 or charge>p.charge_kw+1e-7 or discharge>p.discharge_kw+1e-7 or charge*discharge>1e-8:errors.append('Battery power violated')
  if abs(e-previous-.25*(charge*eta-discharge/eta))>1e-7:errors.append('Battery energy recurrence violated')
  incoming=row['pv_kw']+row['grid_import_kw']+row['generator_kw']+discharge
  outgoing=row['load_kw']-row['unmet_kw']+charge+row['grid_export_kw']+row['curtailed_kw']
  if abs(incoming-outgoing)>1e-7:errors.append('AC conservation violated')
  previous=e
 return sorted(set(errors))
