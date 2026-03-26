from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel, Field


class FieldType(str, Enum):
    int = "int"
    float = "float"
    str = "str"
    bool = "bool"
    date = "date"
    email = "email"
    phone = "phone"
    uuid = "uuid"
    enum = "enum"


class ExportFormat(str, Enum):
    json = "json"
    csv = "csv"


class FieldDefinition(BaseModel):
    name: str
    type: FieldType
    constraints: dict[str, Any] = Field(default_factory=dict)
    nullable: bool = False


class SchemaDefinition(BaseModel):
    schema_name: str
    fields: list[FieldDefinition]
    row_count: int = 100
    seed: Optional[int] = None


class GenerationRequest(BaseModel):
    schema: SchemaDefinition
    persona_mode: bool = False
    export_format: ExportFormat = ExportFormat.json


class GenerationResponse(BaseModel):
    rows: list[dict[str, Any]]
    row_count: int
    schema_name: str
    export_format: str
    generated_at: datetime
