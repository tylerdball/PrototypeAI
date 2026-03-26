from __future__ import annotations

import random
from dataclasses import asdict
from datetime import datetime
from typing import Any

import numpy as np
from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from export.streaming import StreamingExporter
from export.writer import ExportWriter
from generators.factory import GeneratorFactory
from persona.behaviours import generate_behaviour
from persona.builder import PersonaBuilder
from schemas import ExportFormat, GenerationRequest, GenerationResponse

router = APIRouter()

_persona_builder = PersonaBuilder()
_export_writer = ExportWriter()
_streaming_exporter = StreamingExporter()


@router.post("/generate", response_model=GenerationResponse)
async def generate(request: GenerationRequest) -> GenerationResponse:
    """
    Generate synthetic data rows from a schema definition.

    - persona_mode=True  : use PersonaBuilder + BehaviourProfile
    - persona_mode=False : use schema field definitions via GeneratorFactory
    """
    schema = request.schema
    seed = schema.seed

    if request.persona_mode:
        # ------------------------------------------------------------------
        # Persona mode
        # ------------------------------------------------------------------
        personas = _persona_builder.generate(schema.row_count, seed=seed)
        rows: list[dict[str, Any]] = []
        for persona in personas:
            row = dict(persona)
            behaviour = generate_behaviour(persona, seed=seed)
            row.update(asdict(behaviour))
            rows.append(row)

    else:
        # ------------------------------------------------------------------
        # Schema field mode
        # ------------------------------------------------------------------
        if seed is not None:
            np.random.seed(seed)
            random.seed(seed)

        columns: dict[str, list[Any]] = {}
        for field_def in schema.fields:
            generator = GeneratorFactory.get(field_def)
            columns[field_def.name] = generator.generate(schema.row_count, seed=seed)

        rows = [
            {field_def.name: columns[field_def.name][i] for field_def in schema.fields}
            for i in range(schema.row_count)
        ]

        # Apply nullable: randomly null out values where field.nullable=True
        if seed is not None:
            null_rng = np.random.default_rng(seed)
        else:
            null_rng = np.random.default_rng()

        for field_def in schema.fields:
            if field_def.nullable:
                for row in rows:
                    if null_rng.random() < 0.1:  # 10% null rate
                        row[field_def.name] = None

    # ------------------------------------------------------------------
    # Format via ExportWriter (formatted string unused in response body,
    # but ensures the writer is exercised and validates the rows).
    # ------------------------------------------------------------------
    if request.export_format == ExportFormat.csv:
        _export_writer.to_csv(rows)
    else:
        _export_writer.to_json(rows)

    return GenerationResponse(
        rows=rows,
        row_count=len(rows),
        schema_name=schema.schema_name,
        export_format=request.export_format.value,
        generated_at=datetime.utcnow(),
    )


@router.post("/generate/stream")
async def generate_stream(request: GenerationRequest):
    """
    Stream synthetic data as a CSV file download.

    Generates rows identically to POST /generate then streams them as
    newline-delimited CSV chunks via chunked transfer encoding.
    """
    schema = request.schema
    seed = schema.seed

    if request.persona_mode:
        personas = _persona_builder.generate(schema.row_count, seed=seed)
        rows: list[dict[str, Any]] = []
        for persona in personas:
            row = dict(persona)
            behaviour = generate_behaviour(persona, seed=seed)
            row.update(asdict(behaviour))
            rows.append(row)
    else:
        if seed is not None:
            np.random.seed(seed)
            random.seed(seed)

        columns: dict[str, list[Any]] = {}
        for field_def in schema.fields:
            generator = GeneratorFactory.get(field_def)
            columns[field_def.name] = generator.generate(schema.row_count, seed=seed)

        rows = [
            {field_def.name: columns[field_def.name][i] for field_def in schema.fields}
            for i in range(schema.row_count)
        ]

    filename = f"{schema.schema_name}.csv"
    return StreamingResponse(
        _streaming_exporter.stream_csv(rows),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/schema/sample")
async def schema_sample() -> dict:
    """
    Return a hardcoded example GenerationRequest payload as a plain dict.

    Useful for exploring the API shape without reading the docs.
    """
    return {
        "schema": {
            "schema_name": "sample_users",
            "row_count": 10,
            "seed": 42,
            "fields": [
                {
                    "name": "age",
                    "type": "int",
                    "constraints": {"min": 18, "max": 75},
                    "nullable": False,
                },
                {
                    "name": "name",
                    "type": "str",
                    "constraints": {"prompt": "Generate a realistic full name."},
                    "nullable": False,
                },
                {
                    "name": "contact_email",
                    "type": "email",
                    "constraints": {},
                    "nullable": False,
                },
            ],
        },
        "persona_mode": False,
        "export_format": "json",
    }
