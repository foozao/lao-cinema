#!/bin/bash
# Start all development servers

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_service() {
    echo -e "${BLUE}[$1]${NC} $2"
}

# Check if a port is in use
port_in_use() {
    lsof -i :$1 >/dev/null 2>&1
}

# Kill process on port
kill_port() {
    if port_in_use $1; then
        log_info "Killing process on port $1..."
        lsof -ti :$1 | xargs kill -9 2>/dev/null || true
        sleep 1
    fi
}

# Cleanup function
cleanup() {
    echo ""
    log_info "Shutting down services..."
    kill_port 3000
    kill_port 3001
    kill_port 3002
    exit 0
}

# Trap Ctrl+C
trap cleanup SIGINT SIGTERM

echo ""
echo "🎬 Lao Cinema Development Environment"
echo "======================================"
echo ""

# Check if node_modules exist
if [ ! -d "web/node_modules" ]; then
    log_info "Installing web dependencies..."
    (cd web && npm install)
fi

if [ ! -d "api/node_modules" ]; then
    log_info "Installing API dependencies..."
    (cd api && npm install)
fi

if [ ! -d "video-server/node_modules" ]; then
    log_info "Installing video server dependencies..."
    (cd video-server && npm install)
fi

# Start services
log_info "Starting services..."
echo ""

# Start Video Server (port 3002)
log_service "VIDEO" "Starting on port 3002..."
(cd video-server && npm run dev) &
VIDEO_PID=$!
sleep 2

# Start API (port 3001)
log_service "API" "Starting on port 3001..."
(cd api && npm run dev) &
API_PID=$!
sleep 2

# Start Web (port 3000)
log_service "WEB" "Starting on port 3000..."
(cd web && npm run dev) &
WEB_PID=$!

echo ""
echo "======================================"
log_info "All services starting!"
echo ""
echo "  🌐 Web App:      http://localhost:3000"
echo "  🔌 API:          http://localhost:3001"
echo "  🎬 Video Server: http://localhost:3002"
echo ""
echo "Press Ctrl+C to stop all services"
echo "======================================"
echo ""

# Wait for any process to exit
wait
