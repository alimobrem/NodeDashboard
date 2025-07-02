#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Generate a large dataset of 200 nodes for performance testing
function generateLargeNodeDataset(count = 200) {
  const nodes = [];
  
  for (let i = 1; i <= count; i++) {
    const nodeIndex = i.toString().padStart(3, '0');
    const isWorker = i > 3; // First 3 are masters, rest are workers
    const zone = `zone-${((i - 1) % 3) + 1}`; // Distribute across 3 zones
    const ready = Math.random() > 0.1; // 90% of nodes are ready
    const cpuCount = isWorker ? (Math.random() > 0.5 ? 4 : 8) : 8;
    const memoryGi = isWorker ? (Math.random() > 0.5 ? 16 : 32) : 32;
    
    const node = {
      metadata: {
        name: isWorker ? `worker-node-${nodeIndex}` : `master-node-${nodeIndex}`,
        uid: `${isWorker ? 'worker' : 'master'}-uid-${nodeIndex}`,
        creationTimestamp: new Date(Date.now() - (Math.random() * 30 * 24 * 60 * 60 * 1000)).toISOString(),
        labels: {
          ...(isWorker ? { 'node-role.kubernetes.io/worker': '' } : { 'node-role.kubernetes.io/master': '' }),
          'topology.kubernetes.io/zone': zone,
          'node.openshift.io/os_id': 'rhcos',
          'kubernetes.io/arch': 'amd64',
          'kubernetes.io/os': 'linux',
          'node.openshift.io/performance-profile': isWorker && Math.random() > 0.7 ? 'high-performance' : 'standard'
        }
      },
      spec: {
        podCIDR: `10.${Math.floor(i / 254) + 1}.${(i % 254) + 1}.0/24`
      },
      status: {
        capacity: {
          cpu: cpuCount.toString(),
          memory: `${memoryGi}Gi`,
          storage: `${isWorker ? Math.floor(Math.random() * 500) + 100 : 100}Gi`,
          pods: isWorker ? '110' : '250'
        },
        allocatable: {
          cpu: `${cpuCount * 950}m`,
          memory: `${memoryGi - 2}Gi`,
          storage: `${isWorker ? Math.floor(Math.random() * 450) + 95 : 95}Gi`,
          pods: isWorker ? '110' : '250'
        },
        conditions: [
          {
            type: 'Ready',
            status: ready ? 'True' : 'False',
            reason: ready ? 'KubeletReady' : 'KubeletNotReady',
            message: ready ? 'kubelet is posting ready status' : 'kubelet is not ready',
            lastHeartbeatTime: new Date(Date.now() - Math.random() * 300000).toISOString()
          },
          {
            type: 'MemoryPressure',
            status: Math.random() > 0.95 ? 'True' : 'False',
            reason: 'KubeletHasSufficientMemory',
            message: 'kubelet has sufficient memory available',
            lastHeartbeatTime: new Date(Date.now() - Math.random() * 300000).toISOString()
          },
          {
            type: 'DiskPressure',
            status: Math.random() > 0.98 ? 'True' : 'False',
            reason: 'KubeletHasNoDiskPressure',
            message: 'kubelet has no disk pressure',
            lastHeartbeatTime: new Date(Date.now() - Math.random() * 300000).toISOString()
          },
          {
            type: 'PIDPressure',
            status: 'False',
            reason: 'KubeletHasSufficientPID',
            message: 'kubelet has sufficient PID available',
            lastHeartbeatTime: new Date(Date.now() - Math.random() * 300000).toISOString()
          }
        ],
        addresses: [
          {
            type: 'InternalIP',
            address: `10.${Math.floor(i / 254) + 1}.${(i % 254) + 1}.${Math.floor(Math.random() * 254) + 1}`
          },
          {
            type: 'Hostname',
            address: isWorker ? `worker-node-${nodeIndex}` : `master-node-${nodeIndex}`
          },
          {
            type: 'ExternalIP',
            address: `192.168.${Math.floor(i / 254) + 1}.${(i % 254) + 1}`
          }
        ],
        nodeInfo: {
          machineID: `machine-${nodeIndex}`,
          systemUUID: `system-${nodeIndex}`,
          bootID: `boot-${nodeIndex}`,
          kernelVersion: '4.18.0-305.el8.x86_64',
          osImage: 'Red Hat Enterprise Linux CoreOS',
          containerRuntimeVersion: 'cri-o://1.24.0',
          kubeletVersion: 'v1.24.0',
          kubeProxyVersion: 'v1.24.0',
          operatingSystem: 'linux',
          architecture: 'amd64'
        },
        daemonEndpoints: {
          kubeletEndpoint: {
            Port: 10250
          }
        }
      }
    };
    
    nodes.push(node);
  }
  
  return {
    kind: 'NodeList',
    apiVersion: 'v1',
    metadata: {
      resourceVersion: '1000000'
    },
    items: nodes
  };
}

// Generate the dataset and write to file
const dataset = generateLargeNodeDataset(200);
const outputPath = path.join(__dirname, 'fixtures', 'large-nodes-dataset.json');

fs.writeFileSync(outputPath, JSON.stringify(dataset, null, 2));
console.log(`Generated large dataset with ${dataset.items.length} nodes at ${outputPath}`);

// Generate some statistics about the dataset
const stats = {
  totalNodes: dataset.items.length,
  masterNodes: dataset.items.filter(node => node.metadata.labels['node-role.kubernetes.io/master']).length,
  workerNodes: dataset.items.filter(node => node.metadata.labels['node-role.kubernetes.io/worker']).length,
  readyNodes: dataset.items.filter(node => node.status.conditions.find(c => c.type === 'Ready' && c.status === 'True')).length,
  notReadyNodes: dataset.items.filter(node => node.status.conditions.find(c => c.type === 'Ready' && c.status === 'False')).length,
  zoneDistribution: {
    'zone-1': dataset.items.filter(node => node.metadata.labels['topology.kubernetes.io/zone'] === 'zone-1').length,
    'zone-2': dataset.items.filter(node => node.metadata.labels['topology.kubernetes.io/zone'] === 'zone-2').length,
    'zone-3': dataset.items.filter(node => node.metadata.labels['topology.kubernetes.io/zone'] === 'zone-3').length
  }
};

console.log('\nDataset Statistics:');
console.log(JSON.stringify(stats, null, 2));

module.exports = { generateLargeNodeDataset }; 