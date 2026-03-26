"""
Integration tests for the FastAPI app routes using httpx AsyncClient.
"""

import sys
import os

# Ensure the package root is on sys.path so imports resolve correctly.
_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _ROOT not in sys.path:
    sys.path.insert(0, _ROOT)

import pytest
from httpx import AsyncClient, ASGITransport

from main import app


# ---------------------------------------------------------------------------
# Fixtures / helpers
# ---------------------------------------------------------------------------

_BASE_SCHEMA = {
    "schema_name": "test_users",
    "row_count": 10,
    "seed": 42,
    "fields": [
        {"name": "id", "type": "uuid", "constraints": {}, "nullable": False},
        {"name": "age", "type": "int", "constraints": {"min": 18, "max": 65}, "nullable": False},
        {"name": "score", "type": "float", "constraints": {"min": 0.0, "max": 100.0}, "nullable": False},
        {"name": "signup_date", "type": "date", "constraints": {"start": "2022-01-01", "end": "2024-12-31"}, "nullable": False},
        {"name": "status", "type": "enum", "constraints": {"values": ["active", "inactive", "pending"]}, "nullable": False},
    ],
}


@pytest.fixture
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac


# ---------------------------------------------------------------------------
# POST /generate — basic
# ---------------------------------------------------------------------------

class TestGenerate:
    async def test_returns_correct_row_count(self, client: AsyncClient):
        payload = {
            "schema": {**_BASE_SCHEMA, "row_count": 25},
            "persona_mode": False,
            "export_format": "json",
        }
        resp = await client.post("/generate", json=payload)
        assert resp.status_code == 200
        body = resp.json()
        assert body["row_count"] == 25
        assert len(body["rows"]) == 25

    async def test_response_has_expected_keys(self, client: AsyncClient):
        payload = {
            "schema": _BASE_SCHEMA,
            "persona_mode": False,
            "export_format": "json",
        }
        resp = await client.post("/generate", json=payload)
        assert resp.status_code == 200
        body = resp.json()
        for key in ("rows", "row_count", "schema_name", "export_format", "generated_at"):
            assert key in body, f"Missing key '{key}' in response"

    async def test_field_names_match_schema(self, client: AsyncClient):
        payload = {
            "schema": _BASE_SCHEMA,
            "persona_mode": False,
            "export_format": "json",
        }
        resp = await client.post("/generate", json=payload)
        assert resp.status_code == 200
        rows = resp.json()["rows"]
        expected_fields = {f["name"] for f in _BASE_SCHEMA["fields"]}
        for row in rows:
            assert set(row.keys()) == expected_fields


# ---------------------------------------------------------------------------
# POST /generate — persona_mode
# ---------------------------------------------------------------------------

_PERSONA_FIELDS = {
    "id", "first_name", "last_name", "full_name", "age", "email",
    "phone", "city", "state", "country", "zip_code", "signup_date",
    "is_active", "lifetime_value", "preferred_channel",
    # BehaviourProfile fields (merged in)
    "avg_session_duration_mins", "sessions_per_week", "pages_per_session",
    "conversion_rate", "last_active_days_ago",
}


class TestGeneratePersonaMode:
    async def test_persona_mode_returns_persona_fields(self, client: AsyncClient):
        payload = {
            "schema": {
                "schema_name": "personas",
                "row_count": 5,
                "seed": 1,
                "fields": [],
            },
            "persona_mode": True,
            "export_format": "json",
        }
        resp = await client.post("/generate", json=payload)
        assert resp.status_code == 200
        rows = resp.json()["rows"]
        assert len(rows) == 5
        for row in rows:
            for field in _PERSONA_FIELDS:
                assert field in row, (
                    f"Expected persona field '{field}' missing from row. Got: {list(row.keys())}"
                )

    async def test_persona_mode_row_count(self, client: AsyncClient):
        payload = {
            "schema": {
                "schema_name": "personas",
                "row_count": 15,
                "seed": 7,
                "fields": [],
            },
            "persona_mode": True,
            "export_format": "json",
        }
        resp = await client.post("/generate", json=payload)
        assert resp.status_code == 200
        body = resp.json()
        assert body["row_count"] == 15
        assert len(body["rows"]) == 15


# ---------------------------------------------------------------------------
# POST /generate — seed reproducibility
# ---------------------------------------------------------------------------

class TestSeedReproducibility:
    async def test_seed_produces_identical_output(self, client: AsyncClient):
        """Two requests with the same seed must return identical rows."""
        payload = {
            "schema": {**_BASE_SCHEMA, "row_count": 20, "seed": 123},
            "persona_mode": False,
            "export_format": "json",
        }
        resp1 = await client.post("/generate", json=payload)
        resp2 = await client.post("/generate", json=payload)
        assert resp1.status_code == 200
        assert resp2.status_code == 200
        rows1 = resp1.json()["rows"]
        rows2 = resp2.json()["rows"]
        assert rows1 == rows2, "Seeded generation produced different results on second call"

    async def test_different_seeds_differ(self, client: AsyncClient):
        """Different seeds should (very likely) produce different rows."""
        payload_a = {
            "schema": {**_BASE_SCHEMA, "row_count": 20, "seed": 1},
            "persona_mode": False,
            "export_format": "json",
        }
        payload_b = {
            "schema": {**_BASE_SCHEMA, "row_count": 20, "seed": 9999},
            "persona_mode": False,
            "export_format": "json",
        }
        resp_a = await client.post("/generate", json=payload_a)
        resp_b = await client.post("/generate", json=payload_b)
        rows_a = resp_a.json()["rows"]
        rows_b = resp_b.json()["rows"]
        assert rows_a != rows_b


# ---------------------------------------------------------------------------
# POST /generate/stream
# ---------------------------------------------------------------------------

class TestGenerateStream:
    async def test_stream_returns_200(self, client: AsyncClient):
        payload = {
            "schema": {**_BASE_SCHEMA, "row_count": 5},
            "persona_mode": False,
            "export_format": "csv",
        }
        resp = await client.post("/generate/stream", json=payload)
        assert resp.status_code == 200

    async def test_stream_content_type_is_csv(self, client: AsyncClient):
        payload = {
            "schema": {**_BASE_SCHEMA, "row_count": 5},
            "persona_mode": False,
            "export_format": "csv",
        }
        resp = await client.post("/generate/stream", json=payload)
        assert "text/csv" in resp.headers.get("content-type", ""), (
            f"Expected text/csv content-type, got: {resp.headers.get('content-type')}"
        )

    async def test_stream_body_is_non_empty(self, client: AsyncClient):
        payload = {
            "schema": {**_BASE_SCHEMA, "row_count": 5},
            "persona_mode": False,
            "export_format": "csv",
        }
        resp = await client.post("/generate/stream", json=payload)
        assert len(resp.content) > 0

    async def test_stream_csv_has_header_row(self, client: AsyncClient):
        payload = {
            "schema": {**_BASE_SCHEMA, "row_count": 3},
            "persona_mode": False,
            "export_format": "csv",
        }
        resp = await client.post("/generate/stream", json=payload)
        text = resp.text
        lines = [l for l in text.splitlines() if l.strip()]
        # First line should be the CSV header
        header = lines[0]
        for field in _BASE_SCHEMA["fields"]:
            assert field["name"] in header, (
                f"Field '{field['name']}' not in CSV header: {header}"
            )


# ---------------------------------------------------------------------------
# GET /schema/sample
# ---------------------------------------------------------------------------

class TestSchemaSample:
    async def test_returns_200(self, client: AsyncClient):
        resp = await client.get("/schema/sample")
        assert resp.status_code == 200

    async def test_has_schema_key(self, client: AsyncClient):
        resp = await client.get("/schema/sample")
        body = resp.json()
        assert "schema" in body, f"Missing 'schema' key. Got keys: {list(body.keys())}"

    async def test_schema_has_fields(self, client: AsyncClient):
        resp = await client.get("/schema/sample")
        schema = resp.json()["schema"]
        assert "fields" in schema, f"Missing 'fields' key in schema: {list(schema.keys())}"
        assert isinstance(schema["fields"], list)
        assert len(schema["fields"]) > 0

    async def test_schema_has_required_shape(self, client: AsyncClient):
        resp = await client.get("/schema/sample")
        body = resp.json()
        schema = body["schema"]
        for key in ("schema_name", "row_count", "fields"):
            assert key in schema, f"Missing key '{key}' in schema sample"


# ---------------------------------------------------------------------------
# GET /health (sanity check)
# ---------------------------------------------------------------------------

class TestHealth:
    async def test_health_ok(self, client: AsyncClient):
        resp = await client.get("/health")
        assert resp.status_code == 200
        assert resp.json() == {"status": "ok"}
