# Solvanta — Domain Assumptions & Engineering Mathematics

This document formalizes the mathematical equations, physical conservation laws, unit standards, and operational assumptions enforced throughout Solvanta's simulation and optimization engines.

---

## 1. Units, Symbols, and Precision Standards

| Quantity | Symbol | Unit | Engineering Definition |
|---|---|---|---|
| **Power (Instantaneous)** | $P$ | $\text{W}$ / $\text{kW}$ | Rate of energy generation or consumption ($1\text{ kW} = 1000\text{ W}$) |
| **Energy (Integral over time)** | $E$ | $\text{kWh}$ | Energy transferred over interval ($E = \int P(t)\,dt$) |
| **Solar Nameplate Capacity** | $C_{\text{pv}}$ | $\text{kWp}$ | DC peak generation under Standard Test Conditions ($\text{STC}: 1000\text{ W/m}^2, 25^\circ\text{C}$) |
| **Battery Nominal Capacity** | $E_{\text{nom}}$ | $\text{kWh}$ | Total rated chemical storage capacity |
| **Battery Usable Capacity** | $E_{\text{usable}}$ | $\text{kWh}$ | $E_{\text{nom}} \times (SoC_{\text{max}} - SoC_{\text{min}}) / 100$ |
| **State of Charge** | $SoC$ | $\%$ | Usable energy percentage, bounded in $[0, 100]\%$ |
| **Simulation Timestep** | $\Delta t$ | $\text{hours}$ | Default 15 minutes = $0.25\text{ h}$ (96 steps per 24 hours) |

> **Unit Invariant:** In no engine, API response, or UI screen may $\text{kW}$ and $\text{kWh}$ be conflated. Power is an instantaneous rate; energy is cumulative work over a duration.

---

## 2. Sign Conventions

- **Battery Power ($P_{\text{bat}}$):**
  - $P_{\text{bat}} > 0$: **Discharge** (battery supplies power to building loads).
  - $P_{\text{bat}} < 0$: **Charge** (battery absorbs power from solar or grid).
- **Grid Power ($P_{\text{grid}}$):**
  - $P_{\text{grid}} > 0$: **Import** (power drawn from utility grid).
  - $P_{\text{grid}} < 0$: **Export** (surplus power fed back into utility grid).
  - During a designated **grid outage**, $P_{\text{grid}}(t) \equiv 0\text{ kW}$ unconditionally.

---

## 3. Physical Conservation of Energy

For every discrete interval $t \in [0, T]$ of duration $\Delta t$, total supply must equal total consumption plus losses and curtailment:

$$P_{\text{pv}}(t) + P_{\text{grid,in}}(t) + P_{\text{bat,dis}}(t) + P_{\text{gen}}(t) = P_{\text{load,served}}(t) + P_{\text{bat,chg}}(t) + P_{\text{grid,out}}(t) + P_{\text{curtail}}(t) + P_{\text{loss}}(t)$$

Where:
- $P_{\text{pv}}(t) \ge 0$: Solar PV power produced. At night ($G_{\text{irradiance}} = 0$), $P_{\text{pv}}(t) = 0$.
- $P_{\text{bat,dis}}(t) \ge 0$: Battery discharge power, subject to $P_{\text{bat,dis}}(t) \le P_{\text{dis,max}}$.
- $P_{\text{bat,chg}}(t) \ge 0$: Battery charge power, subject to $P_{\text{bat,chg}}(t) \le P_{\text{chg,max}}$.
- $P_{\text{load,served}}(t) \le P_{\text{load,requested}}(t)$: Total served load.
- $P_{\text{unserved}}(t) = P_{\text{load,requested}}(t) - P_{\text{load,served}}(t)$: Load deficit.

---

## 4. Battery State Dynamics

The state of charge at interval $t+1$ evolves from interval $t$:

$$SoC(t+1) = SoC(t) + \left[ \frac{P_{\text{bat,chg}}(t) \cdot \eta_{\text{chg}} - \frac{P_{\text{bat,dis}}(t)}{\eta_{\text{dis}}}}{E_{\text{nom}}} \cdot \Delta t \right] \times 100\%$$

Subject to hard physical bounds:
$$SoC_{\text{min}} \le SoC(t) \le SoC_{\text{max}} \quad \forall t$$

Where:
- $\eta_{\text{chg}} \in (0, 1]$: One-way charge efficiency.
- $\eta_{\text{dis}} \in (0, 1]$: One-way discharge efficiency.
- Round-trip efficiency $\eta_{\text{rt}} = \eta_{\text{chg}} \cdot \eta_{\text{dis}}$ (default $90\%$, so $\eta_{\text{chg}} = \eta_{\text{dis}} \approx \sqrt{0.90} \approx 0.9487$).
- $SoC_{\text{min}}$: Reserve buffer to preserve battery life and emergency resilience (default $20\%$).
- If $SoC(t) = SoC_{\text{min}}$, discharge power $P_{\text{bat,dis}}(t)$ is forced to $0\text{ kW}$. The battery cannot discharge below its reserve.

---

## 5. Photovoltaic Generation Model

Solar output is modeled using panel ratings, temperature degradation, and conversion losses:

$$P_{\text{pv}}(t) = C_{\text{pv}} \times \left( \frac{G(t)}{G_{\text{STC}}} \right) \times \left[ 1 - \gamma \cdot (T_{\text{cell}}(t) - 25^\circ\text{C}) \right] \times \eta_{\text{derate}} \times \eta_{\text{inverter}}$$

Subject to inverter clipping:
$$P_{\text{pv,ac}}(t) = \min\left( P_{\text{pv}}(t), P_{\text{inv,max}} \right)$$

Where:
- $G(t)$: Global horizontal or plane-of-array irradiance ($\text{W/m}^2$).
- $\gamma$: Temperature coefficient of maximum power (default $0.4\% / ^\circ\text{C}$).
- $\eta_{\text{derate}}$: DC system derate factor (soiling, cabling, mismatch; default $0.85$).
- $\eta_{\text{inverter}}$: Inverter DC-to-AC conversion efficiency (default $0.96$).
- $P_{\text{inv,max}}$: Inverter AC nameplate power ($\text{kW}$).

---

## 6. Resilience Metrics & Load Prioritization

### 6.1 Priority Tiers
1. **Critical:** Life safety, refrigeration, emergency communication. Non-sheddable.
2. **High:** Workstations, critical computing, primary task lighting.
3. **Medium:** General lighting, circulation fans, entertainment.
4. **Low / Flexible:** Water pumping, washing machines, EV charging, non-essential HVAC.

### 6.2 Key Quantitative Metrics
- **Critical Load Coverage ($\text{Coverage}_{\text{crit}}$):**
  $$\text{Coverage}_{\text{crit}} = \frac{\sum_{t=1}^{N} E_{\text{crit,served}}(t)}{\sum_{t=1}^{N} E_{\text{crit,requested}}(t)} \times 100\%$$
- **Unserved Critical Energy ($E_{\text{unserved,crit}}$):**
  $$E_{\text{unserved,crit}} = \sum_{t=1}^{N} \max\left( 0, E_{\text{crit,requested}}(t) - E_{\text{crit,served}}(t) \right)$$
- If physical constraints make 100% critical coverage impossible, the engine reports the exact unserved kWh deficit; it never fabricates phantom energy.

---

## 7. FYP-I Explicit Non-Claims & Safety Boundaries

1. **No Automatic Appliance Detection:** Users configure appliances explicitly. Aggregate inverter power cannot isolate individual appliances without specialized circuit-level CT sensors.
2. **Simulation-Driven Only:** Plan approvals re-simulate performance; they do not trigger physical circuit breakers or electrical contactors.
3. **No Unscaled Roof Geometry:** Aerial rooftop photos require a user-confirmed calibration distance before computing physical areas ($m^2$) or panel capacities ($kWp$).
4. **No Inferred Currency Savings:** Savings are computed solely when explicit local utility tariffs are entered.
