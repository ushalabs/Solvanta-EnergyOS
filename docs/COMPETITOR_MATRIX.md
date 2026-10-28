# Solvanta — Comparative Market & Literature Study (15 Systems)

This document provides a comprehensive comparative analysis of **15 relevant commercial, open-source, and academic energy systems** to position Solvanta's technical contribution and defend its academic novelty.

---

## 1. Evaluation Dimensions

1. **Category:** Primary nature of the system (Hardware Ecosystem, PV CAD, Smart Panel, HEMS, Simulation Engine).
2. **Rooftop & PV Modeling:** Ability to calculate roof area, obstacle setbacks, panel placement, and generation profiles.
3. **Appliance Digital Twin:** Modeling individual appliance power, priority tiers, runtime requirements, and flexibility.
4. **Outage Simulation:** Modeling discrete-time battery depletion and critical coverage during grid loss.
5. **Constrained Scheduling:** Automated optimization of flexible loads against solar surplus and battery reserve limits.
6. **Explainable Approval:** Presenting human-readable tradeoffs and requiring explicit human authorization before execution.
7. **AI & MCP Protocols:** Native support for Model Context Protocol (MCP) or LLM tool-calling architectures.
8. **Primary Limitation Relative to Solvanta:** Where the existing system does not address Solvanta's unified resilience decision loop.

---

## 2. 15-System Comparative Matrix

| # | System / Product | Primary Category | Roof / PV Modeling | Appliance Twin | Outage Sim | Constrained Scheduling | Explainable Approval | AI / MCP Native | Key Limitation vs Solvanta |
|:---:|---|---|:---:|:---:|:---:|:---:|:---:|:---:|---|
| **01** | **Tesla Powerwall / Energy App** | Hardware HEMS | ❌ No | ❌ (Aggregate only) | ⚠️ Basic (Storm Watch reserve) | ⚠️ (Time-of-Use rate optimization) | ❌ Auto only | ❌ No | Proprietary hardware lock-in; no individual appliance modeling; no what-if outage simulation. |
| **02** | **Enphase Enlighten / IQ** | Hardware Microinverter Ecosystem | ❌ No (Installer CAD separate) | ⚠️ Basic (Circuit level with Load Controller) | ⚠️ Basic (Sunlight Jump) | ⚠️ Rule-based shedding | ❌ No | ❌ No | Focuses on microinverter telemetry; lacks load-level constraint optimization and interactive pre-design twin. |
| **03** | **SolarEdge ONE** | Inverter & Battery Ecosystem | ❌ No | ⚠️ (Smart switches only) | ⚠️ Basic | ⚠️ Heuristic TOU shifting | ❌ No | ❌ No | Requires SolarEdge ecosystem hardware; does not simulate what-if building configurations. |
| **04** | **Schneider Electric Home / Insight** | Commercial / Resi Electrical Infrastructure | ❌ No | ⚠️ (Requires Square D Smart Breaker Panel) | ⚠️ Basic | ⚠️ Threshold-based shedding | ❌ No | ❌ No | Heavy hardware investment (smart breakers); no CV rooftop design or MCP tools. |
| **05** | **Huawei FusionSolar** | Commercial / Resi Solar Hardware | ❌ No | ❌ Aggregate only | ⚠️ Basic backup reserve | ⚠️ Battery charge/discharge rule | ❌ No | ❌ No | Cloud inverter portal; no appliance flexibility models or outage resilience optimization. |
| **06** | **GivEnergy / Giv-Back** | Battery Storage Ecosystem | ❌ No | ❌ Aggregate only | ⚠️ Static reserve | ⚠️ Time-of-use discharge | ❌ No | ❌ No | Focused on battery arbitrage; no appliance scheduling or decision explainability. |
| **07** | **Victron Energy VRM / Cerbo GX** | Off-Grid / Hybrid Marine & Solar OS | ❌ No | ❌ (Sensor inputs only) | ⚠️ Rule-based generator start | ⚠️ Dynamic ESS (Price based) | ❌ No | ❌ No | Highly technical industrial UI; requires Cerbo hardware; lacks mobile-first digital twin and rooftop CV. |
| **08** | **Sunrun Shift** | Solar & Battery Lease Service | ❌ No | ❌ Aggregate only | ⚠️ Basic backup | ⚠️ Fixed profile | ❌ No | ❌ No | Closed utility/lease service; no engineering transparency or user-configurable digital twin. |
| **09** | **SPAN.io Smart Panel** | Smart Hardware Electrical Panel | ❌ No | ✅ Yes (Sub-circuit level) | ✅ Yes (90-day battery estimator) | ⚠️ Circuit priority shedding | ⚠️ Push alert | ❌ No | Requires \$3,500+ physical hardware panel installation; cannot be used as pre-installation software digital twin. |
| **10** | **Home Assistant Energy** | Open-Source Home Automation | ❌ No | ⚠️ Sensor monitoring (if smart plugs exist) | ❌ No outage simulator | ⚠️ User-scripted automations | ❌ Custom dashboards | ⚠️ Basic LLM bridge (Not MCP) | Requires manual YAML scripting and smart plug hardware; lacks engineering physics and optimization solvers. |
| **11** | **Aurora Solar** | Commercial Solar EPC CAD | ✅ Advanced 3D CAD | ❌ No appliance twin | ❌ No operational outage sim | ❌ No | ❌ No | ❌ No | EPC sales/proposal tool only; ceases relevance once system is installed; no operational decision support. |
| **12** | **HelioScope** | Commercial PV Design Software | ✅ Advanced 2D CAD & Shade | ❌ No | ❌ No | ❌ No | ❌ No | ❌ No | PV yield CAD tool for engineers; zero load-level appliance modeling or backup resilience workflows. |
| **13** | **SAM (NREL System Advisor Model)** | Government Research Engine | ⚠️ Complex tabular input | ⚠️ Hourly building load file | ⚠️ Batch simulation | ⚠️ Linear program dispatch | ❌ Research report only | ❌ No | Desktop scientific calculator; not accessible for homeowners/installers; no mobile interface or live workflows. |
| **14** | **pvlib-python / OpenEMPS** | Academic Python Library | ⚠️ Math functions only | ❌ No | ⚠️ Raw math equations | ❌ No solver | ❌ No | ❌ No | Headless Python code libraries; requires engineering developers to build user-facing software. |
| **15** | **OpenHAB Smart Home** | Open-Source Smart Home OS | ❌ No | ⚠️ Device bindings | ❌ No energy balance model | ⚠️ Rule DSL | ❌ No | ❌ No | Generic IoT device controller; lacks PV physics, battery degradation, and constraint satisfaction solvers. |
| **--** | **SOLVANTA (This Project)** | **Mobile Building Energy Resilience Digital Twin** | **✅ CV Aerial Polygon & Panel Sizing** | **✅ Appliance Digital Twin with Priority & Flexibility** | **✅ 15-min Deterministic Outage Sim** | **✅ OR-Tools CP-SAT Constrained Scheduler** | **✅ Explicit Plan State Machine (Approve/Reject)** | **✅ Official Python MCP SDK (9 Tools)** | **Software-first, hardware-agnostic decision twin spanning pre-installation design through operational resilience.** |

---

## 3. Academic Defense Synthesis

Solvanta's distinction does not rely on claiming that other systems have zero battery monitoring or CAD features. Rather, its unique contribution lies in the **unbroken, software-first resilience decision loop**:

1. **Pre-Hardware Accessibility:** Systems like SPAN and Schneider require expensive physical hardware before providing load-level insight. Solvanta provides a software digital twin *before* installation.
2. **Unified Lifecycle Bridge:** Aurora/HelioScope stop at PV design; Tesla/Enphase start after hardware installation. Solvanta unifies rooftop design with operational outage simulation.
3. **Rigorous Constraint Optimization vs Heuristic Shedding:** While existing HEMS use naive threshold triggers, Solvanta formulates appliance scheduling using discrete constraint satisfaction (OR-Tools CP-SAT).
4. **Explainable Human-in-the-Loop Governance:** Autonomous circuit switching is dangerous. Solvanta enforces an auditable human approval state machine (`DRAFT` $\to$ `PENDING` $\to$ `APPROVED` $\to$ `SIMULATED`).
5. **Modern AI Interoperability:** Solvanta is designed from the ground up with the official **Model Context Protocol (MCP)**, allowing external AI assistants to safely query verified engineering engines.
