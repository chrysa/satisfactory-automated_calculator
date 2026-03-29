---
applyTo: "**/*.py"
description: "Ruff compliance rules"
---
# Ruff Compliance

## Configuration

Ruff config lives in `ruff.toml` or `config-tools/ruff.toml`.

## Zero-tolerance rules

- Run `ruff check --fix` before every commit
- Run `ruff format` for formatting
- No `# noqa` without a comment explaining why

## Key rules enforced

- `ANN` — all public functions typed
- `B` — bugbear checks
- `E`, `W` — pycodestyle
- `F` — pyflakes
- `I` — isort (via ruff)
- `S` — bandit security
- `UP` — pyupgrade (Python 3.12+ syntax)
