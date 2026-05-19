---
'ePDS': patch
---

Railway monorepo deployments now use repository-root paths for rebuild filtering.

**Affects:** Operators

**Operators:** the Railway service config files under `packages/*/railway.toml` now use leading-slash `watchPatterns` and `dockerfilePath` values, such as `/packages/shared/**` and `/Dockerfile.auth`, so rebuild filtering is evaluated against repository-root paths even though each config file lives inside a package directory. No environment variable changes are required.
