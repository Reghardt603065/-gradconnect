import os
from pathlib import Path


def _load_env_file(path: Path) -> None:
    """Load simple KEY=value pairs without overwriting existing environment values."""
    if not path.is_file():
        return

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()

        if not line or line.startswith("#") or "=" not in line:
            continue

        if line.startswith("export "):
            line = line[7:].strip()

        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip()

        if not key:
            continue

        if (
            len(value) >= 2
            and value[0] == value[-1]
            and value[0] in {"'", '"'}
        ):
            value = value[1:-1]

        os.environ.setdefault(key, value)


def load_project_env() -> None:
    """Try the normal GradConnect locations for the root .env file.

    Explicit process environment variables always win. This lets Scrapyd inherit
    production values while still making the local Windows setup easy.
    """
    candidates: list[Path] = []

    explicit_file = os.getenv("GRADCONNECT_ENV_FILE")
    if explicit_file:
        candidates.append(Path(explicit_file).expanduser())

    cwd = Path.cwd().resolve()
    candidates.extend(
        [
            cwd / ".env",
            cwd.parent / ".env",
        ]
    )

    source_file = Path(__file__).resolve()
    candidates.extend(parent / ".env" for parent in source_file.parents)

    seen: set[Path] = set()
    for candidate in candidates:
        try:
            resolved = candidate.resolve()
        except OSError:
            resolved = candidate

        if resolved in seen:
            continue

        seen.add(resolved)
        _load_env_file(resolved)


def get_gradconnect_api_url() -> str:
    load_project_env()
    return os.getenv("GRADCONNECT_API_URL", "http://localhost:3000").rstrip("/")


def get_import_token() -> str:
    load_project_env()
    return os.getenv("HACKATHON_IMPORT_TOKEN", "").strip()
