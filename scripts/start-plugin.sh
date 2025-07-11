#!/usr/bin/env bash

set -euo pipefail

PLUGIN_PORT=${PLUGIN_PORT:-9001}
MAX_RETRIES=${MAX_RETRIES:-3}
RETRY_DELAY=${RETRY_DELAY:-5}

echo "🚀 Starting Node Dashboard Plugin..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Are you in the plugin directory?"
    exit 1
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    yarn install
fi

# Function to check if plugin is running
check_plugin_running() {
    local port=$1
    curl -s -o /dev/null -w "%{http_code}" "http://localhost:$port/plugin-manifest.json" 2>/dev/null || echo "000"
}

# Function to wait for plugin to be ready
wait_for_plugin() {
    local port=$1
    local max_wait=30
    local count=0
    
    echo "⏳ Waiting for plugin to be ready on port $port..."
    
    while [ $count -lt $max_wait ]; do
        local status=$(check_plugin_running $port)
        if [ "$status" = "200" ]; then
            echo "✅ Plugin is ready!"
            return 0
        fi
        
        echo "  Status: $status, waiting... ($count/$max_wait)"
        sleep 2
        count=$((count + 1))
    done
    
    echo "❌ Plugin failed to start within $max_wait seconds"
    return 1
}

# Function to start the plugin
start_plugin() {
    echo "🔧 Starting webpack development server..."
    
    # Clear any previous build artifacts
    rm -rf dist/ 2>/dev/null || true
    
    # Start the development server
    NODE_ENV=development yarn start &
    local webpack_pid=$!
    
    echo "  Webpack PID: $webpack_pid"
    echo "  Port: $PLUGIN_PORT"
    
    # Wait for the plugin to be ready
    if wait_for_plugin $PLUGIN_PORT; then
        echo "🎉 Plugin started successfully!"
        echo "📍 Plugin URL: http://localhost:$PLUGIN_PORT"
        echo "📋 Plugin Manifest: http://localhost:$PLUGIN_PORT/plugin-manifest.json"
        return 0
    else
        echo "❌ Plugin failed to start"
        kill $webpack_pid 2>/dev/null || true
        return 1
    fi
}

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
            sleep $RETRY_DELAY
        fi
    fi
done

echo "❌ Failed to start plugin after $MAX_RETRIES attempts"
exit 1 