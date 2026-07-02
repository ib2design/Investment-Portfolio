# Release plan

Single source of truth for what ships in each production version. When working on a release, refer to the version file below — **v2 includes everything in v1**, v3 includes v2, and so on.

| Version | Status | Branch / tag | Doc |
|---------|--------|--------------|-----|
| v1 | Planned | `release/v1` → `v1.0.0` | [docs/releases/v1.md](docs/releases/v1.md) |
| v2 | Planned | `release/v2` → `v2.0.0` | [docs/releases/v2.md](docs/releases/v2.md) |
| v3 | Planned | `release/v3` → `v3.0.0` | [docs/releases/v3.md](docs/releases/v3.md) |

## How we use this

- **`main`** — full app; all features stay here.
- **Release branch** — branched from `main`, stripped to match the version doc.
- **Tag** — mark what was deployed (e.g. `v1.0.0`).
- **New release work** — say e.g. “implement v2 per `docs/releases/v2.md`”; prior versions are defined in their docs.

## Deploy notes

- Production: Netlify (manual deploy from tagged commit).
- Bump `app-version` / `code-version` in `index.html` and cache-bust `?v=` on CSS/JS each release.
