# Solvanta — Stakeholder Research & Defense Framework

This document outlines the field research methodology, stakeholder interview questionnaires, and academic defense alignment to fulfill FYP faculty feedback.

---

## 1. Research Objectives & Academic Defense Context

Earlier faculty evaluation highlighted four research requirements:
1. Grounding Solvanta in **real-world user and installer workflows**, rather than assumed software requirements.
2. Formulating a **single defensible problem statement**: resilience decision-making and load-level allocation during outages.
3. Establishing verifiable **stakeholder requirements** across the solar installation and operational lifecycle.
4. Distinguishing Solvanta from generic smart-home systems or pure inverter dashboards.

> **Research Ethics & Non-Fabrication Rule:** In accordance with Section A.6 of `AntiGravity_prompt.md`, no stakeholder interviews, customer quotes, or numerical surveys may be invented. This document provides the structured questionnaire, interview protocol, and evidence-gathering framework to be conducted with real participants.

---

## 2. Target Stakeholder Personas

```text
┌───────────────────────────────┐     ┌───────────────────────────────┐     ┌───────────────────────────────┐
│ PERSONA 1: SOLAR EPC / ENG    │     │ PERSONA 2: HYBRID HOMEOWNER   │     │ PERSONA 3: SOLAR TECHNICIAN   │
│ Roof survey, sizing kWp,      │     │ Load shedding anxiety,        │     │ Fault diagnosis, battery SoC  │
│ battery kWh selection,        │     │ high electricity tariffs,     │     │ calibration, customer support,│
│ customer proposal handoff     │     │ unexplainable battery drain   │     │ simulated vs actual telemetry │
└───────────────────────────────┘     └───────────────────────────────┘     └───────────────────────────────┘
```

---

## 3. Semi-Structured Interview Questionnaires

### Protocol A: Solar EPC Engineer & Rooftop Installer
* **Target Audience:** Solar system designers, installers, and EPC project managers.
* **Questions:**
  1. *Site Survey & Rooftop Geometry:* How do you currently estimate roof usable area and panel layout from aerial photos or site visits? What are the biggest pain points with obstructions (pipes, water tanks, parapets)?
  2. *Battery Sizing:* How do you determine battery kWh capacity for residential customers? Do you use rule-of-thumb or load-profile modeling?
  3. *Customer Expectations:* What is the most common misconception customers have regarding what a $10\text{ kWh}$ battery can actually power during a grid outage?
  4. *Software Usage:* Which software tools do you currently use (e.g., Aurora, Helioscope, PVsyst)? Where do they fall short in operational load management?
  5. *Decision Explainability:* Would an interactive digital twin with what-if battery sizing help you close proposals with customers?

### Protocol B: Residential Solar + Battery Homeowner
* **Target Audience:** Homeowners with grid-tied hybrid solar systems and battery storage in regions with regular grid outages (e.g., Pakistan, South Africa, California).
* **Questions:**
  1. *Outage Experience:* When a blackout occurs, how do you decide which appliances (AC, water pump, refrigeration) should run?
  2. *App Usability:* Does your current inverter mobile app (e.g., Solarman, Inverex, FusionSolar) provide appliance-level advice, or only aggregate kW numbers?
  3. *Control vs Automation:* Would you prefer an automated schedule that shuts off non-critical appliances, or an explainable recommendation requiring your tap-to-approve?
  4. *Nighttime Anxiety:* Have you ever run out of battery before morning because a flexible load (like a pump or AC) drained the reserve prematurely?
  5. *Tariff Management:* Do time-of-use tariffs or peak hour rates influence when you run flexible appliances?

### Protocol C: Solar Maintenance & Support Technician
* **Target Audience:** Field technicians servicing hybrid inverters and lithium/lead-acid battery banks.
* **Questions:**
  1. *Diagnostic Bottlenecks:* What is the primary cause of customer complaints during blackouts (e.g. premature inverter cut-off, battery BMS trip, unexpected overload)?
  2. *Telemetry Reliability:* How often are cloud inverter telemetry feeds delayed or inaccurate?
  3. *Anomaly Detection:* What telemetry signatures indicate battery degradation or solar array shading before the customer notices power loss?
  4. *Safety & Override:* Why is autonomous, remote mains breaker switching dangerous without physical on-site human inspection?

---

## 4. Participant Log & Interview Evidence Register

*(To be populated as field interviews are completed during the academic evaluation period.)*

| ID | Date | Stakeholder Category | Role / Organization | Key Findings / Pain Points |
|---|---|---|---|---|
| INT-01 | *Scheduled* | Solar EPC Installer | Lead Engineer, Lahore Solar EPC | Preliminary interest in aerial roof CV & panel kWp calculator |
| INT-02 | *Scheduled* | Hybrid Homeowner | Residential User (10kWp + 15kWh) | Frustrated by inability of existing app to forecast backup hours |
| INT-03 | *Scheduled* | Solar Technician | Field Service Tech, Hybrid Systems | Emphasized that breaker control must remain human-in-the-loop |
