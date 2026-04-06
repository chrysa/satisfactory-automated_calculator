from __future__ import annotations

import json
import subprocess
from pathlib import Path

from sat_backend.models import WorldState


class ExtractorError(RuntimeError):
    """Raised when the Node.js parser subprocess fails or returns invalid JSON."""


def parse_save(
    save_path: Path,
    *,
    node_bin: str = "node",
    script_path: Path,
) -> WorldState:
    """Invoke parse-save-json.js as a subprocess and deserialize its output.

    Args:
        save_path: Absolute path to the .sav file.
        node_bin: Name or path of the node executable.
        script_path: Path to scripts/parse-save-json.js.

    Returns:
        A fully-validated WorldState instance.

    Raises:
        ExtractorError: If the subprocess exits with a non-zero code or
            its stdout is not valid JSON / does not match the WorldState schema.
    """
    result = subprocess.run(  # noqa: S603  # inputs are validated paths, not user shell strings
        [node_bin, str(script_path), str(save_path)],
        capture_output=True,
        text=True,
        timeout=120,
    )
    if result.returncode != 0:
        raise ExtractorError(
            f"Parser exited with code {result.returncode}: {result.stderr.strip()}"
        )
    try:
        data = json.loads(result.stdout)
    except json.JSONDecodeError as exc:
        raise ExtractorError(f"Invalid JSON from parser: {exc}") from exc

    return WorldState.model_validate(data)
