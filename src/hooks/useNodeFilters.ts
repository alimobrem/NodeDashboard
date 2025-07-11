import * as React from 'react';
import type { NodeDetail } from '../types';

interface UseNodeFiltersReturn {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  statusFilter: string;
  setStatusFilter: (filter: string) => void;
  roleFilter: string;
  setRoleFilter: (filter: string) => void;
  filteredAndSortedNodes: NodeDetail[];
}

export const useNodeFilters = (nodes: NodeDetail[]): UseNodeFiltersReturn => {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('all');
  const [roleFilter, setRoleFilter] = React.useState('all');

  // Enhanced filtering and sorting
  const filteredAndSortedNodes = React.useMemo(() => {
    const filtered = nodes.filter((node) => {
      // Search filter
      const matchesSearch =
        searchTerm === '' ||
        node.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        node.zone.toLowerCase().includes(searchTerm.toLowerCase()) ||
        node.instanceType.toLowerCase().includes(searchTerm.toLowerCase());

      // Status filter
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'ready' && node.status === 'Ready') ||
        (statusFilter === 'notready' && node.status !== 'Ready');

      // Role filter
      const matchesRole =
        roleFilter === 'all' ||
        (roleFilter === 'control' && node.role.includes('control')) ||
        (roleFilter === 'worker' && !node.role.includes('control'));

      return matchesSearch && matchesStatus && matchesRole;
    });

    // Sort by role (control plane first), then by name
    filtered.sort((a, b) => {
      if (a.role.includes('control') && !b.role.includes('control')) return -1;
      if (!a.role.includes('control') && b.role.includes('control')) return 1;
      return a.name.localeCompare(b.name);
    });

    return filtered;
  }, [nodes, searchTerm, statusFilter, roleFilter]);

  return {
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    roleFilter,
    setRoleFilter,
    filteredAndSortedNodes,
  };
};
