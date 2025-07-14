#!/usr/bin/env bash

set -euo pipefail

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "🔄 NodeDashboard Plugin - Complete Restart"
echo "================================================="
echo "Project: $PROJECT_ROOT"
echo ""

# Function to handle cleanup on script exit
cleanup_on_exit() {
    echo ""
    echo "🛑 Script interrupted. Cleaning up..."
    "$SCRIPT_DIR/cleanup.sh" 2>/dev/null || true
    exit 130
}

# Set up cleanup trap
trap cleanup_on_exit INT TERM

# Change to project directory
cd "$PROJECT_ROOT"

# Step 1: Complete cleanup
echo "🧹 Step 1: Complete Cleanup"
echo "----------------------------"
if [ -f "$SCRIPT_DIR/cleanup.sh" ]; then
    bash "$SCRIPT_DIR/cleanup.sh"
else
    echo "⚠️  Cleanup script not found, performing basic cleanup..."
    # Basic cleanup
    pkill -f "webpack.*serve" || true
    pkill -f "start-console" || true
    lsof -ti:9000 | xargs kill -9 2>/dev/null || true
    lsof -ti:9001 | xargs kill -9 2>/dev/null || true
    sleep 2
fi

echo ""

# Step 2: Restart podman machine
echo "🐳 Step 2: Restart Podman Machine"
echo "-----------------------------------"
if command -v podman >/dev/null 2>&1; then
    echo "  Checking current podman status..."
    
    # Test current connection
    if podman ps >/dev/null 2>&1; then
        echo "  ✅ Podman connection is working"
    else
        echo "  ❌ Podman connection is broken, fixing..."
        
        # Kill any stuck processes first
        echo "  Cleaning up stuck podman processes..."
        pkill -f "podman machine" 2>/dev/null || true
        pkill -f "vfkit" 2>/dev/null || true
        pkill -f "gvproxy" 2>/dev/null || true
        sleep 3
        
        # Stop all machines
        echo "  Stopping podman machines..."
        podman machine stop --all 2>/dev/null || true
        sleep 5
        
        # Start podman machine
        echo "  Starting podman machine..."
        if podman machine start 2>/dev/null; then
            echo "  ✅ Podman machine started"
            sleep 8  # Give it more time to fully initialize
            
            # Verify connection works
            echo "  Verifying podman connection..."
            max_retries=10
            retry_count=0
            
            while [ $retry_count -lt $max_retries ]; do
                if podman ps >/dev/null 2>&1; then
                    echo "  ✅ Podman connection verified!"
                    break
                fi
                echo "  ⏳ Waiting for podman connection... ($((retry_count + 1))/$max_retries)"
                sleep 3
                retry_count=$((retry_count + 1))
            done
            
            if [ $retry_count -ge $max_retries ]; then
                echo "  ❌ Podman connection failed after $max_retries attempts"
                echo "  This may cause console startup issues..."
            fi
        else
            echo "  ❌ Failed to start podman machine"
            echo "  This may cause console startup issues..."
        fi
    fi
else
    echo "  ❌ Podman not found, skipping..."
    echo "  Console may not work without podman!"
fi

echo ""

# Step 3: Verify OpenShift cluster access
echo "🔗 Step 3: Verify Cluster Access"
echo "----------------------------------"
if command -v oc >/dev/null 2>&1; then
    if oc whoami >/dev/null 2>&1; then
        echo "  ✅ Logged in as: $(oc whoami)"
        echo "  ✅ Server: $(oc whoami --show-server)"
    else
        echo "  ❌ Not logged into OpenShift cluster"
        echo "  Please run: oc login --token=<your-token> --server=<your-server>"
        echo "  Continuing anyway..."
    fi
else
    echo "  ❌ oc command not found"
    echo "  Continuing anyway..."
fi

echo ""

# Step 4: Start plugin
echo "🚀 Step 4: Start Plugin Development Server"
echo "--------------------------------------------"
if [ -f "$SCRIPT_DIR/start-plugin.sh" ]; then
    echo "  Using improved startup script..."
    bash "$SCRIPT_DIR/start-plugin.sh" &
    plugin_pid=$!
    
    # Wait for plugin to be ready
    echo "  ⏳ Waiting for plugin to be ready..."
    max_wait=30
    count=0
    
    while [ $count -lt $max_wait ]; do
        if curl -s -o /dev/null -w "%{http_code}" "http://localhost:9001/plugin-manifest.json" 2>/dev/null | grep -q "200"; then
            echo "  ✅ Plugin is ready!"
            break
        fi
        sleep 2
        count=$((count + 1))
    done
    
    if [ $count -ge $max_wait ]; then
        echo "  ❌ Plugin failed to start within $max_wait seconds"
        exit 1
    fi
else
    echo "  Using basic yarn start..."
    yarn start &
    plugin_pid=$!
    sleep 15
fi

echo ""

# Step 5: Start console
echo "🖥️  Step 5: Start OpenShift Console"
echo "------------------------------------"

# Pre-flight check for podman (console dependency)
if command -v podman >/dev/null 2>&1; then
    if ! podman ps >/dev/null 2>&1; then
        echo "  ⚠️  Warning: Podman connection is not working!"
        echo "  Console startup may fail. Consider running this script again."
    else
        echo "  ✅ Podman dependency check passed"
    fi
fi

if [ -f "$SCRIPT_DIR/start-console.sh" ]; then
    echo "  Using improved startup script..."
    bash "$SCRIPT_DIR/start-console.sh" &
    console_pid=$!
else
    echo "  Using basic start-console script..."
    yarn start-console &
    console_pid=$!
fi

echo ""

# Step 6: Final verification
echo "✅ Step 6: Final Verification"
echo "------------------------------"
sleep 10

# Check plugin
plugin_status=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:9001/plugin-manifest.json" 2>/dev/null || echo "000")
if [ "$plugin_status" = "200" ]; then
    echo "  ✅ Plugin: http://localhost:9001 (Status: $plugin_status)"
else
    echo "  ❌ Plugin: http://localhost:9001 (Status: $plugin_status)"
fi

# Check console
console_status=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:9000" 2>/dev/null || echo "000")
if [ "$console_status" = "200" ]; then
    echo "  ✅ Console: http://localhost:9000 (Status: $console_status)"
else
    echo "  ❌ Console: http://localhost:9000 (Status: $console_status)"
    
    # Additional troubleshooting for console issues
    if command -v podman >/dev/null 2>&1; then
        if ! podman ps >/dev/null 2>&1; then
            echo "      💡 Troubleshooting: Podman connection is broken"
            echo "      💡 Try: podman machine restart && ./scripts/restart-all.sh"
        fi
    fi
    
    # Check if port is in use
    if lsof -ti:9000 >/dev/null 2>&1; then
        echo "      💡 Troubleshooting: Port 9000 is in use by another process"
        echo "      💡 Try: ./scripts/cleanup.sh && ./scripts/restart-all.sh"
    fi
fi

echo ""
echo "🎉 Restart Complete!"
echo "===================="
echo "Plugin:  http://localhost:9001"
echo "Console: http://localhost:9000"
echo ""
echo "💡 Tips:"
echo "   - Both services are running in the background"
echo "   - Use Ctrl+C to stop this script"
echo "   - Use './scripts/cleanup.sh' to clean up processes"
echo "   - Check logs in separate terminals if needed"
echo ""

# Keep the script running to monitor the processes
echo "📊 Monitoring services... (Ctrl+C to stop)"
while true; do
    sleep 30
    
    # Quick health check
    plugin_ok=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:9001/plugin-manifest.json" 2>/dev/null || echo "000")
    console_ok=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:9000" 2>/dev/null || echo "000")
    
    timestamp=$(date '+%H:%M:%S')
    echo "[$timestamp] Plugin: $plugin_ok, Console: $console_ok"
    
    # If both services are down, exit
    if [ "$plugin_ok" != "200" ] && [ "$console_ok" != "200" ]; then
        echo "❌ Both services appear to be down. Exiting..."
        break
    fi
done 