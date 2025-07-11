#!/usr/bin/env bash

set -euo pipefail

CONSOLE_IMAGE=${CONSOLE_IMAGE:="quay.io/openshift/origin-console:latest"}
CONSOLE_PORT=${CONSOLE_PORT:=9000}
CONSOLE_IMAGE_PLATFORM=${CONSOLE_IMAGE_PLATFORM:="linux/amd64"}
PLUGIN_PORT=${PLUGIN_PORT:=9001}

# Plugin metadata is declared in package.json
PLUGIN_NAME="${npm_package_consolePlugin_name:-node-dashboard}"

echo "🚀 Starting OpenShift Console..."

# Function to check if podman machine is running
check_podman_machine() {
    if command -v podman >/dev/null 2>&1; then
        if podman machine list --format "{{.Running}}" 2>/dev/null | grep -q "true"; then
            echo "✅ Podman machine is running"
            return 0
        else
            echo "❌ Podman machine is not running"
            return 1
        fi
    else
        echo "❌ Podman not found"
        return 1
    fi
}

# Function to start podman machine
start_podman_machine() {
    echo "🔧 Starting podman machine..."
    
    # Stop any existing machines first
    podman machine stop --all 2>/dev/null || true
    sleep 2
    
    # Start the default machine
    if podman machine start 2>/dev/null; then
        echo "✅ Podman machine started successfully"
        sleep 5  # Give it time to fully initialize
        return 0
    else
        echo "❌ Failed to start podman machine"
        return 1
    fi
}

# Function to check if OpenShift cluster is accessible
check_cluster_access() {
    echo "🔍 Checking OpenShift cluster access..."
    
    if ! command -v oc >/dev/null 2>&1; then
        echo "❌ oc command not found"
        return 1
    fi
    
    if ! oc whoami >/dev/null 2>&1; then
        echo "❌ Not logged into OpenShift cluster"
        echo "Please run: oc login --token=<your-token> --server=<your-server>"
        return 1
    fi
    
    local user=$(oc whoami 2>/dev/null)
    local server=$(oc whoami --show-server 2>/dev/null)
    
    echo "✅ Logged in as: $user"
    echo "✅ Server: $server"
    return 0
}

# Function to check if plugin is running
check_plugin_running() {
    local port=$1
    local status=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$port/plugin-manifest.json" 2>/dev/null || echo "000")
    
    if [ "$status" = "200" ]; then
        echo "✅ Plugin is running on port $port"
        return 0
    else
        echo "❌ Plugin is not running on port $port (status: $status)"
        return 1
    fi
}

# Function to start the console
start_console() {
    echo "🔧 Starting OpenShift Console container..."
    
    # Set up environment variables
    export BRIDGE_USER_AUTH="disabled"
    export BRIDGE_K8S_MODE="off-cluster"
    export BRIDGE_K8S_AUTH="bearer-token"
    export BRIDGE_K8S_MODE_OFF_CLUSTER_SKIP_VERIFY_TLS=true
    export BRIDGE_K8S_MODE_OFF_CLUSTER_ENDPOINT=$(oc whoami --show-server)
    
    # The monitoring operator is not always installed (e.g. for local OpenShift). Tolerate missing config maps.
    set +e
    export BRIDGE_K8S_MODE_OFF_CLUSTER_THANOS=$(oc -n openshift-config-managed get configmap monitoring-shared-config -o jsonpath='{.data.thanosPublicURL}' 2>/dev/null)
    export BRIDGE_K8S_MODE_OFF_CLUSTER_ALERTMANAGER=$(oc -n openshift-config-managed get configmap monitoring-shared-config -o jsonpath='{.data.alertmanagerPublicURL}' 2>/dev/null)
    set -e
    
    export BRIDGE_K8S_AUTH_BEARER_TOKEN=$(oc whoami --show-token 2>/dev/null)
    export BRIDGE_USER_SETTINGS_LOCATION="localstorage"
    export BRIDGE_I18N_NAMESPACES="plugin__${PLUGIN_NAME}"
    
    # Don't fail if the cluster doesn't have gitops.
    set +e
    GITOPS_HOSTNAME=$(oc -n openshift-gitops get route cluster -o jsonpath='{.spec.host}' 2>/dev/null)
    set -e
    if [ -n "$GITOPS_HOSTNAME" ]; then
        export BRIDGE_K8S_MODE_OFF_CLUSTER_GITOPS="https://$GITOPS_HOSTNAME"
    fi
    
    echo "  API Server: $BRIDGE_K8S_MODE_OFF_CLUSTER_ENDPOINT"
    echo "  Console Image: $CONSOLE_IMAGE"
    echo "  Console URL: http://localhost:${CONSOLE_PORT}"
    echo "  Console Platform: $CONSOLE_IMAGE_PLATFORM"
    echo "  Plugin URL: http://localhost:${PLUGIN_PORT}"
    
    # Configure plugin connection based on platform
    if [ "$(uname -s)" = "Linux" ]; then
        # Use host networking on Linux since host.containers.internal is unreachable in some environments.
        export BRIDGE_PLUGINS="${PLUGIN_NAME}=http://localhost:${PLUGIN_PORT}"
        echo "  Using Linux host networking"
        
        podman run --pull always \
            --platform $CONSOLE_IMAGE_PLATFORM \
            --rm \
            --network=host \
            --env-file <(set | grep BRIDGE) \
            $CONSOLE_IMAGE
    else
        # Use port mapping with special networking configuration for macOS
        export BRIDGE_PLUGINS="${PLUGIN_NAME}=http://host.containers.internal:${PLUGIN_PORT}"
        echo "  Using macOS port mapping"
        
        podman run --pull always \
            --platform $CONSOLE_IMAGE_PLATFORM \
            --rm \
            --add-host host.containers.internal:host-gateway \
            -p "$CONSOLE_PORT":9000 \
            --env-file <(set | grep BRIDGE) \
            $CONSOLE_IMAGE 2>/dev/null || \
        podman run --pull always \
            --platform $CONSOLE_IMAGE_PLATFORM \
            --rm \
            -p "$CONSOLE_PORT":9000 \
            --env-file <(set | grep BRIDGE) \
            $CONSOLE_IMAGE
    fi
}

# Main startup logic
echo "🔍 Pre-flight checks..."

# Check if plugin is running
if ! check_plugin_running $PLUGIN_PORT; then
    echo "⚠️  Plugin is not running. Please start the plugin first:"
    echo "   ./scripts/start-plugin.sh"
    exit 1
fi

# Check cluster access
if ! check_cluster_access; then
    exit 1
fi

# Check and start podman machine if needed
if ! check_podman_machine; then
    if ! start_podman_machine; then
        echo "❌ Failed to start podman machine. Please check your podman installation."
        exit 1
    fi
fi

# Verify podman machine is working
if ! podman system info >/dev/null 2>&1; then
    echo "❌ Podman system is not responding. Please check your podman installation."
    exit 1
fi

echo "✅ All pre-flight checks passed!"

# Start the console
start_console 