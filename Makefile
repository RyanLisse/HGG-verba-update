# Developer convenience with uv + ruff + ty + pytest

.PHONY: install-dev lint fmt typecheck test ci dev local-setup dev-frontend dev-backend dev kill-ports

install-dev:
	uv pip install -e .[dev]

# --- Local Development (without Docker) ---

# Install all dependencies for local development
local-setup: install-dev
	cd frontend && pnpm install

# Start frontend development server on port 2025
dev-frontend: kill-ports
	cd frontend && pnpm dev

# Start backend development server on port 8000 (fallback method)
dev-backend: kill-ports
	uv run uvicorn goldenverba.server.api:app --host localhost --port 8000 --reload || echo "Backend failed to start - check dependencies"

# Start both frontend and real backend (using direct uvicorn call)
dev: kill-ports
	@echo "Starting development servers..."
	@echo "Backend: uvicorn on port 8000"
	@echo "Frontend: Next.js on port 2025"
	@(cd frontend && pnpm dev) & \
	uvicorn goldenverba.server.api:app --host 0.0.0.0 --port 8000 --reload

# Start frontend with mock API (fallback when backend has issues)
dev-mock: kill-ports
	@./start-local.sh --mock

# Start both frontend and real backend using script (legacy)
dev-real: kill-ports
	@./start-local.sh

lint:
	uvx ruff check

fmt:
	uvx ruff format

# Ty is in preview; treat as advisory locally
typecheck:
	uvx ty check || true

test:
	uvx pytest -q

ci: install-dev lint
	uvx ruff format --check
	uvx ty check || true
	uvx pytest -q



# Kill any processes listening on dev ports (8000 backend, 2025 frontend)
.PHONY: kill-ports
kill-ports:
	@echo "Ensuring ports 8000 and 2025 are free..."
	@# Port 8000 (backend)
	- @PIDS=$$(lsof -n -iTCP:8000 -sTCP:LISTEN -t 2>/dev/null || true); \
	 if [ -n "$$PIDS" ]; then \
	   echo "Killing processes on port 8000: $$PIDS"; \
	   kill $$PIDS 2>/dev/null || true; \
	   sleep 1; \
	   PIDS2=$$(lsof -n -iTCP:8000 -sTCP:LISTEN -t 2>/dev/null || true); \
	   if [ -n "$$PIDS2" ]; then echo "Force killing: $$PIDS2"; kill -9 $$PIDS2 2>/dev/null || true; fi; \
	 else \
	   echo "Port 8000 is free"; \
	 fi
	@# Port 2025 (frontend)
	- @PIDS=$$(lsof -n -iTCP:2025 -sTCP:LISTEN -t 2>/dev/null || true); \
	 if [ -n "$$PIDS" ]; then \
	   echo "Killing processes on port 2025: $$PIDS"; \
	   kill $$PIDS 2>/dev/null || true; \
	   sleep 1; \
	   PIDS2=$$(lsof -n -iTCP:2025 -sTCP:LISTEN -t 2>/dev/null || true); \
	   if [ -n "$$PIDS2" ]; then echo "Force killing: $$PIDS2"; kill -9 $$PIDS2 2>/dev/null || true; fi; \
	 else \
	   echo "Port 2025 is free"; \
	 fi


# --- Frontend build (ensures UI assets are available) ---
.PHONY: frontend-build
frontend-build:
	cd frontend && pnpm install && pnpm build:local

# --- Docker convenience targets ---
IMAGE ?= goldenverba:local
CONTAINER_NAME ?= goldenverba
PORT ?= 8000

.PHONY: docker-build docker-build-nocache docker-run docker-run-env docker-stop docker-logs docker-shell

# Build the Docker image (depends on frontend build so UI is served)
docker-build: frontend-build
	docker build -t $(IMAGE) .

# Build without cache
docker-build-nocache: frontend-build
	docker build --no-cache -t $(IMAGE) .

# Run the container exposing the API/UI on localhost:$(PORT)
docker-run:
	docker run --rm -p $(PORT):8000 --name $(CONTAINER_NAME) $(IMAGE)

# Run the container with an .env file (if present)
docker-run-env:
	docker run --rm --env-file .env -p $(PORT):8000 --name $(CONTAINER_NAME) $(IMAGE)

# Stop the running container
docker-stop:
	- docker stop $(CONTAINER_NAME) >/dev/null 2>&1 || true

# Tail logs
docker-logs:
	docker logs -f $(CONTAINER_NAME)

# Open a shell inside the container
DOCKER_SHELL ?= /bin/bash
docker-shell:
	docker run --rm -it --entrypoint $(DOCKER_SHELL) $(IMAGE)

# Default help target
.PHONY: help
help:
	@echo "Available targets:"
	@echo ""
	@echo "Local Development (without Docker):"
	@echo "  local-setup       - Install all dependencies for local development"
	@echo "  dev-frontend      - Start frontend dev server (port 2025)"
	@echo "  dev-backend       - Start backend dev server (port 8000)"
	@echo "  dev               - Start both frontend and backend servers"
	@echo ""
	@echo "Development Tools:"
	@echo "  install-dev       - Install dev deps with uv"
	@echo "  lint              - Ruff lint"
	@echo "  fmt               - Ruff format"
	@echo "  typecheck         - Ty (preview)"
	@echo "  test              - Run tests"
	@echo "  ci                - Lint/format/typecheck/tests"
	@echo ""
	@echo "Build & Docker:"
	@echo "  frontend-build    - Build the Next.js frontend"
	@echo "  docker-build      - Build Docker image (includes frontend-build)"
	@echo "  docker-build-nocache - Build Docker image without cache"
	@echo "  docker-run        - Run container on port $(PORT)"
	@echo "  docker-run-env    - Run container with .env"
	@echo "  docker-stop       - Stop running container"
	@echo "  docker-logs       - Tail container logs"
	@echo "  docker-shell      - Shell into image using $(DOCKER_SHELL)"


# --- Ultracite (frontend) ---
.PHONY: frontend-ultracite-init frontend-ultracite-check frontend-ultracite-fix
frontend-ultracite-init:
	cd frontend && pnpm dlx ultracite init --pm pnpm --editors vscode --remove-prettier --remove-eslint

frontend-ultracite-check:
	cd frontend && pnpm dlx ultracite check

frontend-ultracite-fix:
	cd frontend && pnpm dlx ultracite fix
