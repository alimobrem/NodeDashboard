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

## 📸 Screenshots

### Console Navigation
The plugin adds a "Nodes Dashboard" section to your OpenShift Console navigation:

![Console Navigation](docs/screenshots/console-navigation.png)

### Real-Time Dashboard Overview
Live dashboard showing cluster-wide node statistics with real-time updates:

![Nodes Dashboard Overview](docs/screenshots/nodes-dashboard-overview.png)

### Interactive Node Selection
Click-to-select nodes with instant detail updates:

![Node Selection](docs/screenshots/node-selection.png)

### Live Node Details
Comprehensive node view with real-time resource monitoring:

![Node Details Overview](docs/screenshots/node-details-overview.png)

### Live Log Streaming
Real-time log viewer with WebSocket connectivity:

![Node Logs](docs/screenshots/node-logs.png)

### Real-Time Alert Monitoring
Live health alerts and status monitoring with instant updates:

![Node Alerts](docs/screenshots/node-alerts.png)

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

### Option 1: Local Development

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

### Option 2: Docker + VSCode Remote Container

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
- **WebSocket Manager**: Handles real-time data streaming and connection management
- **Alert System**: Live node health monitoring and issue detection
- **Log Streaming**: Real-time log viewer with WebSocket connectivity

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

## 📋 Changelog

### Latest Changes

- ✨ **Real-time monitoring**: Added WebSocket connectivity for live data streaming
- 🔄 **Interactive node selection**: Click-to-select nodes with instant updates
- 📊 **Live resource monitoring**: CPU/memory usage with 3-second refresh intervals
- 📝 **Live log streaming**: Real-time log viewer with WebSocket connectivity
- ⚠️ **Real-time alerts**: Live health monitoring and status updates
- 🎨 **Enhanced UI**: Improved visual hierarchy and responsive design
- 🔧 **Performance optimization**: Efficient state management and memory usage
- 🐛 **Bug fixes**: Resolved TypeScript compilation errors and edge cases

## 📝 License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: Check the [docs](docs/) directory for detailed guides
- **Issues**: Report bugs and feature requests in GitHub Issues
- **OpenShift Console**: [Official Documentation](https://docs.openshift.com/container-platform/latest/web_console/web-console.html)
- **Dynamic Plugins**: [Plugin Development Guide](https://github.com/openshift/console/tree/master/frontend/packages/console-dynamic-plugin-sdk)

---

**Built with ❤️ for the OpenShift Community**
