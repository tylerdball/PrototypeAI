"""
PersonaBuilder: generates realistic synthetic user persona records.

Uses the `faker` library when available; falls back to bundled static lists
so the module works in minimal environments without any extra dependencies.
"""

from __future__ import annotations

import random
import uuid
from datetime import date, timedelta
from typing import Optional

# ---------------------------------------------------------------------------
# Optional faker import
# ---------------------------------------------------------------------------
try:
    from faker import Faker as _Faker  # type: ignore

    _FAKER_AVAILABLE = True
except ImportError:  # pragma: no cover
    _FAKER_AVAILABLE = False

# ---------------------------------------------------------------------------
# Static fallback data
# ---------------------------------------------------------------------------
_FIRST_NAMES: list[str] = [
    "James", "Mary", "John", "Patricia", "Robert", "Jennifer", "Michael", "Linda",
    "William", "Barbara", "David", "Elizabeth", "Richard", "Susan", "Joseph", "Jessica",
    "Thomas", "Sarah", "Charles", "Karen", "Christopher", "Lisa", "Daniel", "Nancy",
    "Matthew", "Margaret", "Anthony", "Betty", "Mark", "Sandra", "Donald", "Ashley",
    "Steven", "Emily", "Paul", "Kimberly", "Andrew", "Donna", "Kenneth", "Carol",
    "Joshua", "Michelle", "George", "Amanda", "Kevin", "Melissa", "Brian", "Deborah",
    "Timothy", "Stephanie",
]

_LAST_NAMES: list[str] = [
    "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis",
    "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson",
    "Thomas", "Taylor", "Moore", "Jackson", "Martin", "Lee", "Perez", "Thompson",
    "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson", "Walker",
    "Young", "Allen", "King", "Wright", "Scott", "Torres", "Nguyen", "Hill", "Flores",
    "Green", "Adams", "Nelson", "Baker", "Hall", "Rivera", "Campbell", "Mitchell",
    "Carter", "Roberts",
]

_EMAIL_DOMAINS: list[str] = [
    "gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "icloud.com",
    "protonmail.com", "aol.com", "live.com", "me.com", "mail.com",
]

_US_CITIES_STATES: list[tuple[str, str, str]] = [
    ("New York", "NY", "10001"),
    ("Los Angeles", "CA", "90001"),
    ("Chicago", "IL", "60601"),
    ("Houston", "TX", "77001"),
    ("Phoenix", "AZ", "85001"),
    ("Philadelphia", "PA", "19101"),
    ("San Antonio", "TX", "78201"),
    ("San Diego", "CA", "92101"),
    ("Dallas", "TX", "75201"),
    ("San Jose", "CA", "95101"),
    ("Austin", "TX", "73301"),
    ("Jacksonville", "FL", "32099"),
    ("Fort Worth", "TX", "76101"),
    ("Columbus", "OH", "43085"),
    ("Charlotte", "NC", "28201"),
    ("Indianapolis", "IN", "46201"),
    ("San Francisco", "CA", "94101"),
    ("Seattle", "WA", "98101"),
    ("Denver", "CO", "80201"),
    ("Nashville", "TN", "37201"),
    ("Oklahoma City", "OK", "73101"),
    ("El Paso", "TX", "79901"),
    ("Washington", "DC", "20001"),
    ("Las Vegas", "NV", "89101"),
    ("Louisville", "KY", "40201"),
    ("Memphis", "TN", "38101"),
    ("Portland", "OR", "97201"),
    ("Baltimore", "MD", "21201"),
    ("Milwaukee", "WI", "53201"),
    ("Albuquerque", "NM", "87101"),
    ("Tucson", "AZ", "85701"),
    ("Fresno", "CA", "93701"),
    ("Sacramento", "CA", "94201"),
    ("Kansas City", "MO", "64101"),
    ("Mesa", "AZ", "85201"),
    ("Atlanta", "GA", "30301"),
    ("Omaha", "NE", "68101"),
    ("Colorado Springs", "CO", "80901"),
    ("Raleigh", "NC", "27601"),
    ("Long Beach", "CA", "90801"),
    ("Virginia Beach", "VA", "23450"),
    ("Minneapolis", "MN", "55401"),
    ("Tampa", "FL", "33601"),
    ("New Orleans", "LA", "70112"),
    ("Arlington", "TX", "76001"),
    ("Bakersfield", "CA", "93301"),
    ("Honolulu", "HI", "96801"),
    ("Anaheim", "CA", "92801"),
    ("Aurora", "CO", "80010"),
    ("Santa Ana", "CA", "92701"),
]

_PREFERRED_CHANNELS: list[str] = ["email", "sms", "push", "none"]
_PREFERRED_CHANNEL_WEIGHTS: list[float] = [0.50, 0.20, 0.20, 0.10]


# ---------------------------------------------------------------------------
# Helper utilities (used by fallback path)
# ---------------------------------------------------------------------------

def _random_phone(rng: random.Random) -> str:
    """Return a US-formatted phone number in (555) NXX-XXXX style."""
    area = 555
    exchange = rng.randint(100, 999)
    subscriber = rng.randint(1000, 9999)
    return f"({area}) {exchange}-{subscriber}"


def _random_zip(rng: random.Random, base_zip: str) -> str:
    """Return a 5-digit zip code, optionally perturbing a base zip by ±50."""
    try:
        base = int(base_zip)
        offset = rng.randint(-50, 50)
        result = max(1, min(99950, base + offset))
        return str(result).zfill(5)
    except ValueError:
        return str(rng.randint(10000, 99950))


def _clip(value: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, value))


# ---------------------------------------------------------------------------
# PersonaBuilder
# ---------------------------------------------------------------------------

class PersonaBuilder:
    """Generates a list of synthetic user persona dicts."""

    def generate(self, n: int, seed: Optional[int] = None) -> list[dict]:
        """
        Generate *n* persona records.

        Parameters
        ----------
        n:
            Number of personas to generate.
        seed:
            Optional RNG seed for reproducibility.

        Returns
        -------
        list[dict]
            Each dict contains the fields documented in the module docstring.
        """
        rng = random.Random(seed)

        if _FAKER_AVAILABLE:
            faker_seed = seed if seed is not None else rng.randint(0, 2**31)
            fake = _Faker("en_US")
            _Faker.seed(faker_seed)
        else:
            fake = None

        today = date.today()
        five_years_ago = today - timedelta(days=5 * 365)

        personas: list[dict] = []
        for _ in range(n):
            persona = self._build_one(rng, fake, today, five_years_ago)
            personas.append(persona)

        return personas

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _build_one(
        self,
        rng: random.Random,
        fake,
        today: date,
        five_years_ago: date,
    ) -> dict:
        # Name
        if fake is not None:
            first_name: str = fake.first_name()
            last_name: str = fake.last_name()
        else:
            first_name = rng.choice(_FIRST_NAMES)
            last_name = rng.choice(_LAST_NAMES)

        full_name = f"{first_name} {last_name}"

        # Age — normal distribution clipped to [18, 80]
        raw_age = rng.gauss(40.0, 15.0)
        age = int(_clip(raw_age, 18.0, 80.0))

        # Email derived from name
        domain = rng.choice(_EMAIL_DOMAINS)
        email = f"{first_name.lower()}.{last_name.lower()}@{domain}"

        # Phone
        if fake is not None:
            # Force US format regardless of locale quirks
            phone = fake.numerify("(555) ###-####")
        else:
            phone = _random_phone(rng)

        # Location
        if fake is not None:
            city: str = fake.city()
            state: str = fake.state_abbr()
            zip_code: str = fake.zipcode()
        else:
            city_entry = rng.choice(_US_CITIES_STATES)
            city, state, base_zip = city_entry
            zip_code = _random_zip(rng, base_zip)

        country = "US"

        # Signup date — uniform random within past 5 years
        days_range = (today - five_years_ago).days
        signup_offset = rng.randint(0, days_range)
        signup_date = (five_years_ago + timedelta(days=signup_offset)).isoformat()

        # Active flag — 85% probability True
        is_active: bool = rng.random() < 0.85

        # Lifetime value — exponential, min 0, scale 500
        lifetime_value = round(rng.expovariate(1.0 / 500.0), 2)

        # Preferred channel — weighted choice
        preferred_channel: str = rng.choices(
            _PREFERRED_CHANNELS,
            weights=_PREFERRED_CHANNEL_WEIGHTS,
            k=1,
        )[0]

        return {
            "id": str(uuid.uuid4()),
            "first_name": first_name,
            "last_name": last_name,
            "full_name": full_name,
            "age": age,
            "email": email,
            "phone": phone,
            "city": city,
            "state": state,
            "country": country,
            "zip_code": zip_code,
            "signup_date": signup_date,
            "is_active": is_active,
            "lifetime_value": lifetime_value,
            "preferred_channel": preferred_channel,
        }
