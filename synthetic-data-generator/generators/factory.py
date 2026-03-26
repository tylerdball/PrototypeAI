from __future__ import annotations

import sys
import os
from typing import Any

# ---------------------------------------------------------------------------
# Resolve package root so this file works both as part of the package and
# when executed directly with `python generators/factory.py`.
# ---------------------------------------------------------------------------
_THIS_DIR = os.path.dirname(os.path.abspath(__file__))          # …/generators/
_PARENT_DIR = os.path.dirname(_THIS_DIR)                         # …/synthetic-data-generator/
_GRANDPARENT_DIR = os.path.dirname(_PARENT_DIR)                  # …/PrototypeAI/

if _PARENT_DIR not in sys.path:
    sys.path.insert(0, _PARENT_DIR)
if _GRANDPARENT_DIR not in sys.path:
    sys.path.insert(0, _GRANDPARENT_DIR)

# When run as __main__ the relative imports below won't resolve, so we load
# the sibling modules by injecting them under the package name instead.
if __name__ == "__main__":
    # Bootstrap the generators package so relative imports inside sibling
    # modules resolve correctly when this file is run directly.
    import importlib.util, types

    _pkg = types.ModuleType("generators")
    _pkg.__path__ = [_THIS_DIR]
    _pkg.__package__ = "generators"
    _pkg.__spec__ = importlib.util.spec_from_file_location(
        "generators", os.path.join(_THIS_DIR, "__init__.py")
    )
    sys.modules["generators"] = _pkg

    for _mod_name in ("base", "numeric", "categorical", "temporal", "structured"):
        _full_name = f"generators.{_mod_name}"
        _spec = importlib.util.spec_from_file_location(
            _full_name,
            os.path.join(_THIS_DIR, f"{_mod_name}.py"),
            submodule_search_locations=[],
        )
        _mod = importlib.util.module_from_spec(_spec)
        _mod.__package__ = "generators"
        sys.modules[_full_name] = _mod
        _spec.loader.exec_module(_mod)

    __package__ = "generators"

from .base import BaseGenerator
from .numeric import IntGenerator, FloatGenerator
from .categorical import BoolGenerator, EnumGenerator, UUIDGenerator
from .temporal import DateGenerator
from .structured import EmailGenerator, PhoneGenerator, OllamaGenerator

import schemas as _schemas_mod  # always available after path fixup above

FieldDefinition = _schemas_mod.FieldDefinition
FieldType = _schemas_mod.FieldType


# ---------------------------------------------------------------------------
# Factory
# ---------------------------------------------------------------------------

_TYPE_MAP: dict[FieldType, type[BaseGenerator]] = {
    FieldType.int: IntGenerator,
    FieldType.float: FloatGenerator,
    FieldType.bool: BoolGenerator,
    FieldType.enum: EnumGenerator,
    FieldType.uuid: UUIDGenerator,
    FieldType.date: DateGenerator,
    FieldType.email: EmailGenerator,
    FieldType.phone: PhoneGenerator,
    FieldType.str: OllamaGenerator,  # generic text → Ollama
}


class GeneratorFactory:
    @staticmethod
    def get(field_def: FieldDefinition) -> BaseGenerator:
        """Return an instantiated generator for the given field definition."""
        gen_cls = _TYPE_MAP.get(field_def.type)
        if gen_cls is None:
            raise ValueError(
                f"GeneratorFactory: no generator registered for type '{field_def.type}'."
            )
        return gen_cls(constraints=field_def.constraints)


# ---------------------------------------------------------------------------
# Quick smoke-test
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    sample_fields: list[Any] = [
        FieldDefinition(
            name="user_id",
            type=FieldType.uuid,
            constraints={},
        ),
        FieldDefinition(
            name="age",
            type=FieldType.int,
            constraints={"min": 18, "max": 80, "distribution": "normal", "mean": 35, "std": 10},
        ),
        FieldDefinition(
            name="score",
            type=FieldType.float,
            constraints={"min": 0.0, "max": 100.0},
        ),
        FieldDefinition(
            name="signup_date",
            type=FieldType.date,
            constraints={"start": "2022-01-01", "end": "2024-12-31"},
        ),
        FieldDefinition(
            name="email",
            type=FieldType.email,
            constraints={},
        ),
    ]

    N_ROWS = 5
    SEED = 42

    rows: list[dict[str, Any]] = [{} for _ in range(N_ROWS)]
    for field in sample_fields:
        gen = GeneratorFactory.get(field)
        values = gen.generate(N_ROWS, seed=SEED)
        for i, val in enumerate(values):
            rows[i][field.name] = val

    print(f"{'Field':<15} " + "  ".join(f"Row {i}" for i in range(N_ROWS)))
    print("-" * 80)
    for field in sample_fields:
        vals = [str(rows[i][field.name])[:18] for i in range(N_ROWS)]
        print(f"{field.name:<15} " + "  ".join(f"{v:<20}" for v in vals))
