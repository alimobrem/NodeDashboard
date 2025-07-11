#!/usr/bin/env bash

set -euo pipefail

echo "💥 Nuclear Cleanup - Aggressively cleaning everything..."

# Kill ALL webpack and yarn processes
echo "🔪 Killing ALL webpack and yarn processes..."
pkill -f "webpack" 2>/dev/null || true
pkill -f "yarn.*start" 2>/dev/null || true
pkill -f "node.*9001" 2>/dev/null || true
pkill -f "node.*9000" 2>/dev/null || true
pkill -f "python3.*http.server" 2>/dev/null || true

# Wait for processes to die
sleep 5

# Force kill anything still using our ports
echo "💀 Force killing anything on ports 9000 and 9001..."
for port in 9000 9001; do
    echo "  Force cleaning port $port..."
    
    # Try multiple methods to find and kill processes
    lsof -ti :$port 2>/dev/null | xargs kill -9 2>/dev/null || true
    fuser -k $port/tcp 2>/dev/null || true
    
    # Wait and check again
    sleep 2
    
    if lsof -i :$port >/dev/null 2>&1; then
        echo "    Port $port still occupied, trying harder..."
        # Get all processes using the port
        lsof -i :$port 2>/dev/null | awk 'NR>1 {print $2}' | xargs kill -9 2>/dev/null || true
        sleep 3
    fi
done

# Clean webpack and node caches
echo "🧹 Cleaning webpack and node caches..."
rm -rf node_modules/.cache 2>/dev/null || true
rm -rf .webpack_cache 2>/dev/null || true
rm -rf dist 2>/dev/null || true

# Clean yarn cache for this project
echo "🧹 Cleaning yarn cache..."
yarn cache clean 2>/dev/null || true

# Stop all podman containers
echo "🐳 Stopping all containers..."
if command -v podman >/dev/null 2>&1; then
    podman stop --all 2>/dev/null || true
    podman container prune -f 2>/dev/null || true
fi

# Final wait
sleep 5

# Verify ports are free
echo "🔍 Final verification..."
for port in 9000 9001; do
    if ! lsof -i :$port >/dev/null 2>&1 && ! nc -z localhost $port 2>/dev/null; then
        echo "  ✅ Port $port is FREE"
    else
        echo "  ❌ Port $port is STILL OCCUPIED"
        lsof -i :$port 2>/dev/null || true
    fi
done

echo "💥 Nuclear cleanup completed!" 