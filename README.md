# OpenShift Nodes Dashboard Plugin

A comprehensive OpenShift Console dynamic plugin for monitoring and managing cluster nodes with real-time insights, log streaming, and alerting capabilities.

## Features

### 🏠 **Cluster Overview Dashboard**
- **Total Nodes**: View all nodes in your cluster with ready/not ready status
- **Resource Monitoring**: Real-time CPU and memory usage across the cluster
- **Pod Statistics**: Running pod counts and cluster health metrics
- **System Information**: Kubernetes version, cluster uptime, and infrastructure details

### 🖥️ **Individual Node Management**
- **Node Details**: Comprehensive view of each node's configuration and status
- **Tabbed Interface**: Organized information across Overview, Logs, and Alerts tabs
- **Resource Capacity**: CPU cores, memory (GB), max pods, and infrastructure details
- **System Information**: OS details, container runtime, zone, instance type

### 📊 **Real-time Monitoring**
- **Live Log Streaming**: View kubelet, system, and container logs with 3-second updates
- **Alert System**: Node-specific health alerts and status monitoring
- **Resource Usage**: Proper unit formatting (GB for memory, cores/millicores for CPU)
- **Status Tracking**: Real-time node condition monitoring

### 🎨 **Modern UI Experience**
- **Responsive Design**: Clean, consistent card layouts optimized for all screen sizes
- **No Scroll Bars**: Properly sized components that fit content naturally
- **Visual Hierarchy**: Color-coded status indicators and intuitive navigation
- **PatternFly Components**: Built with OpenShift's design system for consistency

## Screenshots

### Console Navigation
The plugin adds a "Nodes Dashboard" section to your OpenShift Console navigation:

![Console Navigation](docs/screenshots/console-navigation.png)

### Nodes Dashboard Overview
Main dashboard showing cluster-wide node statistics and resource utilization:

![Nodes Dashboard Overview](docs/screenshots/nodes-dashboard-overview.png)

### Individual Node Details
Detailed view of a selected node with tabbed interface:

![Node Details Overview](docs/screenshots/node-details-overview.png)

### Live Log Streaming
Real-time log viewer with auto-refresh capabilities:

![Node Logs](docs/screenshots/node-logs.png)

### Alert Monitoring
Node-specific health alerts and status monitoring:

![Node Alerts](docs/screenshots/node-alerts.png)

## Getting Started

[Dynamic plugins](https://github.com/openshift/console/tree/master/frontend/packages/console-dynamic-plugin-sdk)
allow you to extend the [OpenShift UI](https://github.com/openshift/console) at runtime. 
This plugin requires OpenShift 4.12+ for the `v1` API version of `ConsolePlugin` CRD.

### Prerequisites

- [Node.js](https://nodejs.org/en/) and [yarn](https://yarnpkg.com)
- [Docker](https://www.docker.com) or [podman 3.2.0+](https://podman.io) 
- [oc](https://console.redhat.com/openshift/downloads) CLI tool
- Access to an OpenShift cluster

## Development

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
podman machine ssh
sudo -i
rpm-ostree install qemu-user-static
systemctl reboot
```

### Option 2: Docker + VSCode Remote Container

Using the [Remote Containers](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers) extension:

1. Create `dev.env` file in `.devcontainer` folder:

```bash
OC_PLUGIN_NAME=console-plugin-template
OC_URL=https://api.example.com:6443
OC_USER=kubeadmin
OC_PASS=<password>
```

2. `(Ctrl+Shift+P) => Remote Containers: Open Folder in Container...`
3. `yarn run start`
4. Navigate to <http://localhost:9000>

## Docker Image

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

## Cluster Deployment

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
"consolePlugin": {
  "name": "console-plugin-template",
  "version": "0.0.1", 
  "displayName": "Nodes Dashboard",
  "description": "Comprehensive node monitoring and management for OpenShift clusters",
  "exposedModules": {
    "NodesDashboard": "./components/NodesDashboard",
    "NodesPage": "./components/NodesPage"
  }
}
```

## Architecture

### Components

- **NodesDashboard**: Main dashboard component with overview cards and node selection
- **NodesPage**: Container component that handles routing and navigation
- **Live Log Streaming**: Real-time log viewer with auto-refresh capabilities
- **Alert System**: Node health monitoring and issue detection

### Data Flow

1. **Real-time Updates**: Components refresh every 3 seconds for live data
2. **Resource Calculations**: Automatic unit conversion (Gi→GB, millicores→cores)
3. **State Management**: React hooks for component state and data synchronization
4. **OpenShift Integration**: Uses OpenShift Console SDK for cluster data access

## Internationalization (i18n)

The plugin uses the `plugin__console-plugin-template` namespace for translations with [react-i18next](https://react.i18next.com/):

```tsx
const { t } = useTranslation('plugin__console-plugin-template');
return <h1>{t('Nodes Dashboard')}</h1>;
```

Labels in `console-extensions.json` use the format:
```json
"name": "%plugin__console-plugin-template~Nodes Dashboard%"
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test locally with `yarn start`
5. Submit a pull request

## License

This project is licensed under the Apache License 2.0.
