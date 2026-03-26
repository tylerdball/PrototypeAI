# Synthetic Data Generator

A FastAPI service that generates realistic synthetic datasets from declarative schema definitions. Supports numeric, categorical, temporal, and structured (email/phone) field types, plus a persona mode that emits richly-correlated user profiles with engagement behaviour metrics.

---

## Stack

| Layer     | Technology                              |
|-----------|-----------------------------------------|
| Runtime   | Python 3.11+                            |
| API       | FastAPI + Uvicorn · port 8006           |
| Data      | NumPy, Pandas                           |
| Fakes     | Faker (optional, used by persona mode)  |
| AI/text   | Ollama (optional, used for `str` fields)|
| Frontend  | Next.js 14 + TypeScript + Tailwind · port 3006 |

---

## Setup

### Backend

```powershell
cd synthetic-data-generator
pip install -r requirements.txt
uvicorn main:app --reload --port 8006
```

### Frontend

```powershell
cd synthetic-data-generator/frontend
npm install
npm run dev
```

Open http://localhost:3006 for the UI, or http://localhost:8006/docs for the raw API.

Interactive docs available at http://localhost:8006/docs once running.

### Optional: Ollama for AI-generated text fields

`str`-type fields are routed through Ollama with model `llama3.2`. Pull it once with:

```powershell
ollama pull llama3.2
```

If Ollama is not running the generator gracefully falls back to placeholder strings (`AI_GENERATED_TEXT_0`, etc.) so all other field types work without it.

---

## Endpoints

| Method | Path              | Description                                    |
|--------|-------------------|------------------------------------------------|
| GET    | /health           | Liveness check                                 |
| GET    | /schema/sample    | Example request payload                        |
| POST   | /generate         | Generate rows, return JSON response            |
| POST   | /generate/stream  | Stream rows as a CSV file download             |

---

## Example requests

### POST /generate — schema field mode (3 fields)

```bash
curl -s -X POST http://localhost:8006/generate \
  -H "Content-Type: application/json" \
  -d '{
    "schema": {
      "schema_name": "users",
      "row_count": 5,
      "seed": 42,
      "fields": [
        { "name": "age",           "type": "int",   "constraints": { "min": 18, "max": 75 } },
        { "name": "name",          "type": "str",   "constraints": { "prompt": "Generate a realistic full name." } },
        { "name": "contact_email", "type": "email", "constraints": {} }
      ]
    },
    "persona_mode": false,
    "export_format": "json"
  }'
```

### POST /generate — persona mode

Persona mode ignores the `fields` list and generates fully-correlated user profiles including name, age, email, location, and engagement behaviour metrics.

```bash
curl -s -X POST http://localhost:8006/generate \
  -H "Content-Type: application/json" \
  -d '{
    "schema": {
      "schema_name": "personas",
      "row_count": 10,
      "seed": 99,
      "fields": []
    },
    "persona_mode": true,
    "export_format": "json"
  }'
```

### POST /generate/stream — CSV download

```bash
curl -O -J -X POST http://localhost:8006/generate/stream \
  -H "Content-Type: application/json" \
  -d '{
    "schema": {
      "schema_name": "export",
      "row_count": 1000,
      "seed": 1,
      "fields": [
        { "name": "id",    "type": "uuid",  "constraints": {} },
        { "name": "score", "type": "float", "constraints": { "min": 0.0, "max": 100.0 } }
      ]
    },
    "persona_mode": false,
    "export_format": "csv"
  }'
```

---

## Generator types and constraints

### `int` — IntGenerator

Generates integer values.

| Constraint     | Type    | Default     | Description                                    |
|----------------|---------|-------------|------------------------------------------------|
| `min`          | int     | `0`         | Lower bound (inclusive)                        |
| `max`          | int     | `100`       | Upper bound (inclusive)                        |
| `distribution` | str     | `"uniform"` | `"uniform"`, `"normal"`, or `"exponential"`   |
| `mean`         | float   | midpoint    | Mean for normal/exponential distributions      |
| `std`          | float   | range / 6   | Std deviation for normal distribution          |

### `float` — FloatGenerator

Same constraints as `int`, produces floating-point values rounded to 6 decimal places.

### `bool` — BoolGenerator

| Constraint        | Type  | Default | Description                   |
|-------------------|-------|---------|-------------------------------|
| `true_probability`| float | `0.5`   | Probability that value is True|

### `enum` — EnumGenerator

| Constraint | Type | Default | Description                                      |
|------------|------|---------|--------------------------------------------------|
| `values`   | list | required| List of possible values to sample uniformly from |

### `uuid` — UUIDGenerator

No constraints. Generates random UUID4 strings. Seeded for reproducibility.

### `date` — DateGenerator

| Constraint | Type | Default        | Description                      |
|------------|------|----------------|----------------------------------|
| `start`    | str  | `"2020-01-01"` | ISO date lower bound             |
| `end`      | str  | today          | ISO date upper bound             |
| `format`   | str  | `"%Y-%m-%d"`   | `strftime` format for output     |

### `email` — EmailGenerator

No constraints. Generates `firstname.lastname@domain` addresses from static name and domain pools.

### `phone` — PhoneGenerator

No constraints. Generates US phone numbers in `(555) NXX-XXXX` format.

### `str` — OllamaGenerator

Routes generation to a local Ollama model. Falls back gracefully if Ollama is unreachable.

| Constraint | Type | Default                      | Description              |
|------------|------|------------------------------|--------------------------|
| `prompt`   | str  | `"Generate a short text."`   | Prompt sent to the model |
| `model`    | str  | `"llama3.2"`                 | Ollama model name        |

---

## Persona mode fields

When `persona_mode=true` each row contains:

**Identity:** `id`, `first_name`, `last_name`, `full_name`, `age`, `email`, `phone`

**Location:** `city`, `state`, `country`, `zip_code`

**Account:** `signup_date`, `is_active`, `lifetime_value`, `preferred_channel`

**Behaviour (correlated to LTV and age):** `avg_session_duration_mins`, `sessions_per_week`, `pages_per_session`, `conversion_rate`, `last_active_days_ago`
