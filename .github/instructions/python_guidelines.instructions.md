---
applyTo: "**/*.py"
description: "Python coding guidelines for chrysa projects"
---
# Python Guidelines

## Language version

- **Python 3.12+** (target 3.14, retro-compatible 3.12)
- Use `from __future__ import annotations` in every Python file
- Use built-in generics: `list[str]`, `dict[str, int]`, `tuple[str, ...]`
- Use `|` for unions: `str | None` (not `Optional[str]`)

## Typing

- ALL public functions must have complete type annotations
- No `Any` unless absolutely necessary
- Use `Final` for constants
- `if typing.TYPE_CHECKING:` for conditional imports

## Code style

- Enforce via **ruff** — zero-tolerance policy
- `argv` pattern: `main(argv: Sequence[str] | None = None)`
- No `shell=True` in subprocess without justification
- Prefer `logging` over `print` in production code

## Testing

- pytest, 100% tests passing before commit
- No `@pytest.mark.skip` without documented reason

---

## Structure Rules (from Notion Engineering Standards 2026-05-21)

- **One class per file.** Each class lives in its own module (e.g. `models/user.py` contains only `User`).
- **Domain-driven structure.** Organise by domain (`connectors/`, `services/`, `schemas/`) — not by layer.
- **No `print()` in production.** Use `structlog` or `logging` with JSON formatter.
