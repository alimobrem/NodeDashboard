#!/usr/bin/env bash

set -euo pipefail

PLUGIN_PORT=${PLUGIN_PORT:-9001}
MAX_RETRIES=${MAX_RETRIES:-2}
RETRY_DELAY=${RETRY_DELAY:-5}

echo "🚀 Starting Node Dashboard Plugin (Fixed Version)..."

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Change to project directory
cd "$PROJECT_ROOT"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Are you in the plugin directory?"
    exit 1
fi

# Function to check if plugin is running
check_plugin_running() {
    local port=$1
    curl -s -o /dev/null -w "%{http_code}" "http://localhost:$port/plugin-manifest.json" 2>/dev/null || echo "000"
}

# Function to nuclear cleanup before start
nuclear_cleanup() {
    echo "💥 Nuclear cleanup before starting..."
    if [ -f "$SCRIPT_DIR/nuclear-cleanup.sh" ]; then
        bash "$SCRIPT_DIR/nuclear-cleanup.sh"
    else
        echo "🧹 Basic cleanup..."
        pkill -f "webpack" 2>/dev/null || true
        pkill -f "yarn.*start" 2>/dev/null || true
        rm -rf node_modules/.cache 2>/dev/null || true
        rm -rf dist 2>/dev/null || true
        sleep 3
    fi
}

# Function to wait for plugin to be ready
wait_for_plugin() {
    local port=$1
    local max_wait=60
    local count=0
    
    echo "⏳ Waiting for plugin to be ready on port $port..."
    echo "  (This may take up to $max_wait seconds for webpack to compile)"
    
    # Give webpack time to start
    sleep 10
    
    while [ $count -lt $max_wait ]; do
        local status=$(check_plugin_running $port)
                 if [ "$status" = "200" ]; then
             echo "✅ Plugin is ready!"
             # Test that we can actually get the manifest
             local manifest=$(curl -s "http://localhost:$port/plugin-manifest.json" 2>/dev/null)
             if [[ "$manifest" == *"\"name\":"* ]] && [[ "$manifest" == *"node-dashboard"* ]]; then
                 echo "✅ Plugin manifest is valid!"
                 return 0
             else
                 echo "⚠️  Plugin responding but manifest invalid, continuing to wait..."
                 echo "    Manifest content: $(echo "$manifest" | head -1)"
             fi
         fi
        
        echo "  Status: $status, waiting... ($count/$max_wait)"
        sleep 3
        count=$((count + 3))
    done
    
    echo "❌ Plugin failed to start within $max_wait seconds"
    return 1
}

# Function to start the plugin
start_plugin() {
    echo "🔧 Starting webpack development server..."
    
    # Clear cache and build artifacts
    echo "🧹 Clearing cache and build artifacts..."
    rm -rf node_modules/.cache 2>/dev/null || true
    rm -rf .webpack_cache 2>/dev/null || true
    rm -rf dist 2>/dev/null || true
    
    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        echo "📦 Installing dependencies..."
        yarn install --cache-folder .yarn-cache-temp
        rm -rf .yarn-cache-temp 2>/dev/null || true
    fi
    
    # Start the development server with explicit config
    echo "🚀 Starting webpack server on port $PLUGIN_PORT..."
    
    # Use nohup to ensure it stays running
    nohup yarn start > webpack.log 2>&1 &
    local webpack_pid=$!
    
    echo "  Webpack PID: $webpack_pid"
    echo "  Port: $PLUGIN_PORT"
    echo "  Logs: webpack.log"
    
    # Wait for the plugin to be ready
    if wait_for_plugin $PLUGIN_PORT; then
        echo "🎉 Plugin started successfully!"
        echo "📍 Plugin URL: http://localhost:$PLUGIN_PORT"
        echo "📋 Plugin Manifest: http://localhost:$PLUGIN_PORT/plugin-manifest.json"
        echo "📝 Logs: tail -f webpack.log"
        return 0
    else
        echo "❌ Plugin failed to start"
        echo "📝 Last 20 lines of webpack.log:"
        tail -20 webpack.log 2>/dev/null || echo "No log file found"
        kill $webpack_pid 2>/dev/null || true
        return 1
    fi
}

# Run nuclear cleanup first
nuclear_cleanup

# Main startup logic with retries
retry_count=0
while [ $retry_count -lt $MAX_RETRIES ]; do
    echo "🔄 Attempt $((retry_count + 1)) of $MAX_RETRIES"
    
    if start_plugin; then
        echo "✅ Plugin startup successful!"
        exit 0
    else
        retry_count=$((retry_count + 1))
        if [ $retry_count -lt $MAX_RETRIES ]; then
            echo "⏰ Retrying in $RETRY_DELAY seconds..."
            echo "🧹 Cleaning up before retry..."
            pkill -f "webpack" 2>/dev/null || true
            pkill -f "yarn.*start" 2>/dev/null || true
            sleep $RETRY_DELAY
        fi
    fi
done

echo "❌ Failed to start plugin after $MAX_RETRIES attempts"
echo "📝 Final webpack log:"
tail -50 webpack.log 2>/dev/null || echo "No log file found"
exit 1 