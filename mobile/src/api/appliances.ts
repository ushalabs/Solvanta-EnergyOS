export type ApplianceInput = {
 name: string; rated_power_w: number; priority: 'critical' | 'medium' | 'low'; critical: boolean; flexible: boolean;
 required_runtime_min: number; earliest_min: number; latest_min: number; interruptible: boolean; max_interruptions: number;
};
export type Appliance = ApplianceInput & { id: string; building_id: string; selected: boolean };
export type ApplianceList = { items: Appliance[]; summary: { requested_kw: number; critical_kw: number; selected_count: number }; disclaimer: string };
export const emptyAppliance = (): ApplianceInput => ({ name: '', rated_power_w: 100, priority: 'medium', critical: false, flexible: false,
 required_runtime_min: 60, earliest_min: 0, latest_min: 1440, interruptible: false, max_interruptions: 0 });
export function validateAppliance(a: ApplianceInput): string | null {
 if (!a.name.trim()) return 'Enter an appliance name.';
 if ([a.rated_power_w,a.required_runtime_min,a.earliest_min,a.latest_min,a.max_interruptions].some(v=>!Number.isFinite(v))) return 'Enter valid numbers in all numeric fields.';
 if (![a.required_runtime_min,a.earliest_min,a.latest_min,a.max_interruptions].every(Number.isInteger)) return 'Time and interruption values must be whole minutes or counts.';
 if (!(a.rated_power_w > 0 && a.rated_power_w <= 100000)) return 'Rated power must be 0–100,000 W, excluding zero.';
 if (!(a.earliest_min >= 0 && a.latest_min <= 1440 && a.latest_min > a.earliest_min)) return 'Enter a valid time window in minutes (00:00–24:00).';
 if (!(a.required_runtime_min > 0 && a.required_runtime_min <= a.latest_min - a.earliest_min)) return 'Required runtime must fit the time window.';
 if (a.critical && a.priority !== 'critical') return 'Critical loads need critical priority.';
 if (a.interruptible && !a.flexible) return 'Interruptible loads must be flexible.';
 if (!a.interruptible && a.max_interruptions) return 'Only interruptible loads may have interruptions.';
 if (a.max_interruptions < 0 || a.max_interruptions > 50) return 'Maximum interruptions must be 0-50.';
 return null;
}
