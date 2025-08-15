#!/bin/bash

# Verba Development Startup Script
# Starts both frontend (Next.js) and backend (FastAPI) services

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default ports
FRONTEND_PORT=2025
BACKEND_PORT=8000

# Function to print colored output
print_info() {
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

# Function to check if a port is in use
check_port() {
	local port=$1
	if lsof -Pi :"$port" -sTCP:LISTEN -t >/dev/null 2>&1; then
		return 0 # Port is in use
	else
		return 1 # Port is free
	fi
}

# Function to kill processes on specific ports
kill_port_processes() {
	local port=$1
	local pids
	pids=$(lsof -ti:"$port" 2>/dev/null || true)
	if [ -n "$pids" ]; then
		print_warning "Killing existing processes on port $port: $pids"
		echo "$pids" | xargs kill -9 2>/dev/null || true
		sleep 2
	fi
}

# Function to cleanup on exit
cleanup() {
	print_info "Shutting down development services..."

	# Kill background jobs started by this script
	jobs -p | xargs -r kill 2>/dev/null || true

	# Kill processes on our ports
	kill_port_processes "$FRONTEND_PORT"
	kill_port_processes "$BACKEND_PORT"

	print_success "Development services stopped"
	exit 0
}

# Trap cleanup on script exit
trap cleanup EXIT INT TERM

# Check if we're in the right directory
if [ ! -f "pyproject.toml" ] || [ ! -d "frontend" ]; then
	print_error "This script must be run from the root of the Verba project"
	exit 1
fi

print_info "Starting Verba Development Environment"
print_info "Frontend will be available at: http://localhost:$FRONTEND_PORT"
print_info "Backend will be available at: http://localhost:$BACKEND_PORT"
print_info "Press Ctrl+C to stop all services"

# Check and clean up existing processes
if check_port "$FRONTEND_PORT"; then
	print_warning "Port $FRONTEND_PORT is already in use"
	kill_port_processes "$FRONTEND_PORT"
fi

if check_port "$BACKEND_PORT"; then
	print_warning "Port $BACKEND_PORT is already in use"
	kill_port_processes "$BACKEND_PORT"
fi

# Check for required tools
print_info "Checking prerequisites..."

# Check for pnpm
if ! command -v pnpm &>/dev/null; then
	print_error "pnpm is not installed. Please install it first:"
	print_error "npm install -g pnpm"
	exit 1
fi

# Check for Python and uv
if ! command -v python3 &>/dev/null; then
	print_error "python3 is not installed"
	exit 1
fi

if ! command -v uv &>/dev/null; then
	print_error "uv is not installed. Please install it first:"
	print_error "curl -LsSf https://astral.sh/uv/install.sh | sh"
	exit 1
fi

# Create logs directory if it doesn't exist
mkdir -p logs

print_success "Prerequisites check passed"

# Install dependencies if needed
print_info "Installing dependencies..."

# Install frontend dependencies
if [ ! -d "frontend/node_modules" ]; then
	print_info "Installing frontend dependencies..."
	cd frontend && pnpm install && cd ..
fi

# Install backend dependencies
if [ ! -d "venv" ]; then
	print_info "Creating Python virtual environment and installing dependencies..."
	uv venv
	# shellcheck disable=SC1091
	source venv/bin/activate
	uv pip install -e .[dev]
else
	print_info "Activating Python virtual environment..."
	# shellcheck disable=SC1091
	source venv/bin/activate
fi

print_success "Dependencies installed"

# Start backend service
print_info "Starting backend service (FastAPI)..."
(
	current_dir=$(pwd)
	export PYTHONPATH="${PYTHONPATH}:${current_dir}"
	cd goldenverba
	python -m goldenverba.server.cli start --host 0.0.0.0 --port "$BACKEND_PORT"
) >logs/backend.log 2>&1 &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 3

# Check if backend started successfully
if ! kill -0 $BACKEND_PID 2>/dev/null; then
	print_error "Backend failed to start. Check logs/backend.log for details"
	cat logs/backend.log
	exit 1
fi

# Start frontend service
print_info "Starting frontend service (Next.js)..."
(
	cd frontend
	pnpm dev
) >logs/frontend.log 2>&1 &
FRONTEND_PID=$!

# Wait a moment for frontend to start
sleep 5

# Check if frontend started successfully
if ! kill -0 $FRONTEND_PID 2>/dev/null; then
	print_error "Frontend failed to start. Check logs/frontend.log for details"
	cat logs/frontend.log
	exit 1
fi

# Wait for services to be fully ready
print_info "Waiting for services to be ready..."
sleep 5

# Health check for backend
if curl -s "http://localhost:$BACKEND_PORT/health" >/dev/null 2>&1; then
	print_success "Backend is running at http://localhost:$BACKEND_PORT"
else
	print_warning "Backend health check failed, but service appears to be running"
fi

# Health check for frontend
if curl -s "http://localhost:$FRONTEND_PORT" >/dev/null 2>&1; then
	print_success "Frontend is running at http://localhost:$FRONTEND_PORT"
else
	print_warning "Frontend health check failed, but service appears to be running"
fi

print_success "Development environment is ready!"
print_info "Access the application at: http://localhost:$FRONTEND_PORT"
print_info "API documentation at: http://localhost:$BACKEND_PORT/docs"
print_info ""
print_info "Logs are available in:"
print_info "  - Frontend: logs/frontend.log"
print_info "  - Backend: logs/backend.log"
print_info ""
print_warning "Press Ctrl+C to stop all services"

# Keep the script running and wait for processes
wait "$FRONTEND_PID" "$BACKEND_PID"
