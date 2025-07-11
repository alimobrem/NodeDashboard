import * as React from 'react';
import {
  Toolbar,
  ToolbarContent,
  ToolbarItem,
  TextInput,
  Flex,
  FlexItem,
} from '@patternfly/react-core';
import { SearchIcon } from '@patternfly/react-icons';

interface NodeFiltersProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  statusFilter: string;
  setStatusFilter: (filter: string) => void;
  roleFilter: string;
  setRoleFilter: (filter: string) => void;
}

export const NodeFilters: React.FC<NodeFiltersProps> = ({
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  roleFilter,
  setRoleFilter,
}) => {
  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'ready', label: 'Ready' },
    { value: 'notready', label: 'Not Ready' },
  ];

  const roleOptions = [
    { value: 'all', label: 'All Roles' },
    { value: 'control', label: 'Control Plane' },
    { value: 'worker', label: 'Worker' },
  ];

  return (
    <Toolbar>
      <ToolbarContent>
        <ToolbarItem>
          <Flex alignItems={{ default: 'alignItemsCenter' }}>
            <FlexItem>
              <TextInput
                type="search"
                aria-label="Search nodes"
                placeholder="Search nodes by name, zone, or instance type..."
                value={searchTerm}
                onChange={(_, value) => setSearchTerm(value)}
                style={{ width: '300px' }}
              />
            </FlexItem>
            <FlexItem>
              <SearchIcon style={{ color: '#6a6e73', marginLeft: '8px' }} />
            </FlexItem>
          </Flex>
        </ToolbarItem>

        <ToolbarItem>
          <select
            aria-label="Filter by status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              width: '200px',
              height: '36px',
              padding: '6px 8px',
              border: '1px solid #d2d2d2',
              borderRadius: '3px',
              fontSize: '14px',
            }}
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </ToolbarItem>

        <ToolbarItem>
          <select
            aria-label="Filter by role"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            style={{
              width: '200px',
              height: '36px',
              padding: '6px 8px',
              border: '1px solid #d2d2d2',
              borderRadius: '3px',
              fontSize: '14px',
            }}
          >
            {roleOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </ToolbarItem>
      </ToolbarContent>
    </Toolbar>
  );
};

export default NodeFilters;
