# NodeDashboard Plugin - Startup Scripts

This directory contains improved startup scripts that handle clean restarts and avoid common issues like port conflicts and podman machine problems.

## Scripts Overview

### 🧹 `cleanup.sh`
Comprehensive cleanup script that:
- Kills all processes using ports 9000 and 9001
- Stops webpack development servers
- Cleans up podman containers
- Verifies ports are free before continuing

**Usage:**
```bash
./scripts/cleanup.sh
# or
yarn cleanup
```

### 🚀 `start-plugin.sh`
Improved plugin startup script that:
- Checks prerequisites (package.json, node_modules)
- Starts webpack development server with retry logic
- Waits for plugin to be ready before continuing
- Provides clear status feedback

**Usage:**
```bash
./scripts/start-plugin.sh
# or
yarn restart:plugin
```

### 🖥️ `start-console.sh`
Improved console startup script that:
- Checks if plugin is running first
- Verifies OpenShift cluster access
- Manages podman machine startup
- Handles platform-specific networking (Linux vs macOS)

**Usage:**
```bash
./scripts/start-console.sh
# or
yarn restart:console
```

### 🔄 `restart-all.sh`
Complete restart orchestration script that:
- Performs full cleanup
- Restarts podman machine
- Verifies cluster access
- Starts plugin and waits for readiness
- Starts console
- Monitors both services

**Usage:**
```bash
./scripts/restart-all.sh
# or
yarn restart
```

## Quick Start Guide

### Option 1: Complete Restart (Recommended)
```bash
yarn restart
```
This will handle everything automatically with proper cleanup and error handling.

### Option 2: Manual Step-by-Step
```bash
# 1. Clean up first
yarn cleanup

# 2. Start plugin
yarn restart:plugin

# 3. In another terminal, start console
yarn restart:console
```

### Option 3: Troubleshooting Mode
```bash
# Clean up everything
./scripts/cleanup.sh

# Check what's using the ports
lsof -i :9000
lsof -i :9001

# Start services individually with verbose output
./scripts/start-plugin.sh
./scripts/start-console.sh
```

## Common Issues Resolved

### ❌ "Address already in use" errors
- **Before:** Manual process killing required
- **After:** Automatic cleanup with verification

### ❌ Webpack configuration errors
- **Before:** "_assetEmittingPreviousFiles" property issues
- **After:** Proper webpack-dev-server version compatibility

### ❌ Podman connection issues
- **Before:** Manual machine restart required
- **After:** Automatic podman machine management

### ❌ Plugin not loading in console
- **Before:** Timing issues between services
- **After:** Proper startup sequencing with readiness checks

## Environment Variables

You can customize the behavior using environment variables:

```bash
# Plugin configuration
export PLUGIN_PORT=9001
export MAX_RETRIES=3
export RETRY_DELAY=5

# Console configuration
export CONSOLE_PORT=9000
export CONSOLE_IMAGE="quay.io/openshift/origin-console:latest"
export CONSOLE_IMAGE_PLATFORM="linux/amd64"

# Then run the scripts
yarn restart
```

## Prerequisites

Before using these scripts, ensure you have:

1. **OpenShift CLI (oc)** - Must be logged into a cluster
2. **Podman** - Container runtime for running the console
3. **Node.js/Yarn** - For the plugin development server
4. **curl** - For health checks (usually pre-installed)

## Verification Commands

To verify everything is working:

```bash
# Check plugin
curl http://localhost:9001/plugin-manifest.json

# Check console
curl http://localhost:9000

# Check cluster access
oc whoami

# Check podman
podman machine list
```

## Monitoring

The `restart-all.sh` script includes built-in monitoring that checks service health every 30 seconds. You'll see output like:

```
[14:30:15] Plugin: 200, Console: 200
[14:30:45] Plugin: 200, Console: 200
```

## Troubleshooting

### Script won't run
```bash
# Make sure scripts are executable
chmod +x scripts/*.sh
```

### Port still in use after cleanup
```bash
# Find what's using the port
sudo lsof -i :9001
sudo kill -9 <PID>
```

### Podman issues
```bash
# Reset podman machine
podman machine stop --all
podman machine rm --all
podman machine init
podman machine start
```

### OpenShift login issues
```bash
# Get fresh login command from OpenShift web console
oc login --token=<token> --server=<server>
```

## Development Tips

- Use `yarn restart` for a clean start every time
- Keep `yarn restart` running to monitor both services
- Use Ctrl+C to stop the monitoring script
- Check the individual script logs if services fail to start
- The scripts are designed to be idempotent - safe to run multiple times 