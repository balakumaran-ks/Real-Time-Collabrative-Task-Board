# Contributing

This is a portfolio project, but it is run like a real one. If you fork it or
work on it, these are the conventions.

## Workflow

1. Branch from `main`: `feat/<short-name>`, `fix/<short-name>`, `docs/<short-name>`.
2. Keep commits focused; use [Conventional Commits](https://www.conventionalcommits.org/)
   (`feat: add card PATCH with version check`, `fix: dedupe presence per user`, `docs: add ADR-0006`).
3. Open a pull request using the template; link the build step / ADR it relates to.
4. CI must pass: the frontend workflow (`oxlint`, `tsc -b && vite build`) runs today; add the backend jobs (lint → typecheck → unit → integration → contract) when the backend lands.

## Design changes go through an ADR

If a change alters an architectural decision (storage, delivery guarantees,
public contract), add or supersede an ADR in [`docs/adr/`](docs/adr/) in the
same PR. Update the affected diagrams in
[`docs/DIAGRAMS.md`](docs/DIAGRAMS.md) and the contract in
[`docs/openapi.yaml`](docs/openapi.yaml) — docs are part of the deliverable,
not an afterthought.

## Diagrams

Diagrams are Mermaid text so they diff cleanly. Preview locally with the
[Mermaid Live Editor](https://mermaid.live) or the VS Code "Markdown Preview
Mermaid Support" extension. The overview image
(`docs/assets/architecture-diagram.png`) is generated from the HTML next to it —
re-screenshot it when the architecture changes.

## Code style

- `.editorconfig` is authoritative for whitespace.
- Validate every external input at the edge; parameterised SQL only. Field names must match `frontend/src/lib/types.ts` exactly.
- No secrets in the repo — extend `backend/.env.example` instead.
