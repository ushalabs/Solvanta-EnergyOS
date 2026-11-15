from datetime import date, datetime, timezone
from typing import Annotated

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, FiniteFloat, Field
from sqlalchemy.ext.asyncio import AsyncSession

from ....core.config import settings
from ....db.session import get_db
from ....models.user import User
from ...deps import get_current_user
from .buildings import get_building

router = APIRouter()
WEATHER_API_URL = "https://api.weatherapi.com/v1"
City = Annotated[str, Query(min_length=1, max_length=100)]


class CurrentWeather(BaseModel):
    location: str
    condition: str
    temperature_c: FiniteFloat
    humidity_pct: FiniteFloat = Field(ge=0, le=100)
    wind_kph: FiniteFloat = Field(ge=0)
    cloud_cover_pct: FiniteFloat = Field(ge=0, le=100)
    updated_at: datetime


class WeatherDay(BaseModel):
    date: date
    condition: str
    min_c: FiniteFloat
    max_c: FiniteFloat
    rain_chance_pct: FiniteFloat = Field(ge=0, le=100)


class WeatherForecast(BaseModel):
    current: CurrentWeather
    days: list[WeatherDay] = Field(min_length=1, max_length=3)


class SolarDay(BaseModel):
    date: date
    energy_kwh: FiniteFloat = Field(ge=0)
    peak_power_kw: FiniteFloat = Field(ge=0)


class SolarForecast(BaseModel):
    location: str
    capacity_kwp: FiniteFloat = Field(gt=0)
    days: list[SolarDay] = Field(min_length=1, max_length=3)


async def fetch_weather(endpoint: str, city: str, **parameters) -> dict:
    city = city.strip()
    if not city:
        raise HTTPException(422, "Enter a city for the weather lookup.")

    key = settings.WEATHERAPI_KEY
    if not key or not key.get_secret_value().strip():
        raise HTTPException(503, "Live weather is not configured yet.")

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(
                f"{WEATHER_API_URL}/{endpoint}.json",
                params={"key": key.get_secret_value().strip(), "q": city, **parameters},
            )
        if response.is_error:
            code = response.json().get("error", {}).get("code")
            if code == 1006:
                raise HTTPException(404, "Location not found. Try including the country.")
            if code == 2009 and endpoint == "solar":
                raise HTTPException(503, "Solar forecasts are unavailable on the configured weather plan.")
        response.raise_for_status()
        return response.json()
    except (httpx.HTTPError, ValueError, TypeError, AttributeError):
        # Provider errors can include the request URL and API key.
        raise HTTPException(502, "Weather is temporarily unavailable. Try again later.") from None


def location_name(payload: dict) -> str:
    location = payload["location"]
    return f'{location["name"]}, {location["country"]}'


def read_current(payload: dict) -> CurrentWeather:
    current = payload["current"]
    return CurrentWeather(
        location=location_name(payload),
        condition=current["condition"]["text"],
        temperature_c=current["temp_c"],
        humidity_pct=current["humidity"],
        wind_kph=current["wind_kph"],
        cloud_cover_pct=current["cloud"],
        updated_at=datetime.fromtimestamp(current["last_updated_epoch"], timezone.utc),
    )


@router.get("/current", response_model=CurrentWeather)
async def current_weather(city: City, _user: User = Depends(get_current_user)) -> CurrentWeather:
    payload = await fetch_weather("current", city)
    try:
        return read_current(payload)
    except (KeyError, ValueError, TypeError, OverflowError, OSError):
        raise HTTPException(502, "Weather provider returned incomplete data.") from None


@router.get("/forecast", response_model=WeatherForecast)
async def weather_forecast(city: City, _user: User = Depends(get_current_user)) -> WeatherForecast:
    payload = await fetch_weather("forecast", city, days=3)
    try:
        return WeatherForecast(
            current=read_current(payload),
            days=[
                WeatherDay(
                    date=item["date"], condition=item["day"]["condition"]["text"],
                    min_c=item["day"]["mintemp_c"], max_c=item["day"]["maxtemp_c"],
                    rain_chance_pct=item["day"]["daily_chance_of_rain"],
                )
                for item in payload["forecast"]["forecastday"]
            ],
        )
    except (KeyError, ValueError, TypeError, OverflowError, OSError):
        raise HTTPException(502, "Weather provider returned incomplete forecast data.") from None


@router.get("/solar/{building_id}", response_model=SolarForecast)
async def solar_forecast(
    building_id: str,
    city: City,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SolarForecast:
    building = await get_building(building_id, user, db)
    if building.pv_capacity_kwp <= 0 or building.inverter_rating_kw <= 0:
        raise HTTPException(422, "Save a positive solar capacity and inverter rating in Settings first.")
    payload = await fetch_weather(
        "solar", city, days=3, capacity_kw=building.pv_capacity_kwp,
        tilt=building.pv_panel_tilt_deg, azimuth=building.pv_panel_azimuth_deg % 360,
        losses=building.pv_system_losses_pct, inverter_kw=building.inverter_rating_kw,
        inverter_eff=building.inverter_efficiency_pct,
    )
    try:
        return SolarForecast(
            location=location_name(payload),
            capacity_kwp=building.pv_capacity_kwp,
            days=[
                SolarDay(
                    date=item["date"], energy_kwh=item["day"]["energy_kwh"],
                    peak_power_kw=item["day"]["peak_power_kw"],
                )
                for item in payload["forecast"]["forecastday"]
            ],
        )
    except (KeyError, ValueError, TypeError):
        raise HTTPException(502, "Weather provider returned incomplete solar forecast data.") from None
