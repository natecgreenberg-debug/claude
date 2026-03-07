---
description: Code conventions for this workspace
---

# Code Style Rules

## Python
- Python 3.12+ features are fine
- Always use virtual environments (`python3 -m venv .venv`)
- Use type hints on function signatures
- Docstrings on public functions (one-liner is fine for simple ones)
- Use `pathlib.Path` over `os.path`
- Use `httpx` over `requests` for async support
- Format with `black`, lint with `ruff` when available

## File Organization
- One module per concern — don't build monoliths
- Keep scripts in project-specific directories
- Shared utilities go in `~/projects/Agent/tools/`
- Research outputs go in `~/projects/Agent/research/`

## Secrets & Config
- All API keys and secrets in `.env` files
- Use `python-dotenv` to load them
- Never print or log secret values
- `.env` is always in `.gitignore`

## Dependencies
- Track dependencies in `requirements.txt` or `pyproject.toml`
- Pin versions for reproducibility (e.g., `httpx==0.27.0`)
- Keep dependency lists up to date when adding/removing packages

## Error Handling
- Fail loud in development — don't silently swallow errors
- Use retries with exponential backoff for API calls
- Log errors with enough context to debug without reproducing
