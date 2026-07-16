---
name: architecture-guard
description: >-
  Guard Clean / Hexagonal / DDD boundaries for app/knowledge. Use when adding
  modules, ports, adapters, or reviewing dependency direction against Project1
  architecture philosophy.
disable-model-invocation: true
---

# Architecture Guard

## Checklist

1. Does `domain` import anything under `app/knowledge/*`? If yes — reject.
2. Does business logic import a concrete adapter (JSON/PG/OpenSearch/SDK)?
   If yes — move wiring to `composition`.
3. Are new capabilities introduced as an interface first when multiple
   implementations are plausible?
4. Are cross-cutting modules (`evaluation`, `observability`, `reliability`,
   `security`) kept out of the production business dependency graph?
5. Is the change documented (or explicitly deferred) under `docs/`?

## References

- `docs/architecture.md`
- `docs/modules.md`
- `.cursor/rules/architecture.mdc`
