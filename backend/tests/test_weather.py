import httpx
import pytest
from types import SimpleNamespace
from fastapi.testclient import TestClient
from pydantic import SecretStr

from app.api.deps import get_current_user
from app.api.v1.endpoints import weather
from app.main import app

PATH = "/api/v1/weather/current?city=Lahore%2C%20Pakistan"


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setitem(app.dependency_overrides, get_current_user, lambda: object())
    return TestClient(app)


@pytest.fixture
def mock_provider(monkeypatch):
    def configure(handler):
        async_client = httpx.AsyncClient
        monkeypatch.setattr(weather.settings, "WEATHERAPI_KEY", SecretStr("local-test-value"))
        monkeypatch.setattr(
            weather.httpx,
            "AsyncClient",
            lambda **kwargs: async_client(transport=httpx.MockTransport(handler), **kwargs),
        )
    return configure


def test_weather_requires_backend_session():
    assert TestClient(app).get(PATH).status_code == 401


def test_unconfigured_weather_skips_provider(client, monkeypatch):
    def fail_if_called(**kwargs):
        pytest.fail("Weather provider must not be contacted without a key")

    monkeypatch.setattr(weather.settings, "WEATHERAPI_KEY", None)
    monkeypatch.setattr(weather.httpx, "AsyncClient", fail_if_called)
    assert client.get(PATH).status_code == 503


def test_weather_returns_current_conditions(client, mock_provider):
    def provider(request):
        assert request.url.host == "api.weatherapi.com"
        assert request.url.path == "/v1/current.json"
        assert request.url.params["q"] == "Lahore, Pakistan"
        assert request.url.params["key"] == "local-test-value"
        return httpx.Response(200, json={
            "location": {"name": "Lahore", "country": "Pakistan"},
            "current": {
                "condition": {"text": "Partly cloudy"},
                "temp_c": 24,
                "humidity": 55,
                "wind_kph": 8,
                "cloud": 25,
                "last_updated_epoch": 1760000000,
            },
        })

    mock_provider(provider)
    response = client.get(PATH)
    assert response.status_code == 200
    assert response.json() == {
        "location": "Lahore, Pakistan",
        "condition": "Partly cloudy",
        "temperature_c": 24,
        "humidity_pct": 55,
        "wind_kph": 8,
        "cloud_cover_pct": 25,
        "updated_at": "2025-10-09T08:53:20Z",
    }


@pytest.mark.parametrize(("status", "payload", "expected"), [
    (400, {"error": {"code": 1006}}, 404),
    (403, {"error": {"message": "local-test-value"}}, 502),
    (200, {"current": {}}, 502),
])
def test_weather_handles_provider_errors(client, mock_provider, status, payload, expected):
    mock_provider(lambda request: httpx.Response(status, json=payload))
    response = client.get(PATH)
    assert response.status_code == expected
    assert "local-test-value" not in response.text


def test_solar_forecast_uses_saved_equipment(client, mock_provider, monkeypatch):
    async def read_building(building_id, user, db):
        assert building_id == "saved-site"
        return SimpleNamespace(
            pv_capacity_kwp=7.2,
            pv_panel_tilt_deg=25,
            pv_panel_azimuth_deg=360,
            pv_system_losses_pct=12,
            inverter_rating_kw=6,
            inverter_efficiency_pct=97,
        )

    def provider(request):
        assert request.url.path == "/v1/solar.json"
        assert request.url.params["days"] == "3"
        assert float(request.url.params["capacity_kw"]) == 7.2
        assert float(request.url.params["tilt"]) == 25
        assert float(request.url.params["azimuth"]) == 0
        assert float(request.url.params["inverter_kw"]) == 6
        assert float(request.url.params["inverter_eff"]) == 97
        assert float(request.url.params["losses"]) == 12
        return httpx.Response(200, json={
            "location": {"name": "Lahore", "country": "Pakistan"},
            "forecast": {"forecastday": [
                {"date": "2026-11-07", "day": {"energy_kwh": 22.5, "peak_power_kw": 5.1}},
            ]},
        })

    monkeypatch.setitem(app.dependency_overrides, weather.get_db, lambda: object())
    monkeypatch.setattr(weather, "get_building", read_building)
    mock_provider(provider)
    response = client.get("/api/v1/weather/solar/saved-site?city=Lahore")
    assert response.status_code == 200
    assert response.json()["days"] == [
        {"date": "2026-11-07", "energy_kwh": 22.5, "peak_power_kw": 5.1},
    ]
