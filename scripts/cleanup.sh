#!/usr/bin/env bash

set -euo pipefail

echo "🧹 Cleaning up existing processes and ports..."

# Function to safely kill processes on a port
cleanup_port() {
    local port=$1
    echo "  Cleaning up port $port..."
    
    # Multiple attempts to kill processes on the port
    for attempt in 1 2 3; do
        # Find and kill processes using the port
        if command -v lsof >/dev/null 2>&1; then
            local pids=$(lsof -ti :$port 2>/dev/null || true)
            if [ -n "$pids" ]; then
                echo "    Attempt $attempt: Killing processes: $pids"
                echo "$pids" | xargs kill -9 2>/dev/null || true
                sleep 3
            else
                break
            fi
        fi
        
        # Also try netstat approach on macOS
        if command -v netstat >/dev/null 2>&1; then
            local netstat_pids=$(netstat -anp tcp 2>/dev/null | grep ":$port " | awk '{print $9}' | cut -d'/' -f1 2>/dev/null || true)
            if [ -n "$netstat_pids" ]; then
                echo "    Attempt $attempt: Killing netstat processes: $netstat_pids"
                echo "$netstat_pids" | xargs kill -9 2>/dev/null || true
                sleep 3
            fi
        fi
    done
    
    # Wait for TIME_WAIT states to clear
    echo "    Waiting for port to be fully released..."
    sleep 5
    
    # Final verification
    if ! nc -z localhost $port 2>/dev/null; then
        echo "    ✅ Port $port is free"
    else
        echo "    ⚠️  Port $port may still be in use"
        # Force kill anything still on the port
        if command -v lsof >/dev/null 2>&1; then
            lsof -ti :$port 2>/dev/null | xargs kill -9 2>/dev/null || true
        fi
        sleep 2
    fi
}

# Function to cleanup specific process patterns
cleanup_processes() {
    local pattern=$1
    echo "  Cleaning up processes matching: $pattern"
    
    local pids=$(pgrep -f "$pattern" 2>/dev/null || true)
    if [ -n "$pids" ]; then
        echo "    Killing processes: $pids"
        echo "$pids" | xargs kill -TERM 2>/dev/null || true
        sleep 2
        # Force kill if still running
        local remaining=$(pgrep -f "$pattern" 2>/dev/null || true)
        if [ -n "$remaining" ]; then
            echo "    Force killing remaining processes: $remaining"
            echo "$remaining" | xargs kill -9 2>/dev/null || true
        fi
    fi
}

# Clean up specific ports
echo "📍 Cleaning up ports..."
cleanup_port 9000
cleanup_port 9001

# Clean up specific processes
echo "🔄 Cleaning up processes..."
cleanup_processes "webpack.*serve"
cleanup_processes "start-console"
cleanup_processes "node.*webpack"
cleanup_processes "python3.*http.server.*9001"

# Clean up any remaining yarn/npm processes related to our project
echo "📦 Cleaning up yarn/npm processes..."
cleanup_processes "yarn.*start"
cleanup_processes "npm.*start"

# More aggressive process cleanup
echo "🔪 Aggressive process cleanup..."
echo "  Killing any remaining webpack processes..."
pkill -f "webpack.*serve" 2>/dev/null || true
pkill -f "webpack-dev-server" 2>/dev/null || true
pkill -f "NODE_ENV=development.*webpack" 2>/dev/null || true

echo "  Killing any remaining yarn processes..."
pkill -f "yarn.*start" 2>/dev/null || true
pkill -f "yarn.*dev" 2>/dev/null || true

echo "  Killing any remaining node processes on our ports..."
# Kill any node processes that might be webpack servers
ps aux | grep -E "node.*webpack|webpack.*node" | grep -v grep | awk '{print $2}' | xargs kill -9 2>/dev/null || true

sleep 3

# Check podman containers
echo "🐳 Cleaning up containers..."
if command -v podman >/dev/null 2>&1; then
    # Stop any running console containers
    containers=$(podman ps -q --filter "ancestor=quay.io/openshift/origin-console" 2>/dev/null || true)
    if [ -n "$containers" ]; then
        echo "  Stopping console containers: $containers"
        echo "$containers" | xargs podman stop 2>/dev/null || true
    fi
    
    # Clean up any dangling containers
    podman container prune -f >/dev/null 2>&1 || true
fi

echo "✅ Cleanup completed!"

# Verify ports are free
echo "🔍 Verifying ports are available..."
for port in 9000 9001; do
    if ! nc -z localhost $port 2>/dev/null; then
        echo "  ✅ Port $port is available"
    else
        echo "  ❌ Port $port is still in use"
        exit 1
    fi
done

echo "🎉 All ports are clean and ready!" 