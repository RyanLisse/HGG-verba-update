# ---------- Frontend build stage ----------
FROM node:22-alpine AS frontend
WORKDIR /app/frontend
COPY frontend/package.json frontend/pnpm-lock.yaml ./
RUN corepack enable && corepack prepare pnpm@latest --activate
RUN pnpm install --frozen-lockfile
COPY frontend/ .
RUN pnpm build

# ---------- Python build stage ----------
FROM ghcr.io/astral-sh/uv:python3.13-bookworm AS python-build
WORKDIR /app
# Copy only files needed to build and install the package
COPY pyproject.toml uv.lock README.md LICENSE ./
COPY goldenverba ./goldenverba
COPY MANIFEST.in ./

# Copy frontend export artifacts into the Python package path served by FastAPI
COPY --from=frontend /app/frontend/out ./goldenverba/server/frontend/out

# Install using uv (PEP 517/518 via pyproject)
RUN uv pip install --no-cache .

# ---------- Runtime stage ----------
FROM ghcr.io/astral-sh/uv:python3.11-bookworm
ENV PYTHONUNBUFFERED=1
WORKDIR /app
RUN apt-get update && apt-get install -y curl ca-certificates && rm -rf /var/lib/apt/lists/*
# uv images set up a venv at /opt/venv and PATH accordingly; copy everything from build layer
COPY --from=python-build /opt/venv /opt/venv

EXPOSE 8000
# Run the installed console script within the venv
CMD ["verba", "start", "--port", "8000", "--host", "0.0.0.0"]
