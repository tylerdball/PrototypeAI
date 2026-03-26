You are the orchestrator for building a Synthetic Data Generator prototype.
Your job is to decompose this project into parallel workstreams, spawn
subagents using the Task tool for each, then integrate their outputs.

## Project overview
Build a FastAPI application that generates realistic synthetic datasets.
Users define a schema (field names, types, constraints, relationships) and
receive N rows of plausible synthetic data. Includes a "persona mode" that
generates coherent synthetic users (name, age, location, behaviour fields).
Supports CSV and JSON export.

Stack: FastAPI, Pydantic, Ollama (localhost:11434) for text fields,
pandas + numpy for distributions.

---

## Phase 1 — spawn these three Tasks in parallel

### Task A — Core API + schema engine
Build the FastAPI application skeleton and schema definition system.

Deliverables:
- `main.py` — FastAPI app with lifespan, CORS, /health endpoint
- `schemas.py` — Pydantic models for:
    - FieldDefinition (name, type: enum[int|float|str|bool|date|email|
      phone|uuid|enum], constraints dict, nullable bool)
    - SchemaDefinition (schema_name, fields: list[FieldDefinition],
      row_count: int, seed: optional int)
    - GenerationRequest (schema, persona_mode: bool, export_format:
      enum[json|csv])
    - GenerationResponse (rows: list[dict], row_count, schema_name,
      export_format, generated_at)
- `router.py` — POST /generate endpoint that accepts GenerationRequest,
  returns GenerationResponse. Stub the generation logic — just return
  empty rows list for now. Integration happens in Phase 2.
- `requirements.txt` — fastapi, uvicorn, pydantic, pandas, numpy,
  httpx, python-dotenv

Do not implement generation logic. Focus on clean schema and routing.

### Task B — Data generation engine
Build the numeric, boolean, date, and structured-string generation logic.

Deliverables:
- `generators/base.py` — BaseGenerator abstract class with
  generate(n_rows, seed) -> list[Any]
- `generators/numeric.py` — IntGenerator and FloatGenerator.
  Support constraints: min, max, mean, std, distribution
  (uniform | normal | exponential). Use numpy.
- `generators/categorical.py` — BoolGenerator, EnumGenerator (picks
  from a provided values list), UUIDGenerator
- `generators/temporal.py` — DateGenerator. Constraints: start, end,
  format string. Uniform distribution across range.
- `generators/structured.py` — EmailGenerator (firstname.lastname@
  domain pattern), PhoneGenerator (US format), stub OllamaGenerator
  with generate() that calls POST http://localhost:11434/api/generate
  with model=llama3.2 and returns placeholder if Ollama unreachable.
- `generators/factory.py` — GeneratorFactory.get(field_def) that
  returns the correct generator instance based on FieldDefinition.type

Write a simple __main__ test in factory.py that generates 5 rows of
a sample schema and prints output. No pytest yet.

### Task C — Persona mode + export layer
Build the persona user generation system and export utilities.

Deliverables:
- `persona/builder.py` — PersonaBuilder class. generate(n) returns
  list of persona dicts with fields: id (uuid), first_name, last_name,
  full_name, age (18-80 normal dist), email (derived from name),
  phone, city, state, country (US focus), zip_code, signup_date,
  is_active (bool, 85% true), lifetime_value (float, exponential
  dist, min 0), preferred_channel (enum: email|sms|push|none).
  Use faker for names/locations if available, otherwise use static
  word lists. Do not depend on Ollama for persona mode.
- `persona/behaviours.py` — BehaviourProfile dataclass with fields:
  avg_session_duration_mins (float), sessions_per_week (float),
  pages_per_session (float), conversion_rate (float 0-1),
  last_active_days_ago (int). Add generate_behaviour(persona_dict)
  that returns a BehaviourProfile with values statistically correlated
  to lifetime_value and age.
- `export/writer.py` — ExportWriter class with:
    - to_json(rows, pretty=True) -> str
    - to_csv(rows) -> str
    - to_file(rows, format, path) -> Path
- `export/streaming.py` — StreamingExporter using FastAPI
  StreamingResponse. Implement stream_csv(rows) generator that yields
  CSV chunks. Stub stream_json similarly.

---

## Phase 2 — integration Task (run after Phase 1 completes)

### Task D — Wire + integrate
Read all files produced by Tasks A, B, and C. Then:

1. Update `router.py` — replace the stub in POST /generate:
   - If persona_mode=True: use PersonaBuilder + BehaviourProfile,
     merge into rows
   - If persona_mode=False: iterate schema fields, use
     GeneratorFactory to build each column, zip into row dicts
   - Apply seed if provided (pass to numpy.random.seed and random.seed)
   - Use ExportWriter to format output
   - Return GenerationResponse

2. Add POST /generate/stream endpoint using StreamingExporter

3. Add GET /schema/sample endpoint that returns a hardcoded example
   GenerationRequest payload — useful for UI demos

4. Create `README.md` with:
   - Setup instructions (pip install, ollama pull llama3.2, uvicorn)
   - Example curl for POST /generate with a 3-field schema
   - Example curl for persona mode
   - Brief description of each generator type and its constraints

---

## Phase 3 — test Task (run after Phase 2 completes)

### Task E — Tests
Read all source files. Write `tests/test_generators.py` and
`tests/test_api.py` using pytest and httpx AsyncClient.

test_generators.py must cover:
- IntGenerator respects min/max bounds across 1000 rows
- FloatGenerator with normal distribution produces expected mean ±20%
- DateGenerator stays within start/end range
- UUIDGenerator produces unique values
- EnumGenerator only returns values from the provided list
- PersonaBuilder produces correct field types and age range
- BehaviourProfile values are all non-negative

test_api.py must cover:
- POST /generate returns correct row_count
- POST /generate with persona_mode=True returns all persona fields
- POST /generate with seed produces identical output on second call
- POST /generate/stream returns 200 and content-type text/csv
- GET /schema/sample returns a valid GenerationRequest shape

---

## Orchestrator instructions

1. Spawn Tasks A, B, C in parallel using the Task tool.
2. Wait for all three to complete. If any fails, fix the blocking
   issue before proceeding — do not proceed with partial outputs.
3. Spawn Task D. Verify router.py imports resolve correctly after
   integration. Fix any import errors before continuing.
4. Spawn Task E. Run pytest. Report pass/fail counts.
5. Final output: print a summary of all files created, the curl
   example from README.md, and pytest results.