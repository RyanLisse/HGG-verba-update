# Verba Migration and Performance Optimization Guide

This document captures the dependency updates, async-safety improvements, Weaviate batching and concurrency controls, and recommended steps for future upgrades and tuning.

## 1) Dependency Updates

Updated key dependencies (locked via `uv`):
- fastapi: >= 0.112.0 (uv resolved 0.116.1)
- uvicorn[standard]: >= 0.30.0 (uv resolved 0.35.0)
- aiohttp: >= 3.10.2 (uv resolved 3.12.15)
- httpx: >= 0.27.0 (uv resolved 0.28.1)
- requests: >= 2.32.3 (uv resolved 2.32.4)
- scikit-learn: >= 1.5.2 (uv resolved 1.7.1)
- spaCy: >= 3.7.5 (uv resolved 3.8.7)
- tiktoken: >= 0.9.0
- numpy: pinned to >= 1.26,<2.0 for broad binary compatibility
- weaviate-client: latest 4.x (uv resolved 4.16.7)

Rationale:
- Keep pace with security fixes and performance improvements
- Ensure compatibility with Python 3.13 where possible
- Maintain NumPy < 2.0 to avoid ABI issues with compiled packages (spaCy, thinc)
- Stick to weaviate-client 4.x until 5.x is published and compatible

Upgrade steps:
- Update pyproject.toml constraints and run: `uv lock --upgrade`
- Run test suite: `uv run pytest -q`

## 2) Async-Safe Model Fetching

Problem:
- Some providers fetched model lists via blocking HTTP calls in code paths that can run in async contexts (or during initialization), causing potential event loop blocking or errors.

Solution:
- Switch to `aiohttp` for async HTTP and gate calls through `asyncio.run(...)` from sync code paths, with safe fallbacks when an event loop is already running.

Components updated:
- OpenAIEmbedder.get_models
- OpenAIGenerator.get_models
- CohereEmbedder.get_models
- GroqGenerator.get_models
- NovitaGenerator.get_models
- OllamaEmbedder.get_models
- LiteLLMGenerator.get_models

Behavior:
- If token/URL missing: return defaults
- If async fetch fails or a loop is already running: return defaults instead of blocking

## 3) Weaviate Batching and Concurrency

New environment variables:
- VERBA_EMBED_CONCURRENCY (default: 4)
  - Controls concurrent embedder requests during ingestion
- VERBA_WV_INSERT_BATCH (default: 1000)
  - Controls size of batches for Weaviate `insert_many`
- VERBA_WV_FETCH_BATCH (default: 250)
  - Controls chunked pagination when fetching vectors and PCA data

Where used:
- goldenverba/components/managers.py (batch_vectorize, ingestion insert_many, vector fetch loop)

Benefits:
- Smoother resource utilization, less provider throttling
- Adaptable throughput by environment (CI, local, prod)

## 4) Weaviate 5.x Upgrade Path (When Available)

Current status:
- PyPI `weaviate-client` has no resolvable 5.x yet; project is pinned to latest 4.x.

When 5.x becomes available:
1. Update pyproject constraint to `weaviate-client>=5.0.0`
2. `uv lock --upgrade`
3. Verify breaking changes across APIs used in managers.py:
   - Collections: `.data.insert`, `.data.insert_many`
   - Query: `.query.fetch_objects`, `.aggregate.over_all`
   - Timeout/AdditionalConfig equivalents
4. Run ingestion and retrieval smoke tests
5. If signatures changed, adapt calls accordingly (document changes here)

## 5) Retry/Backoff (Planned)

Add exponential backoff retries for Weaviate write/read paths on 429/5xx errors. Suggested policy:
- Exponential backoff with jitter: base=0.5s, factor=2, max=5 attempts
- Only retry on transient statuses (429, 502, 503, 504)

## 6) Frontend Bundle Analysis

How to generate:
- `cd frontend && ANALYZE=true pnpm build`
- Analyzer outputs to `.next/analyze/{client,edge,nodejs}.html`

Optimization tips:
- Dynamic import heavy visualization (DeckGL/Three.js) and disable SSR for them
- Avoid importing Three.js/DeckGL at top-level of pages; confine inside dynamic component
- Use `loading` fallbacks for improved UX
- Prefer vector/deck-only builds if feature parity is acceptable

## 7) Performance Tuning Recommendations

- Embedding concurrency
  - Start with VERBA_EMBED_CONCURRENCY=4, measure provider latency
  - Increase to 6–8 if headroom exists; reduce on rate limits
- Weaviate insert batch
  - Start with 1000; lower if memory pressure or network timeouts
- Fetch batch size
  - Keep at 250–500 for responsive UI when visualizing vectors
- Model list fetches
  - Keep async and resilient; avoid blocking UI/server startup

## 8) Breaking Changes / Migration Notes

- Some get_models functions now return defaults if online fetch fails or is unsafe to run synchronously
- Frontend visualizer moved to dynamic imports; ensure Node build has analyzer plugin installed
- spaCy loading moved to lazy import in document processing (reduces startup memory)

## 9) Validation

- `uv lock --upgrade` executed successfully
- `uv run pytest -q` passes non-ML tests; ML tests skipped on macOS
- `pnpm build` succeeds; with ANALYZE=true, bundle reports generated

---

If any step in this guide is unclear or you need more examples, please open an issue or ping the maintainers.

