"""Build static datasets for the Poverty vs. Crime dashboard.

Sources:
  - Chicago Crimes 2001–Present (ijzp-q8t2) — counts by community area, 2019–2024
  - Poverty, Unemployment, Diploma (mkus-5ykj) — household poverty rate
  - ACS 5-Year by Community Area (7umk-8dtw) — population
  - Community area boundaries (igwz-8jzy)

Each community area becomes one row: poverty %, population, total crimes,
annual crime rate per 1,000 residents. The D3 client reads a flat JSON array
plus GeoJSON boundaries.

Run:  pip install -r requirements.txt  &&  python prepare_data.py
"""

from __future__ import annotations

import json
import re
import time
import unicodedata
from pathlib import Path

import requests

CRIMES_URL = "https://data.cityofchicago.org/resource/ijzp-q8t2.json"
POVERTY_URL = "https://data.cityofchicago.org/resource/mkus-5ykj.json"
POPULATION_URL = "https://data.cityofchicago.org/resource/7umk-8dtw.json"
BOUNDARIES_URL = "https://data.cityofchicago.org/resource/igwz-8jzy.geojson"

START_DATE = "2019-01-01T00:00:00"
END_DATE = "2024-12-31T23:59:59"
YEARS = 6
PAGE_SIZE = 50000

CLIENT_DATA = Path(__file__).resolve().parent.parent / "client" / "data"
AREAS_OUTPUT = CLIENT_DATA / "areas.json"
GEO_OUTPUT = CLIENT_DATA / "community-areas.geojson"

AREA_NAMES: dict[int, str] = {
    1: "Rogers Park",
    2: "West Ridge",
    3: "Uptown",
    4: "Lincoln Square",
    5: "North Center",
    6: "Lakeview",
    7: "Lincoln Park",
    8: "Near North Side",
    9: "Edison Park",
    10: "Norwood Park",
    11: "Jefferson Park",
    12: "Forest Glen",
    13: "North Park",
    14: "Albany Park",
    15: "Portage Park",
    16: "Irving Park",
    17: "Dunning",
    18: "Montclare",
    19: "Belmont Cragin",
    20: "Hermosa",
    21: "Avondale",
    22: "Logan Square",
    23: "Humboldt Park",
    24: "West Town",
    25: "Austin",
    26: "West Garfield Park",
    27: "East Garfield Park",
    28: "Near West Side",
    29: "North Lawndale",
    30: "South Lawndale",
    31: "Lower West Side",
    32: "Loop",
    33: "Near South Side",
    34: "Armour Square",
    35: "Douglas",
    36: "Oakland",
    37: "Fuller Park",
    38: "Grand Boulevard",
    39: "Kenwood",
    40: "Washington Park",
    41: "Hyde Park",
    42: "Woodlawn",
    43: "South Shore",
    44: "Chatham",
    45: "Avalon Park",
    46: "South Chicago",
    47: "Burnside",
    48: "Calumet Heights",
    49: "Roseland",
    50: "Pullman",
    51: "South Deering",
    52: "East Side",
    53: "West Pullman",
    54: "Riverdale",
    55: "Hegewisch",
    56: "Garfield Ridge",
    57: "Archer Heights",
    58: "Brighton Park",
    59: "McKinley Park",
    60: "Bridgeport",
    61: "New City",
    62: "West Elsdon",
    63: "Gage Park",
    64: "Clearing",
    65: "West Lawn",
    66: "Chicago Lawn",
    67: "West Englewood",
    68: "Englewood",
    69: "Greater Grand Crossing",
    70: "Ashburn",
    71: "Auburn Gresham",
    72: "Beverly",
    73: "Washington Heights",
    74: "Mount Greenwood",
    75: "Morgan Park",
    76: "O'Hare",
    77: "Edgewater",
}

# Portal spellings that differ from our canonical names.
NAME_ALIASES = {
    "WASHINGTON HEIGHT": "WASHINGTON HEIGHTS",
    "MONTCLAIRE": "MONTCLARE",
    "LAKE VIEW": "LAKEVIEW",
}


def normalize_name(name: str) -> str:
    text = unicodedata.normalize("NFKD", name)
    text = text.encode("ascii", "ignore").decode("ascii")
    text = text.replace("'", "")
    text = re.sub(r"[^A-Z0-9 ]", " ", text.upper())
    text = re.sub(r"\s+", " ", text).strip()
    return NAME_ALIASES.get(text, text)


def canonical_key(name: str) -> str:
    return normalize_name(name)


NAME_TO_ID = {canonical_key(name): area_id for area_id, name in AREA_NAMES.items()}


def fetch_crime_counts_by_area() -> dict[int, int]:
    select = "community_area, count(*) as count"
    where = f"date >= '{START_DATE}' AND date <= '{END_DATE}' AND community_area IS NOT NULL"
    group = "community_area"

    counts: dict[int, int] = {}
    offset = 0
    while True:
        params = {
            "$select": select,
            "$where": where,
            "$group": group,
            "$order": "community_area",
            "$limit": PAGE_SIZE,
            "$offset": offset,
        }
        response = requests.get(CRIMES_URL, params=params, timeout=120)
        response.raise_for_status()
        batch = response.json()
        if not batch:
            break
        for row in batch:
            area = int(float(row["community_area"]))
            counts[area] = int(row["count"])
        if len(batch) < PAGE_SIZE:
            break
        offset += PAGE_SIZE
        time.sleep(0.3)
    return counts


def fetch_poverty() -> dict[int, float]:
    response = requests.get(POVERTY_URL, params={"$limit": 500}, timeout=60)
    response.raise_for_status()
    poverty: dict[int, float] = {}
    for row in response.json():
        name = row.get("community_area_name", "")
        if canonical_key(name) == "CHICAGO":
            continue
        area_id = NAME_TO_ID.get(canonical_key(name))
        if area_id is None:
            print(f"  warning: unmatched poverty row '{name}'")
            continue
        poverty[area_id] = float(row["percent_households_below_poverty"])
    return poverty


def fetch_population() -> dict[int, int]:
    response = requests.get(POPULATION_URL, params={"$limit": 500}, timeout=60)
    response.raise_for_status()
    population: dict[int, int] = {}
    for row in response.json():
        area_id = NAME_TO_ID.get(canonical_key(row["community_area"]))
        if area_id is None:
            print(f"  warning: unmatched population row '{row['community_area']}'")
            continue
        population[area_id] = int(float(row["total_population"]))
    return population


def fetch_boundaries() -> dict:
    response = requests.get(BOUNDARIES_URL, timeout=60)
    response.raise_for_status()
    geo = response.json()
    for feature in geo.get("features", []):
        props = feature.setdefault("properties", {})
        raw = props.get("area_numbe") or props.get("area_num_1")
        if raw is not None:
            area_id = int(float(raw))
            props["area"] = area_id
            props["areaName"] = AREA_NAMES.get(area_id, props.get("community", ""))
    return geo


def main() -> None:
    CLIENT_DATA.mkdir(parents=True, exist_ok=True)

    print("Fetching crime counts by community area (2019–2024)...")
    crime_counts = fetch_crime_counts_by_area()

    print("Fetching poverty rates...")
    poverty = fetch_poverty()

    print("Fetching population...")
    population = fetch_population()

    print("Fetching community area boundaries...")
    geo = fetch_boundaries()

    areas = []
    for area_id, name in sorted(AREA_NAMES.items()):
        pop = population.get(area_id)
        pov = poverty.get(area_id)
        crimes = crime_counts.get(area_id, 0)
        if pop is None or pov is None:
            print(f"  skipping area {area_id} {name}: missing poverty or population")
            continue
        rate = (crimes / YEARS / pop) * 1000
        areas.append(
            {
                "id": area_id,
                "name": name,
                "povertyPct": round(pov, 1),
                "population": pop,
                "totalCrimes": crimes,
                "crimeRate": round(rate, 1),
            }
        )

    payload = {
        "meta": {
            "city": "Chicago",
            "crimeStart": "2019-01",
            "crimeEnd": "2024-12",
            "years": YEARS,
            "totalAreas": len(areas),
        },
        "areas": areas,
    }

    AREAS_OUTPUT.write_text(json.dumps(payload, separators=(",", ":")))
    GEO_OUTPUT.write_text(json.dumps(geo, separators=(",", ":")))

    print(f"Wrote {AREAS_OUTPUT} ({AREAS_OUTPUT.stat().st_size / 1024:.0f} KB)")
    print(f"Wrote {GEO_OUTPUT} ({GEO_OUTPUT.stat().st_size / 1024:.0f} KB)")
    print(f"Areas joined: {len(areas)} of 77")


if __name__ == "__main__":
    main()
