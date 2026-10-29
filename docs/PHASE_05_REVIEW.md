# Phase 5 — PV sizing and generation

The PV design uses the current saved roof layout's panel count and user-supplied module rating to calculate DC kWp and DC/AC ratio. A typed 24-hour profile is available through authenticated preview, save, and retrieve routes. Saved assumptions are recomputed against the latest roof geometry when read.

Blank irradiance uses a clearly labelled synthetic equinox solar day in local solar hours. Optional 24 hourly plane-of-array irradiance values can be supplied; the backend applies PVWatts-style DC power, temperature coefficient, declared system losses, inverter efficiency, and AC rating cap. It does not treat the synthetic profile as actual weather or a dated forecast. Optional string voltage validation checks reference Voc/Vmp and MPPT limits, with a clear warning that cold/hot corrections and current limits remain for engineering review.

Reference formula: [NREL PVWatts v5](https://pvwatts.nrel.gov/downloads/pvwattsv5.pdf). The synthetic irradiance profile is an internal deterministic assumption, not an NREL weather feed.

Phase-end checks: 33 backend tests including isolated migration downgrade/upgrade, 27 mobile tests, clean TypeScript, web static export with 14 routes. Native phone rendering and actual weather are not claimed.
