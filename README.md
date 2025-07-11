# OpenShift Nodes Dashboard Plugin

A comprehensive OpenShift Console dynamic plugin for real-time monitoring and management of cluster nodes with live data streaming, WebSocket connectivity, and advanced alerting capabilities.

## ✨ Features

### 🏠 **Real-Time Cluster Overview Dashboard**
- **Live Node Status**: Real-time view of all cluster nodes with ready/not ready status
- **Resource Monitoring**: Live CPU and memory usage with auto-refresh every 3 seconds
- **Pod Statistics**: Running pod counts with dynamic updates
- **System Information**: Kubernetes version, cluster uptime, and infrastructure details
- **WebSocket Integration**: Real-time data streaming without page refreshes

### 🖥️ **Advanced Node Management**
- **Interactive Node Selection**: Click-to-select nodes with instant detail updates
- **Comprehensive Node Details**: Full configuration, status, and resource information
- **Tabbed Interface**: Organized across Overview, Logs, and Alerts tabs
- **Resource Capacity**: CPU cores, memory (GB), max pods, and infrastructure details
- **System Information**: OS details, container runtime, zone, instance type, kernel version

### 📊 **Live Monitoring & Streaming**
- **Real-Time Log Streaming**: Live kubelet, system, and container logs with WebSocket connectivity
- **Live Resource Updates**: CPU/memory usage updates every 3 seconds
- **Alert System**: Node-specific health alerts with real-time status monitoring
- **Event Monitoring**: Live pod events, node changes, and system notifications
- **Status Tracking**: Real-time node condition monitoring with visual indicators

### 🚀 **WebSocket Real-Time Features**
- **Node Watch API**: Live monitoring of node status changes
- **Pod Watch API**: Real-time pod lifecycle events for selected nodes
- **Event Streaming**: Live system event notifications
- **Auto-Reconnection**: Robust WebSocket handling with automatic reconnection
- **Performance Optimized**: Efficient data streaming with minimal resource usage

### 🎨 **Modern UI Experience**
- **Responsive Design**: Clean, consistent card layouts optimized for all screen sizes
- **No Scroll Bars**: Properly sized components that fit content naturally
- **Visual Hierarchy**: Color-coded status indicators and intuitive navigation
- **PatternFly Components**: Built with OpenShift's design system for consistency
- **Loading States**: Smooth loading indicators and error handling
- **Interactive Elements**: Hover effects, selection states, and visual feedback

## 🔧 Technical Implementation

### Modular Architecture
- **Component Organization**: Modular structure with dedicated directories:
  - `src/components/nodes/` - Node-specific components (NodeCard, NodeFilters, etc.)
  - `src/components/errors/` - Error handling components (ErrorBoundary)
  - `src/hooks/` - Custom React hooks (useNodeData, useNodeFilters, useNodeSelection)
  - `src/types/` - Comprehensive TypeScript type definitions
  - `src/utils/` - Utility functions (formatUtils, timeUtils)

### Real-Time Data Architecture
- **WebSocket Connections**: Direct integration with OpenShift API watch endpoints
- **Component State Management**: React hooks with optimized re-rendering
- **Memory Management**: Automatic cleanup of WebSocket connections and timers
- **Error Handling**: Graceful degradation and reconnection strategies
- **Performance**: Efficient data parsing and state updates

### API Integration
- **OpenShift Node API**: Real-time node data retrieval
- **Pod Watch API**: Live pod monitoring for selected nodes
- **Events API**: System event streaming and notifications
- **Metrics API**: Resource usage data with proper unit conversion
- **Custom Resource Definitions**: Extended metadata and configuration

## 🚀 Getting Started

[Dynamic plugins](https://github.com/openshift/console/tree/master/frontend/packages/console-dynamic-plugin-sdk)
allow you to extend the [OpenShift UI](https://github.com/openshift/console) at runtime. 
This plugin requires OpenShift 4.12+ for the `v1` API version of `ConsolePlugin` CRD.

### Prerequisites

- [Node.js](https://nodejs.org/en/) and [yarn](https://yarnpkg.com)
- [Docker](https://www.docker.com) or [podman 3.2.0+](https://podman.io) 
- [oc](https://console.redhat.com/openshift/downloads) CLI tool
- Access to an OpenShift cluster with proper RBAC permissions

## 💻 Development

### Quick Start (Recommended)

We've created comprehensive development scripts for a smooth development experience:

```bash
# Complete environment restart (recommended)
yarn restart

# Or use individual scripts:
yarn cleanup    # Clean up ports and processes
yarn start      # Start plugin development server
yarn start-console  # Start OpenShift console

# For troubleshooting persistent issues:
yarn nuclear   # Aggressive cleanup for stubborn processes
```

### Development Scripts

The project includes powerful development management scripts in the `scripts/` directory:

#### **🔄 Complete Restart (`yarn restart`)**
```bash
./scripts/restart-all.sh
```
- **Complete cleanup** of ports, processes, and containers
- **Podman machine restart** for fresh container environment
- **Automatic plugin startup** with retry logic and health checks
- **Console startup** with validation and error handling
- **Real-time monitoring** of both services with status updates

#### **🧹 Cleanup (`yarn cleanup`)**
```bash
./scripts/cleanup.sh
```
- **Port cleanup** (9000, 9001) with verification
- **Process termination** (webpack, yarn, node processes)
- **Container cleanup** with podman integration
- **Verification** that all resources are properly released

#### **🚀 Plugin Startup (`yarn start:plugin`)**
```bash
./scripts/start-plugin.sh
```
- **Intelligent startup** with retry logic (3 attempts)
- **Health checking** with plugin manifest validation
- **Process management** with automatic cleanup on failure
- **Status monitoring** with real-time feedback

#### **🖥️ Console Startup (`yarn start:console`)**
```bash
./scripts/start-console.sh
```
- **Pre-flight checks** for plugin availability and cluster access
- **Podman machine management** with automatic startup
- **Environment validation** for proper console configuration
- **Error handling** with detailed diagnostic information

#### **💥 Nuclear Cleanup (`yarn nuclear`)**
```bash
./scripts/nuclear-cleanup.sh
```
- **Aggressive process termination** for stubborn processes
- **Force port cleanup** with multiple kill methods
- **Cache clearing** (webpack, yarn, node_modules)
- **Complete environment reset** for troubleshooting

### Manual Development (Alternative)

If you prefer manual control:

#### Option 1: Local Development

In one terminal window:

1. `yarn install`
2. `yarn run start`

In another terminal window:

1. `oc login` (connect to your OpenShift cluster)
2. `yarn run start-console`

This runs the OpenShift console in a container connected to your cluster. The plugin HTTP server runs on port 9001 with CORS enabled. Navigate to <http://localhost:9000> and look for "Nodes Dashboard" in the navigation.

#### Running with Apple Silicon and Podman

If using podman on Mac with Apple silicon, install `qemu-user-static`:

```bash
podman machine stop
podman machine start
podman machine ssh
sudo -i
rpm-ostree install qemu-user-static
systemctl reboot
```

#### Option 2: Docker + VSCode Remote Container

Using the [Remote Containers](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers) extension:

1. Create `dev.env` file in `.devcontainer` folder:

```bash
OC_PLUGIN_NAME=node-dashboard
OC_URL=https://api.example.com:6443
OC_USER=kubeadmin
OC_PASS=<password>
```

2. `(Ctrl+Shift+P) => Remote Containers: Open Folder in Container...`
3. `yarn run start`
4. Navigate to <http://localhost:9000>

### Development Features

- **Hot Reloading**: Automatic refresh on code changes
- **TypeScript Support**: Full type checking and IntelliSense
- **ESLint Integration**: Code quality and style enforcement
- **Prettier Formatting**: Automatic code formatting
- **Source Maps**: Easy debugging in browser dev tools
- **Modular Architecture**: Well-organized component structure
- **Error Boundaries**: Comprehensive error handling
- **Custom Hooks**: Reusable logic patterns

### 🐛 Troubleshooting

#### Common Issues and Solutions

**Port Already in Use (EADDRINUSE)**
```bash
yarn cleanup  # Clean up ports and processes
# Or for persistent issues:
yarn nuclear  # Nuclear option for stubborn processes
```

**Plugin Manifest 404 Errors**
```bash
# Usually resolved by clearing webpack cache:
rm -rf node_modules/.cache .webpack_cache dist
yarn cache clean
yarn start
```

**Podman Connection Issues**
```bash
podman machine stop
podman machine start
# Then restart console:
yarn start-console
```

**Webpack Configuration Errors**
```bash
# Clear all caches and restart:
yarn nuclear
yarn restart
```

**Console Authentication Issues**
```bash
# Re-login to OpenShift cluster:
oc login --token=<your-token> --server=<your-server>
yarn start-console
```

#### Debug Commands

```bash
# Check current service status
curl http://localhost:9001/plugin-manifest.json  # Plugin
curl http://localhost:9000/                      # Console

# Check process status
ps aux | grep webpack
ps aux | grep podman

# Check port usage
lsof -i :9001
lsof -i :9000

# Podman diagnostics
podman machine list
podman system connection list
```

## 🐳 Docker Image

Build and deploy your plugin:

1. **Build the image:**
   ```sh
   docker build -t quay.io/my-repository/nodes-dashboard-plugin:latest .
   ```

2. **Run locally:**
   ```sh
   docker run -it --rm -d -p 9001:80 quay.io/my-repository/nodes-dashboard-plugin:latest
   ```

3. **Push to registry:**
   ```sh
   docker push quay.io/my-repository/nodes-dashboard-plugin:latest
   ```

**Note:** For Apple Silicon Macs, add `--platform=linux/amd64` when building.

## ☸️ Cluster Deployment

Deploy using the included [Helm](https://helm.sh) chart:

### Required Parameters

- `plugin.image`: Location of your built plugin image

### Installation

```shell
helm upgrade -i nodes-dashboard charts/openshift-console-plugin \
  -n nodes-dashboard-plugin \
  --create-namespace \
  --set plugin.image=quay.io/my-repository/nodes-dashboard-plugin:latest
```

**OpenShift 4.10 Note:** Add `--set plugin.securityContext.enabled=false`

### Plugin Configuration

The plugin registers with OpenShift Console as:

```json
{
  "consolePlugin": {
    "name": "node-dashboard",
    "version": "0.0.1", 
    "displayName": "Nodes Dashboard",
    "description": "Real-time node monitoring and management for OpenShift clusters",
    "exposedModules": {
      "NodesDashboard": "./components/NodesDashboard"
    }
  }
}
```

## 🏗️ Architecture

### Core Components

- **NodesDashboard**: Comprehensive dashboard with real-time node monitoring, interactive selection, and live resource tracking
- **NodeCard**: Individual node display component with status and metrics
- **NodeFilters**: Advanced filtering and search capabilities
- **NodeSummaryMetrics**: Aggregated cluster statistics
- **NodeErrorBoundary**: Robust error handling with graceful fallbacks
- **Custom Hooks**: Reusable logic for data management and state

### Data Flow Architecture

1. **WebSocket Connections**: Direct integration with OpenShift API watch endpoints
2. **Real-Time Updates**: Components refresh every 3 seconds with live data streaming
3. **Resource Calculations**: Automatic unit conversion (Gi→GB, millicores→cores)
4. **State Management**: React hooks with optimized re-rendering and memory management
5. **OpenShift Integration**: Uses OpenShift Console SDK for cluster data access
6. **Error Handling**: Graceful degradation and automatic reconnection strategies

### Performance Optimizations

- **Efficient WebSocket Management**: Connection pooling and automatic cleanup
- **Optimized Rendering**: React.memo and useMemo for performance
- **Memory Management**: Proper cleanup of timers and event listeners
- **Lazy Loading**: Components load on demand for better performance
- **Debounced Updates**: Prevents excessive re-renders during rapid data changes
- **Modular Architecture**: Code splitting and tree shaking for smaller bundles

### TypeScript Integration

- **Comprehensive Type Definitions**: Full type coverage in `src/types/`
- **Kubernetes API Types**: Strongly typed OpenShift/Kubernetes resources
- **Component Props**: Type-safe component interfaces
- **Hook Types**: Typed custom hooks with proper return types
- **Utility Functions**: Typed helper functions with input validation

## 🌐 Internationalization (i18n)

The plugin uses the `plugin__node-dashboard` namespace for translations with [react-i18next](https://react.i18next.com/):

```tsx
const { t } = useTranslation('plugin__node-dashboard');
return <h1>{t('Nodes Dashboard')}</h1>;
```

Labels in `console-extensions.json` use the format:
```json
{
  "name": "%plugin__node-dashboard~Nodes Dashboard%"
}
```

### Supported Languages

- English (default)
- Extensible for additional languages through locales directory

## 🔒 Security & RBAC

### Required Permissions

The plugin requires the following RBAC permissions:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: node-dashboard-plugin
rules:
- apiGroups: [""]
  resources: ["nodes", "pods", "events"]
  verbs: ["get", "list", "watch"]
- apiGroups: ["metrics.k8s.io"]
  resources: ["nodes", "pods"]
  verbs: ["get", "list"]
```

### Security Features

- **WebSocket Security**: Secure WebSocket connections with proper authentication
- **Data Validation**: Input validation and sanitization
- **Error Boundaries**: Graceful error handling without exposing sensitive information
- **CORS Configuration**: Proper cross-origin resource sharing setup

## 🧪 Testing

### Running Tests

```bash
# Type checking
yarn run type-check

# Lint checking
yarn run lint

# Build verification
yarn run build

# Unit tests
yarn test

# Integration tests
yarn run test:integration
```

### Test Coverage

- **Component Testing**: React component unit tests
- **Integration Testing**: End-to-end workflow testing
- **TypeScript Validation**: Comprehensive type checking
- **Lint Validation**: Code quality and style verification

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Maintain consistent code formatting with Prettier
- Write comprehensive tests for new features
- Update documentation for any API changes
- Follow OpenShift Console design patterns
- Use the provided development scripts for consistent environment setup

## 📋 Changelog

### Latest Changes (v0.2.0)

- 🏗️ **Modular Architecture**: Refactored to component-based structure with dedicated directories
- 🔧 **Development Scripts**: Comprehensive automation for development environment management
- 📝 **TypeScript Improvements**: Enhanced type definitions and error handling
- 🧹 **Cleanup Automation**: Robust process and port management scripts
- 🚀 **Startup Optimization**: Intelligent retry logic and health checking
- 🐛 **Error Handling**: Improved error boundaries and debugging capabilities
- 🔄 **Restart Workflows**: One-command environment reset and monitoring
- 📊 **Enhanced Monitoring**: Real-time status tracking for development services
- 🛠️ **Development Tools**: Nuclear cleanup options for troubleshooting
- 📖 **Documentation**: Comprehensive troubleshooting and development guides

### Previous Changes

- ✨ **Real-time monitoring**: Added WebSocket connectivity for live data streaming
- 🔄 **Interactive node selection**: Click-to-select nodes with instant updates
- 📊 **Live resource monitoring**: CPU/memory usage with 3-second refresh intervals
- 📝 **Live log streaming**: Real-time log viewer with WebSocket connectivity
- ⚠️ **Real-time alerts**: Live health monitoring and status updates
- 🎨 **Enhanced UI**: Improved visual hierarchy and responsive design
- 🔧 **Performance optimization**: Efficient state management and memory usage

## 📝 License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: Check the [docs](docs/) directory for detailed guides
- **Issues**: Report bugs and feature requests in GitHub Issues
- **OpenShift Console**: [Official Documentation](https://docs.openshift.com/container-platform/latest/web_console/web-console.html)
- **Dynamic Plugins**: [Plugin Development Guide](https://github.com/openshift/console/tree/master/frontend/packages/console-dynamic-plugin-sdk)

### Getting Help

1. **Check the troubleshooting section** above for common issues
2. **Use the development scripts** for automated problem resolution
3. **Check GitHub Issues** for similar problems and solutions
4. **Review the OpenShift Console documentation** for plugin development best practices

---

**Built with ❤️ for the OpenShift Community**
