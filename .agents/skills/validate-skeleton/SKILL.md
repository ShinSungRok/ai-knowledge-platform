---
name: validate-skeleton
description: >-
  Run and interpret AI Knowledge Platform Task 1 skeleton validation
  (pnpm validate:skeleton / pnpm validate). Use when checking project
  structure integrity, barrel exports, docs presence, or closing Task 1.
disable-model-invocation: true
---

# Validate Skeleton

## When to use

- After creating or changing the project skeleton
- Before committing Task 1
- When asked whether the repository is validation-capable

## Steps

1. From the repo root, run:

```bash
pnpm install
pnpm validate
```

2. Confirm both succeed:
   - `validate:skeleton` — required paths, module barrels, package scripts
   - `typecheck` — `tsc --noEmit`

3. If validation fails, fix the missing path/export/script and re-run.
   Do not add product features to make validation pass.

## Success criteria

- Exit code 0
- Console ends with `Skeleton validation succeeded.`
- No TypeScript errors
