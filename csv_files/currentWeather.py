#!/usr/bin/env python3
"""성의고등학교 운동 추천용 OpenWeatherMap 현재 날씨 조회 스크립트.

OpenWeatherMap Current Weather API만 사용해 현재 기상 상태를 조회하고
실내/실외 운동을 추천한다.
"""

from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
from typing import Any

import requests


OWM_BASE_URL = "https://api.openweathermap.org/data/2.5/weather"

def load_env() -> None:
    for env_path in (Path.cwd() / ".env", Path(__file__).resolve().parent.parent / ".env"):
        if not env_path.exists():
            continue

        for raw_line in env_path.read_text(encoding="utf-8").splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue

            key, value = line.split("=", 1)
            os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))
        return


def require_env(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise RuntimeError(f"환경변수 {name} 값이 필요합니다.")
    return value


def get_float_env(name: str) -> float | None:
    raw = os.getenv(name, "").strip()
    if not raw:
        return None
    try:
        return float(raw)
    except ValueError as error:
        raise RuntimeError(f"환경변수 {name}는 숫자여야 합니다. 현재 값: {raw}") from error

def resolve_coordinate(cli_value: float | None, env_name: str, default_value: float) -> float:
    if cli_value is not None:
        return cli_value
    env_value = get_float_env(env_name)
    if env_value is not None:
        return env_value
    return default_value

def get_openweather_now(api_key: str, lat: float, lon: float) -> dict[str, Any]:
    params = {
        "lat": lat,
        "lon": lon,
        "appid": api_key,
        "units": "metric",
        "lang": "kr",
    }

    response = requests.get(OWM_BASE_URL, params=params, timeout=12)
    response.raise_for_status()
    payload = response.json()

    weather_items = payload.get("weather") or []
    main = payload.get("main") or {}
    wind = payload.get("wind") or {}
    rain = payload.get("rain") or {}
    snow = payload.get("snow") or {}

    first_weather = weather_items[0] if weather_items else {}
    return {
        "source": "openweathermap_current",
        "city": payload.get("name"),
        "temp_c": main.get("temp"),
        "feels_like_c": main.get("feels_like"),
        "humidity": main.get("humidity"),
        "wind_speed_mps": wind.get("speed"),
        "weather_id": first_weather.get("id"),
        "weather_main": first_weather.get("main"),
        "weather_description": first_weather.get("description"),
        "rain_1h_mm": rain.get("1h", 0),
        "snow_1h_mm": snow.get("1h", 0),
        "observed_unix": payload.get("dt"),
    }


def generate_indoor_recommendation(reason: str, weather: dict[str, Any]) -> dict[str, Any]:
    return {
        "type": "INDOOR",
        "reason": reason,
        "recommended_activities": ["스쿼트", "런지", "코어 트레이닝", "실내 스트레칭"],
        "camera_coaching_enabled": True,
        "posture_coaching_route": "/coaching/pose",
        "weather": weather,
    }


def generate_outdoor_recommendation(reason: str, weather: dict[str, Any]) -> dict[str, Any]:
    return {
        "type": "OUTDOOR",
        "reason": reason,
        "recommended_activities": ["러닝", "풋살", "농구", "파워 워킹"],
        "camera_coaching_enabled": False,
        "posture_coaching_route": None,
        "weather": weather,
    }

def recommend_exercise(weather: dict[str, Any]) -> dict[str, Any]:
    temp = weather.get("temp_c")
    weather_id = int(weather.get("weather_id") or 800)
    rain_1h = float(weather.get("rain_1h_mm") or 0)
    snow_1h = float(weather.get("snow_1h_mm") or 0)
    wind_speed = float(weather.get("wind_speed_mps") or 0)
    desc = weather.get("weather_description") or "정보 없음"

    if rain_1h > 0 or snow_1h > 0 or weather_id < 700:
        return generate_indoor_recommendation(
            f"강수/강설 기상 조건입니다. 상태={desc}, 강수량={rain_1h}mm, 적설량={snow_1h}mm",
            weather,
        )

    if wind_speed >= 10:
        return generate_indoor_recommendation(
            f"강풍 조건입니다. 풍속={wind_speed}m/s",
            weather,
        )

    if temp is not None and (temp > 33 or temp < -5):
        return generate_indoor_recommendation(f"기온이 극단적입니다. 현재 기온 {temp}도", weather)

    return generate_outdoor_recommendation("야외 운동하기에 무난한 기상 조건입니다.", weather)


def get_live_recommendation(lat: float, lon: float, api_key: str | None = None) -> dict[str, Any]:
    resolved_key = (api_key or "").strip() or require_env("OPENWEATHERMAP_API_KEY")
    weather = get_openweather_now(resolved_key, lat=lat, lon=lon)
    return recommend_exercise(weather)

def get_demo_recommendation() -> dict[str, Any]:
    weather = {
        "source": "openweathermap_current",
        "city": "Seoul",
        "temp_c": 29.5,
        "feels_like_c": 31.0,
        "humidity": 72,
        "wind_speed_mps": 2.8,
        "weather_id": 803,
        "weather_main": "Clouds",
        "weather_description": "튼구름",
        "rain_1h_mm": 0,
        "snow_1h_mm": 0,
        "observed_unix": 1784718000,
    }
    return recommend_exercise(weather)

def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="OpenWeatherMap 기반 현재 날씨 운동 추천")
    parser.add_argument("--demo", action="store_true", help="API 호출 없이 데모 데이터로 테스트")
    parser.add_argument("--lat", type=float, default=None, help="위도 (없으면 WEATHER_LAT 또는 기본값 사용)")
    parser.add_argument("--lon", type=float, default=None, help="경도 (없으면 WEATHER_LON 또는 기본값 사용)")
    parser.add_argument("--api-key", default=None, help="OpenWeatherMap API 키 (없으면 환경변수 사용)")
    return parser.parse_args()

def main() -> int:
    load_env()
    args = parse_args()
    lat = resolve_coordinate(args.lat, "WEATHER_LAT", DEFAULT_LAT)
    lon = resolve_coordinate(args.lon, "WEATHER_LON", DEFAULT_LON)

    try:
        result = get_demo_recommendation() if args.demo else get_live_recommendation(lat, lon, args.api_key)
        print(json.dumps(result, ensure_ascii=False, indent=2))
        return 0
    except Exception as error:
        print(f"오류: {error}")
        return 1

if __name__ == "__main__":
    raise SystemExit(main())