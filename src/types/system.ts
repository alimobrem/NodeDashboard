// System and infrastructure-related TypeScript interfaces

export interface NodeSystemInfo {
  filesystem: {
    availableBytes?: number;
    capacityBytes?: number;
    usedBytes?: number;
    inodesFree?: number;
    inodes?: number;
    inodesUsed?: number;
  };
  runtime: {
    imageFs?: {
      availableBytes?: number;
      capacityBytes?: number;
      usedBytes?: number;
    };
  };
  rlimit: {
    maxpid?: number;
    curproc?: number;
  };
}
