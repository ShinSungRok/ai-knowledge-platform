# Portfolio / Project Intent

## 1. What this is

**AI Knowledge Platform** is a production-shaped TypeScript backend for
knowledge retrieval and grounded question answering. It inherits the Clean /
Hexagonal / DDD architecture philosophy proven in Project1 (`public-law-ai`),
generalized beyond a single legal domain.

## 2. What Task 1 delivers

A **validation-capable project skeleton**:

- Module boundaries under `app/knowledge/*`
- Docs, tests, scripts, and docker layout
- Cursor rules and agent skills for architectural guardrails
- Minimal TypeScript tooling (`typescript`, `tsx`, `@types/node`)

No product features are implemented in Task 1.

## 3. Skills this project will demonstrate (roadmap)

- Clean / Hexagonal backend design with a single composition root
- Pluggable search, retrieval, and AI provider ports
- Dependency-free validation runners
- Observability, reliability, and security foundations
- Evaluation and regression quality gates

## 4. Relationship to Project1

| Concern | Project1 (`public-law-ai`) | This project |
|---|---|---|
| Domain | Korean legal statutes / cases | General knowledge documents |
| Architecture | Clean / Hexagonal / DDD | Same philosophy |
| Validation | `tsx` runners, fake adapters | Same approach |
| Goal | Portfolio RAG backend + UI | Broader knowledge platform skeleton → product |
