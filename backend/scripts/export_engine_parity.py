"""Writes reference outputs of the Python engines for the mobile app's TypeScript port.

Run from backend/:  .venv/Scripts/python scripts/export_engine_parity.py
Output: mobile/__tests__/fixtures/engine_parity.json (checked by mobile/__tests__/local_engine_parity.test.ts).
"""
import json
import random
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.schemas.pv import PVInput  # noqa: E402
from app.schemas.roof import RoofInput  # noqa: E402
from app.schemas.simulation import Plant, SimulationInput  # noqa: E402
from app.services.bill_history import Word, read_table  # noqa: E402
from app.services.forecast import forecast  # noqa: E402
from app.services.geometry import place_panels  # noqa: E402
from app.services.plans import execute_snapshot, variants, verify_result  # noqa: E402
from app.services.pv import estimate_pv  # noqa: E402
from app.services.resilience import compare_resilience  # noqa: E402
from app.services.scheduling import solve_schedule  # noqa: E402
from app.services.simulation import load_profiles, simulate  # noqa: E402
from app.services.telemetry import SimulationProvider, detect  # noqa: E402

OUT = Path(__file__).resolve().parents[2] / "mobile" / "__tests__" / "fixtures" / "engine_parity.json"

PLANT = dict(nominal_kwh=10, usable_kwh=9, initial_soc=70, reserve_soc=20, charge_kw=4, discharge_kw=4,
             round_trip_efficiency=0.9, grid_import_kw=5, grid_export_kw=3, generator_kw=3,
             generator_min_minutes=30, fuel_l_kwh=0.35)


def appliance(id, name, w, priority, earliest, latest, runtime, critical=False, flexible=False, interruptible=False, k=0, selected=True):
    return dict(id=id, name=name, rated_power_w=w, priority=priority, critical=critical, flexible=flexible,
                required_runtime_min=runtime, earliest_min=earliest, latest_min=latest,
                interruptible=interruptible, max_interruptions=k, selected=selected)


APPLIANCES = [
    appliance("fridge", "Fridge", 150, "critical", 0, 1440, 1440, critical=True),
    appliance("lights", "Lights", 300, "critical", 1080, 1440, 300, critical=True),
    appliance("pump", "Water pump", 1100, "medium", 360, 1080, 90, flexible=True, interruptible=True, k=2),
    appliance("iron", "Iron", 1500, "low", 600, 1200, 45, flexible=True),
    appliance("ac", "Air conditioner", 1800, "medium", 720, 1080, 180, flexible=True, interruptible=True, k=3),
    appliance("tv", "TV", 120, "low", 1200, 1380, 120, selected=False),
]

pv_profile = estimate_pv(14, PVInput()).model_dump()
snapshot = dict(plant=PLANT, appliances=APPLIANCES, pv=pv_profile,
                options=dict(outages=[dict(start_min=1020, end_min=1260)], use_generator=False))
gen_snapshot = json.loads(json.dumps(snapshot))
gen_snapshot["options"] = dict(outages=[dict(start_min=0, end_min=360), dict(start_min=1080, end_min=1440)], use_generator=True)


def run_sim(s, protect=False):
    d, c = load_profiles(s["appliances"])
    pv = [p["ac_kw"] for p in s["pv"]["timeline"] for _ in range(4)]
    return simulate(Plant(**s["plant"]), d, c, pv, SimulationInput(**s["options"]), protect_critical=protect)


def budget_for(s):
    opts = SimulationInput(**s["options"])
    return [(s["pv"]["timeline"][m // 60]["ac_kw"] + (0 if any(o.start_min <= m < o.end_min for o in opts.outages) else s["plant"]["grid_import_kw"])) * 1000 for m in range(1440)]


saved = run_sim(snapshot)
schedule_cases = []
for name, items, budget in [
    ("earliest fits", APPLIANCES, budget_for(dict(snapshot, options=dict(outages=[], use_generator=False)))),
    ("outage forces shifting", APPLIANCES, budget_for(snapshot)),
    ("tight solar only", [a for a in APPLIANCES if a["id"] in ("pump", "iron", "ac")], [p["ac_kw"] * 1000 for p in pv_profile["timeline"] for _ in range(60)]),
    ("contention daytime", [
        appliance("ac2", "AC", 1800, "medium", 480, 1080, 180, flexible=True, interruptible=True, k=3),
        appliance("pump2", "Pump", 1100, "medium", 480, 1080, 90, flexible=True, interruptible=True, k=2),
        appliance("iron2", "Iron", 1500, "low", 480, 1080, 45, flexible=True),
        appliance("wash2", "Washer", 900, "medium", 480, 1080, 60, flexible=True),
        appliance("fridge2", "Fridge", 150, "critical", 0, 1440, 1440, critical=True),
    ], [3000.0 if 480 <= m < 1080 else 400.0 for m in range(1440)]),
    ("contention stepped", [
        appliance("k1", "Kettle", 2000, "critical", 420, 600, 20, flexible=True),
        appliance("m1", "Motor", 1700, "medium", 400, 800, 120, flexible=True, interruptible=True, k=1),
        appliance("d1", "Dryer", 1200, "low", 400, 900, 100, flexible=True),
        appliance("h1", "Heater", 800, "medium", 400, 900, 200, flexible=True, interruptible=True, k=4),
    ], [2500.0 if (m // 60) % 2 == 0 else 3200.0 for m in range(1440)]),
    ("impossible", [appliance("big", "Welder", 9000, "low", 600, 700, 60, flexible=True)], [5000.0] * 1440),
]:
    result = solve_schedule(items, budget)
    schedule_cases.append(dict(name=name, items=items, budget=budget, status=result["status"], validated=result["validated"],
                               objective=result.get("objective"), demand_kwh=result.get("demand_kwh")))

roofs = [
    dict(boundary=[dict(x=100, y=100), dict(x=700, y=100), dict(x=700, y=500), dict(x=100, y=500)],
         obstacles=[[dict(x=300, y=200), dict(x=380, y=200), dict(x=380, y=280), dict(x=300, y=280)]],
         scale_points=[dict(x=100, y=100), dict(x=700, y=100)], scale_distance_m=15),
    dict(boundary=[dict(x=50, y=50), dict(x=650, y=50), dict(x=650, y=300), dict(x=350, y=300), dict(x=350, y=600), dict(x=50, y=600)],
         obstacles=[], scale_points=[dict(x=50, y=50), dict(x=650, y=50)], scale_distance_m=18, setback_m=0.7),
    dict(boundary=[dict(x=120, y=80), dict(x=820, y=140), dict(x=760, y=560), dict(x=90, y=480)],
         obstacles=[[dict(x=400, y=250), dict(x=470, y=260), dict(x=455, y=330)]],
         scale_points=[dict(x=120, y=80), dict(x=820, y=140)], scale_distance_m=20, gap_m=0.05),
]

rng = random.Random(14)
words = [Word("Month", 100, 100, 10), Word("Units", 200, 100, 10), Word("Bill", 300, 100, 10)]
for i, (month, units) in enumerate([("Jan-25", "310"), ("Feb 25", "285"), ("Mar", "1,204"), ("Apr-25", "RP 400")]):
    y = 130 + i * 20
    if month == "Mar":
        words += [Word("Mar", 95, y, 10), Word("-", 110, y, 10), Word("25", 120, y, 10)]
    else:
        words.append(Word(month, 100, y, 10))
    words.append(Word(units, 200, y, 10))
    words.append(Word("9999", 300, y, 10))

result = dict(
    python_random=[rng.uniform(-0.02, 0.02) for _ in range(5)] + [random.Random(0).random(), random.Random(123456789).random()],
    snapshot=snapshot,
    gen_snapshot=gen_snapshot,
    simulate_baseline=saved,
    simulate_protect=run_sim(snapshot, True),
    simulate_generator=run_sim(gen_snapshot),
    pv_cases=[
        dict(count=14, input=PVInput().model_dump(), output=pv_profile),
        dict(count=24, input=PVInput(latitude_deg=-12, tilt_deg=10, azimuth_deg=90, inverter_kw=5, losses_pct=20, cell_temperature_c=45,
             string_specs=dict(modules_per_string=12, module_voc_v=49.5, module_vmp_v=41.6, inverter_max_dc_v=1000, mppt_min_v=200, mppt_max_v=850)).model_dump(),
             output=estimate_pv(24, PVInput(latitude_deg=-12, tilt_deg=10, azimuth_deg=90, inverter_kw=5, losses_pct=20, cell_temperature_c=45,
             string_specs=dict(modules_per_string=12, module_voc_v=49.5, module_vmp_v=41.6, inverter_max_dc_v=1000, mppt_min_v=200, mppt_max_v=850))).model_dump()),
    ],
    roof_cases=[dict(input=RoofInput(**r).model_dump(), output=place_panels(RoofInput(**r))) for r in roofs],
    forecast_configured=forecast(snapshot, SimulationInput(**snapshot["options"])),
    forecast_saved=forecast(snapshot, SimulationInput(**snapshot["options"]), saved, "run-1"),
    resilience=compare_resilience(snapshot),
    variants=[{k: v for k, v in item.items() if k != "snapshot"} for item in variants(snapshot)],
    verify_ok=verify_result(snapshot, execute_snapshot(snapshot)),
    telemetry=[dict(fixture=f, samples=(s := SimulationProvider(saved, f, 14).samples()), incidents=detect(saved, s))
               for f in ["none", "pv_dropout", "battery_drain", "load_spike"]],
    schedules=schedule_cases,
    bill_words=[w.__dict__ for w in words],
    bill_readings=read_table(words),
)
OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(json.dumps(result, separators=(",", ":")))
print(f"Wrote {OUT} ({OUT.stat().st_size // 1024} KB)")
