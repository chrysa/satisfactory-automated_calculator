from __future__ import annotations

from pathlib import Path
from typing import Final

from pydantic_settings import BaseSettings, SettingsConfigDict

_PROJECT_ROOT: Final[Path] = Path(__file__).resolve().parents[4]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="SAT_", env_file=".env", extra="ignore")

    database_url: str = "postgresql+asyncpg://sat:sat@localhost:5432/sat"
    node_bin: str = "node"
    node_script_path: Path = _PROJECT_ROOT / "scripts" / "parse-save-json.js"


_settings: Settings | None = None


def get_settings() -> Settings:
    global _settings  # noqa: PLW0603  # module-level singleton
    if _settings is None:
        _settings = Settings()
    return _settings
