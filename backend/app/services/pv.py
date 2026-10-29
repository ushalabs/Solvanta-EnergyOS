"""Preliminary PV model; synthetic equinox irradiance, no weather claim."""
import math
from ..schemas.pv import PVInput, PVProfile, PVStep

def synthetic_poa(hour: int, data: PVInput) -> float:
    # Midpoint equinox sun vector in east/north/up coordinates, local SOLAR hours.
    h = math.radians(15 * (hour + .5 - 12))
    lat, tilt, azi = map(math.radians, (data.latitude_deg, data.tilt_deg, data.azimuth_deg))
    east, north, up = -math.sin(h), -math.sin(lat)*math.cos(h), math.cos(lat)*math.cos(h)
    if up <= 0:
        return 0.0
    incidence = east*math.sin(tilt)*math.sin(azi) + north*math.sin(tilt)*math.cos(azi) + up*math.cos(tilt)
    # Assumed direct normal 800 W/m² and diffuse horizontal 100*sun altitude.
    return 800*max(0,incidence) + 100*up*(1+math.cos(tilt))/2

def estimate_pv(panel_count: int, data: PVInput) -> PVProfile:
    if panel_count < 0:
        raise ValueError('Panel count must be non-negative')
    kwp = panel_count*data.module_wattage_w/1000
    warnings = ['Preliminary only: no shading, weather, seasonal, wiring-current or structural assessment.']
    if data.string_specs:
        s = data.string_specs
        if panel_count % s.modules_per_string:
            raise ValueError('Placed panel count must divide into complete equal strings')
        if s.modules_per_string*s.module_voc_v > s.inverter_max_dc_v:
            raise ValueError('String open-circuit voltage exceeds inverter DC maximum')
        if not s.mppt_min_v <= s.modules_per_string*s.module_vmp_v <= s.mppt_max_v:
            raise ValueError('String operating voltage is outside the MPPT range')
        warnings.append('String voltages checked at supplied reference values only; cold Voc, hot Vmp and current limits require engineering review.')
    else:
        warnings.append('String constraints not checked: equipment voltage specifications were not supplied.')
    if kwp/data.inverter_kw > 1.5:
        warnings.append('DC/AC ratio exceeds 1.5; inverter clipping may be substantial.')
    timeline=[]
    for hour in range(24):
        poa = data.poa_w_m2[hour] if data.poa_w_m2 is not None else synthetic_poa(hour,data)
        dc = max(0,kwp*poa/1000*(1+data.temperature_coefficient_per_c*(data.cell_temperature_c-25))*(1-data.losses_pct/100))
        ac = min(data.inverter_kw,dc*data.inverter_efficiency_pct/100)
        timeline.append(PVStep(hour=hour,duration_hours=1,poa_w_m2=round(poa,5),dc_kw=round(dc,6),ac_kw=round(ac,6),energy_kwh=round(ac,6)))
    return PVProfile(source='user supplied hourly plane-of-array irradiance' if data.poa_w_m2 is not None else 'SIMULATED fixed equinox irradiance',
        panel_count=panel_count,dc_capacity_kwp=kwp,inverter_kw=data.inverter_kw,dc_ac_ratio=kwp/data.inverter_kw,
        daily_energy_kwh=round(sum(p.energy_kwh for p in timeline),6),warnings=warnings,timeline=timeline)
