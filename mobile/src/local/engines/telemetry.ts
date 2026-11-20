// SIMULATED telemetry and residual anomaly detection. Port of backend/app/services/telemetry.py.
import type { SimulationResult } from './simulation';

/**
 * Python's random.Random (MT19937 seeded through init_by_array), so a seed gives the same
 * synthetic observations as the old backend did.
 */
export class PythonRandom {
  private mt = new Uint32Array(624);
  private index = 624;

  constructor(seed: number) {
    const key: number[] = [];
    let n = Math.abs(Math.trunc(seed));
    do { key.push(n % 0x100000000); n = Math.floor(n / 0x100000000); } while (n > 0);
    this.initByArray(key);
  }

  private static mul(a: number, b: number) {
    return (Math.imul(a, b) >>> 0);
  }

  private initGenrand(s: number) {
    const mt = this.mt;
    mt[0] = s >>> 0;
    for (let i = 1; i < 624; i++) {
      const prev = mt[i - 1] ^ (mt[i - 1] >>> 30);
      mt[i] = (PythonRandom.mul(prev, 1812433253) + i) >>> 0;
    }
    this.index = 624;
  }

  private initByArray(key: number[]) {
    const mt = this.mt;
    this.initGenrand(19650218);
    let i = 1, j = 0;
    for (let k = Math.max(624, key.length); k; k--) {
      const prev = mt[i - 1] ^ (mt[i - 1] >>> 30);
      mt[i] = ((mt[i] ^ PythonRandom.mul(prev, 1664525)) + key[j] + j) >>> 0;
      i++; j++;
      if (i >= 624) { mt[0] = mt[623]; i = 1; }
      if (j >= key.length) j = 0;
    }
    for (let k = 623; k; k--) {
      const prev = mt[i - 1] ^ (mt[i - 1] >>> 30);
      mt[i] = ((mt[i] ^ PythonRandom.mul(prev, 1566083941)) - i) >>> 0;
      i++;
      if (i >= 624) { mt[0] = mt[623]; i = 1; }
    }
    mt[0] = 0x80000000;
  }

  private int32(): number {
    const mt = this.mt;
    if (this.index >= 624) {
      for (let k = 0; k < 624; k++) {
        const y = (mt[k] & 0x80000000) | (mt[(k + 1) % 624] & 0x7fffffff);
        mt[k] = mt[(k + 397) % 624] ^ (y >>> 1) ^ (y & 1 ? 0x9908b0df : 0);
      }
      this.index = 0;
    }
    let y = mt[this.index++];
    y ^= y >>> 11;
    y ^= (y << 7) & 0x9d2c5680;
    y ^= (y << 15) & 0xefc60000;
    y ^= y >>> 18;
    return y >>> 0;
  }

  random(): number {
    const a = this.int32() >>> 5, b = this.int32() >>> 6;
    return (a * 67108864 + b) / 9007199254740992;
  }

  uniform(a: number, b: number): number {
    return a + (b - a) * this.random();
  }
}

export type Sample = { minute: number; pv_kw: number; load_kw: number; soc_pct: number };
export type Fixture = 'none' | 'pv_dropout' | 'battery_drain' | 'load_spike';
export const FIXTURES: Fixture[] = ['none', 'pv_dropout', 'battery_drain', 'load_spike'];
export const TELEMETRY_SOURCE = 'SIMULATED synthetic observations from saved energy trace';

export function simulatedSamples(result: SimulationResult, fixture: string = 'none', seed = 14): Sample[] {
  const rng = new PythonRandom(seed);
  const out: Sample[] = result.trace.map(p => {
    const pv = Math.max(0, p.pv_kw * (1 + rng.uniform(-0.02, 0.02)));
    const load = Math.max(0, p.load_kw * (1 + rng.uniform(-0.02, 0.02)));
    const soc = Math.max(0, Math.min(100, p.soc_pct + rng.uniform(-0.1, 0.1)));
    return { minute: p.minute, pv_kw: pv, load_kw: load, soc_pct: soc };
  });
  if (fixture === 'pv_dropout') {
    let peak = 0;
    out.forEach((s, i) => { if (s.pv_kw > out[peak].pv_kw) peak = i; });
    if (out[peak].pv_kw <= 0.5) throw new Error('PV dropout fixture requires a source run with daytime PV above 0.5 kW');
    for (let i = Math.max(0, peak - 1); i < Math.min(out.length, peak + 3); i++) out[i].pv_kw *= 0.1;
  } else if (fixture === 'battery_drain') {
    if (Math.max(...out.map(p => p.soc_pct)) <= 5) throw new Error('Battery drain fixture requires a source with positive battery state');
    for (let i = 24; i < 28; i++) out[i].soc_pct = Math.max(0, out[i].soc_pct - 15);
  } else if (fixture === 'load_spike') {
    for (let i = 32; i < 36; i++) out[i].load_kw += Math.max(2, out[i].load_kw * 0.5);
  } else if (fixture !== 'none') {
    throw new Error('Unknown simulated fixture');
  }
  return out;
}

const RULES: Array<[string, 'pv_kw' | 'load_kw' | 'soc_pct', number, number, string]> = [
  ['pv_mismatch', 'pv_kw', 0.25, 0.2, 'Possible shade, source loss or sensor mismatch; simulated evidence is not a hardware diagnosis'],
  ['load_mismatch', 'load_kw', 0.5, 0.25, 'Possible additional load or measurement mismatch'],
  ['battery_mismatch', 'soc_pct', 5, 0, 'Possible battery capacity/loss mismatch or state-of-charge sensor error'],
];

export function detect(expected: SimulationResult, samples: Sample[]) {
  if (samples.length !== 96 || expected.trace.length !== 96) throw new Error('Expected 96 aligned samples');
  for (const s of samples) {
    const valid = Number.isInteger(s.minute) && s.minute >= 0 && s.minute < 1440
      && [s.pv_kw, s.load_kw, s.soc_pct].every(Number.isFinite) && s.pv_kw >= 0 && s.load_kw >= 0 && s.soc_pct >= 0 && s.soc_pct <= 100;
    if (!valid) throw new Error('Telemetry sample is out of range');
  }
  const incidents = [];
  for (const [code, field, absolute, relative, cause] of RULES) {
    const evidence: Array<{ minute: number; expected: number; observed: number; residual: number; threshold: number; unit: string }> = [];
    for (let i = 0; i < 96; i++) {
      const p = expected.trace[i], o = samples[i];
      if (p.minute !== o.minute) throw new Error('Telemetry timestamps are not aligned');
      const residual = o[field] - p[field];
      const threshold = Math.max(absolute, Math.abs(p[field]) * relative);
      if (Math.abs(residual) > threshold) evidence.push({ minute: p.minute, expected: p[field], observed: o[field], residual, threshold, unit: field === 'soc_pct' ? '%' : 'kW' });
    }
    if (evidence.some((e, i) => i > 0 && e.minute - evidence[i - 1].minute === 15)) {
      incidents.push({ code, severity: 'warning', source: 'SIMULATED', possible_cause: cause, evidence, state: 'OPEN', automation_event_id: null as string | null, verifications: [] as any[] });
    }
  }
  return incidents;
}
