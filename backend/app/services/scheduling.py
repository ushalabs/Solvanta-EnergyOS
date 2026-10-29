import math
from ortools.sat.python import cp_model

WEIGHTS={'critical':10,'medium':3,'low':1}

def validate_schedule(items,budget,entries):
    selected={a['id']:a for a in items if a['selected']}
    if {e['appliance_id'] for e in entries}!=set(selected) or len(entries)!=len(selected):
        raise ValueError('Schedule must contain every selected appliance exactly once')
    power=[0.0]*1440
    for e in entries:
        a=selected[e['appliance_id']];minutes=[]
        for segment in e['segments']:
            start,end=segment['start_min'],segment['end_min']
            if not isinstance(start,int) or not isinstance(end,int) or not a['earliest_min']<=start<end<=a['latest_min']:
                raise ValueError('Segment outside appliance window')
            minutes.extend(range(start,end))
        if len(minutes)!=len(set(minutes)) or len(minutes)!=a['required_runtime_min']:raise ValueError('Runtime or overlap violation')
        minutes.sort()
        starts=sum(i==0 or minute!=minutes[i-1]+1 for i,minute in enumerate(minutes))
        if not a['interruptible'] and starts!=1:raise ValueError('Noninterruptible load was split')
        if starts>1+a['max_interruptions']:raise ValueError('Too many interruptions')
        if not a['flexible'] and minutes!=list(range(a['earliest_min'],a['earliest_min']+a['required_runtime_min'])):raise ValueError('Fixed load moved')
        for minute in minutes:power[minute]+=a['rated_power_w']
    if any(p>b+1e-8 for p,b in zip(power,budget)):raise ValueError('Source power budget exceeded')
    return power

def solve_schedule(items,budget):
    if len(budget)!=1440 or any(not math.isfinite(v) or v<0 for v in budget):raise ValueError('Expected 1440 finite nonnegative power budgets')
    appliances=[a for a in items if a['selected']]
    if len(appliances)>20:raise ValueError('Prototype scheduler supports at most 20 selected appliances')
    model=cp_model.CpModel();variables={};terms=[];columns=[[] for _ in range(1440)]
    for a in appliances:
        start,end=a['earliest_min'],a['latest_min'];count=a['required_runtime_min'];prev=0;starts=[];xs=[]
        for minute in range(start,end):
            x=model.new_bool_var(f"{a['id']}_{minute}");variables[a['id'],minute]=x;xs.append(x)
            rising=model.new_bool_var(f"start_{a['id']}_{minute}")
            model.add(rising>=x-prev);model.add(rising<=x);model.add(rising<=1-prev);starts.append(rising);prev=x
            if not a['flexible']:model.add(x==int(minute<start+count))
            columns[minute].append(math.ceil(a['rated_power_w'])*x)
            terms.append(WEIGHTS[a['priority']]*(minute-start)*x)
        model.add(sum(xs)==count)
        model.add(sum(starts)<=1+(a['max_interruptions'] if a['interruptible'] else 0))
    for minute in range(1440):model.add(sum(columns[minute])<=math.floor(budget[minute]+1e-9))
    model.minimize(sum(terms));solver=cp_model.CpSolver();solver.parameters.max_time_in_seconds=5;solver.parameters.num_search_workers=1;solver.parameters.random_seed=7
    status=solver.solve(model);name=solver.status_name(status)
    if status not in (cp_model.OPTIMAL,cp_model.FEASIBLE):
        reasons=[]
        for a in appliances:
            available=sum(budget[m]>=math.ceil(a['rated_power_w']) for m in range(a['earliest_min'],a['latest_min']))
            if available<a['required_runtime_min']:reasons.append(f"{a['name']}: only {available} eligible minutes for {a['required_runtime_min']} required")
        return dict(status=name,validated=False,entries=[],reasons=reasons or ['Combined power, windows or continuity constraints cannot all be satisfied.' if status==cp_model.INFEASIBLE else 'Search time limit reached; feasibility is unresolved.'])
    entries=[]
    for a in appliances:
        active=[m for m in range(a['earliest_min'],a['latest_min']) if solver.value(variables[a['id'],m])];segments=[]
        for minute in active:
            if segments and segments[-1]['end_min']==minute:segments[-1]['end_min']=minute+1
            else:segments.append(dict(start_min=minute,end_min=minute+1))
        entries.append(dict(appliance_id=a['id'],name=a['name'],priority=a['priority'],rated_power_w=a['rated_power_w'],segments=segments))
    power=validate_schedule(items,budget,entries)
    return dict(status=name,validated=True,entries=entries,reasons=[],objective=solver.objective_value,
      objective_description='Minimize priority-weighted delay of each required minute; all selected loads must complete.',
      demand_kwh=sum(power)/60000,budget_kwh=sum(budget)/60000,
      timeline=[dict(minute=i*15,load_kw=sum(power[i*15:i*15+15])/15000,available_kw=sum(budget[i*15:i*15+15])/15000) for i in range(96)])
