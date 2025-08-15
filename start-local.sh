#!/bin/bash

# Verba Local Development Startup Script
# Starts frontend and either the real backend or a mock API server.
# Use `USE_MOCK_API=1 make dev` or `./start-local.sh --mock` to force the mock API.

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
	echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
	echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
	echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
	echo -e "${RED}[ERROR]${NC} $1"
}

# Parse args / env
USE_MOCK=${USE_MOCK_API:-0}
if [[ "$1" == "--mock" ]]; then
  USE_MOCK=1
fi

# Function to check if a command exists
command_exists() {
	command -v "$1" >/dev/null 2>&1
}

# Function to check if a port is in use
port_in_use() {
	lsof -i :"$1" >/dev/null 2>&1
}

# Function to cleanup background processes
cleanup() {
	print_status "Shutting down services..."
	if [ ! -z "$FRONTEND_PID" ]; then
		kill $FRONTEND_PID 2>/dev/null || true
	fi
	if [ ! -z "$BACKEND_PID" ]; then
		kill $BACKEND_PID 2>/dev/null || true
	fi
	exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

print_status "Starting Verba Local Development Environment"

# Check for required tools
if ! command_exists pnpm; then
	print_error "pnpm is not installed. Please install pnpm first."
	exit 1
fi

if ! command_exists uv && [ "$USE_MOCK" != "1" ]; then
	print_error "uv is not installed. Please install uv first (or run with USE_MOCK_API=1)."
	exit 1
fi

# Check if ports are available
if port_in_use 2025; then
	print_warning "Port 2025 is already in use. Frontend may fail to start."
fi

if port_in_use 8000; then
	print_warning "Port 8000 is already in use. Backend/Mock may fail to start."
fi

# Install dependencies if needed
print_status "Checking dependencies..."

if [ ! -d "frontend/node_modules" ]; then
	print_status "Installing frontend dependencies..."
	cd frontend && pnpm install && cd ..
fi

if [ "$USE_MOCK" != "1" ]; then
  # Check if Python backend is installed
  if ! uv run verba --help >/dev/null 2>&1; then
  	print_status "Installing Python backend dependencies..."
  	uv pip install -e .[dev]
  fi
fi

print_success "Dependencies ready!"

# --- Start backend or mock ---
if [ "$USE_MOCK" = "1" ]; then
  print_status "Starting mock API server on port 8000..."
  python3 mock_api_server.py &
  BACKEND_PID=$!
else
  print_status "Starting backend server on port 8000..."
  uv run verba start &
  BACKEND_PID=$!
  # Give backend a moment to start and verify it's alive; if not, fall back to mock
  sleep 3
  if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
    print_warning "Backend failed to start; falling back to mock API server..."
    python3 mock_api_server.py &
    BACKEND_PID=$!
  fi
fi

# Start frontend dev server
print_status "Starting frontend development server on port 2025..."
cd frontend && pnpm dev &
FRONTEND_PID=$!
cd ..

# Give frontend a moment to start
sleep 3

print_success "Local development environment started!"
echo ""
print_status "Services running:"
echo "  Frontend: http://localhost:2025"
echo "  API:      http://localhost:8000 (mock=${USE_MOCK})"
echo ""
print_status "Press Ctrl+C to stop all services"

# Wait for background processes
wait
