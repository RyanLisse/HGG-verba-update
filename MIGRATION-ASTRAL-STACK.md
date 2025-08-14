# Migration Plan: Adopt Astral tooling (uv, ruff, ty) and Qlty

This document outlines a practical, low-risk migration to the Astral Python toolchain
and Qlty for code quality orchestration.

Links:
- uv: https://docs.astral.sh/uv
- ruff: https://docs.astral.sh/ruff/
- ty (preview): https://docs.astral.sh/ty/
- Qlty: see ./qlty-docs-guide.md

## Goals
- Faster, reproducible Python workflows with uv
- Unified lint + format via ruff
- Early type checking feedback via ty (preview)
- Optional: Git-aware quality checks via Qlty

## Phases

### Phase 0: Baseline (no behavior change)
- Keep packaging as-is (setup.py + pyproject project table)
- Add configuration only:
  - pyproject.toml already includes [tool.ruff].
  - Added [tool.ty] with conservative defaults.
- Add this migration guide and link docs.

### Phase 1: Local developer workflows
- Install tooling with uvx (no global installs needed):
  - uvx ruff check
  - uvx ruff format
  - uvx ty check
  - uvx pytest
- Create a local .venv:
  - uv venv  # optional; or continue with your existing venv
- Install the project in editable mode for development:
  - uv pip install -e .[dev]

Suggested scripts (optional) in your shell or Makefile:
- make lint: uvx ruff check
- make fmt: uvx ruff format
- make typecheck: uvx ty check
- make test: uvx pytest

### Phase 2: CI smoke checks (non-breaking)
- Add a new GitHub Actions workflow (leave Docker workflow intact):
  - uses actions/setup-python to get CPython 3.10/3.11
  - Install uv via official install snippet
  - uv pip install -e .[dev]
  - uvx ruff check --output-format=github
  - uvx ty check
  - uvx pytest -q
- Optionally add Qlty action for PRs touching Python or frontend code.

### Phase 3: Packaging improvements (optional)
- Consider consolidating packaging to pyproject-only with Hatch or Setuptools.
- Switch base image to use uv in Dockerfile for faster builds:
  - FROM python:3.11
  - RUN curl -LsSf https://astral.sh/uv/install.sh | sh
  - COPY pyproject.toml .
  - RUN uv pip install .
  - COPY . .
- Keep behavior identical; measure build speed before and after.

## Known gaps / blockers
- Type checker maturity: ty is in preview. Keep mypy/pyright optional if you need stability.
- Mixed config: repository currently has setup.py and pyproject. This is okay; avoid large restructuring for now.
- Frontend: Node toolchain remains unchanged; consider Qlty to orchestrate eslint/prettier later.

## Commands reference
- Lint: uvx ruff check
- Format: uvx ruff format
- Type check: uvx ty check
- Tests: uvx pytest -q
- Install dev deps: uv pip install -e .[dev]

## Next steps checklist
- [ ] Run uvx ruff check and fix high-signal issues
- [ ] Run uvx ty check, add targeted ignores if needed in [tool.ty]
- [ ] Add a CI job for lint + typecheck + tests (Phase 2)
- [ ] Optionally integrate Qlty in CI

