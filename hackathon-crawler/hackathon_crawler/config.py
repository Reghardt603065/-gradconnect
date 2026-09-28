import json
import os
import time
from pathlib import Path
from urllib import parse as urllib_parse
from urllib import request as urllib_request


_GITHUB_OIDC_AUDIENCE = "gradconnect-crawler"
_cached_oidc_token = ""
_cached_oidc_expiry = 0


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

    Explicit process environment variables always win. GitHub Actions supplies
    production values directly, while the root .env keeps local testing easy.
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
    """Legacy/local fallback token.

    Production GitHub Actions authenticates with GitHub OIDC instead, so the
    GitHub workflow no longer needs HACKATHON_IMPORT_TOKEN as a repository secret.
    """
    load_project_env()
    return os.getenv("HACKATHON_IMPORT_TOKEN", "").strip()


def _decode_jwt_expiry(token: str) -> int:
    try:
        payload_part = token.split(".")[1]
        padding = "=" * ((4 - len(payload_part) % 4) % 4)
        import base64

        payload = json.loads(
            base64.urlsafe_b64decode(payload_part + padding).decode("utf-8")
        )
        return int(payload.get("exp") or 0)
    except Exception:
        return 0


def get_github_oidc_token() -> str:
    """Request a short-lived GitHub Actions OIDC token when running in Actions."""
    global _cached_oidc_token, _cached_oidc_expiry

    now = int(time.time())
    if _cached_oidc_token and _cached_oidc_expiry > now + 60:
        return _cached_oidc_token

    request_url = os.getenv("ACTIONS_ID_TOKEN_REQUEST_URL", "").strip()
    request_token = os.getenv("ACTIONS_ID_TOKEN_REQUEST_TOKEN", "").strip()

    if not request_url or not request_token:
        return ""

    separator = "&" if "?" in request_url else "?"
    oidc_url = (
        f"{request_url}{separator}audience="
        f"{urllib_parse.quote(_GITHUB_OIDC_AUDIENCE, safe='')}"
    )

    request = urllib_request.Request(
        oidc_url,
        headers={
            "Authorization": f"bearer {request_token}",
            "User-Agent": "GradConnectHackathonCrawler/1.0",
        },
    )

    with urllib_request.urlopen(request, timeout=20) as response:
        body = json.loads(response.read().decode("utf-8"))

    token = str(body.get("value") or "").strip()
    if not token:
        raise RuntimeError("GitHub OIDC provider did not return an ID token")

    _cached_oidc_token = token
    _cached_oidc_expiry = _decode_jwt_expiry(token)
    return token


def get_crawler_auth_headers() -> dict[str, str]:
    """Return production GitHub OIDC auth, falling back to the local shared token."""
    oidc_token = get_github_oidc_token()
    if oidc_token:
        return {
            "Authorization": f"Bearer {oidc_token}",
            "X-GradConnect-Crawler-Auth": "github-oidc",
        }

    import_token = get_import_token()
    if import_token:
        return {
            "Authorization": f"Bearer {import_token}",
            "X-GradConnect-Crawler-Token": import_token,
        }

    return {}
