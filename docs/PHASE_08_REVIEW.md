# Phase 8 — Baseline forecasts and shortage projection

Authenticated forecast endpoint accepts the same outage and generator policy as simulation. Configured and saved-run providers supply load, critical demand and PV profiles through a shared provider interface. Latest-run persistence repeats the previous simulated daily profiles and starts the battery at that run's final SoC. When no run exists, the API explicitly falls back to configured profiles. No live weather provider is installed; its replacement must supply profiles with their source declared.

Forecasts identify their source run, PV provenance, method, time basis and generation time. The deterministic simulator projects first shortage, minimum SoC, unmet and critical unmet kWh. The mobile simulation screen displays these results and a PV/load forecast chart. Changing the source, outages or generator assumption requires a new projection.

No observed telemetry dataset exists. Simulated runs are not independent observations, so observed sample count is zero; model training, MAE, RMSE and a chronological evaluation split are explicitly unavailable. This is a representative daily scenario, not a dated weather prediction. Forecasts are calculated on demand; the source simulation remains stored and immutable.

Phase-end verification: full backend suite 50 passed; mobile suite 29 passed; TypeScript clean; SDK 58 web export succeeded for 14 routes. Native device UI interaction is not claimed.
