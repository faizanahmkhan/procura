import { useState, useMemo, type FC } from 'react';
import type { ToolRequest } from '../../types';
import type { FilterState } from './FilterBar';
import StatsStrip from './StatsStrip';
import FilterBar from './FilterBar';
import RequestTable from './RequestTable';
import Header from '../layout/Header';

interface DashboardProps {
  requests: ToolRequest[];
  onRowView: (req: ToolRequest) => void;
  onRowApprove: (req: ToolRequest) => void;
  onRowReject: (req: ToolRequest) => void;
  onNewRequest: () => void;
}

const DEFAULT_FILTERS: FilterState = {
  search: '',
  status: 'All',
  category: 'All',
  sort: 'date-desc',
};

const Dashboard: FC<DashboardProps> = ({
  requests,
  onRowView,
  onRowApprove,
  onRowReject,
  onNewRequest,
}) => {
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);

  const filtered = useMemo(() => {
    const result = requests.filter((req) => {
      if (filters.search) {
        const q = filters.search.toLowerCase();
        if (!req.tool.toLowerCase().includes(q) && !req.vendor.toLowerCase().includes(q)) {
          return false;
        }
      }
      if (filters.status !== 'All' && req.status !== filters.status) return false;
      if (filters.category !== 'All' && req.cat !== filters.category) return false;
      return true;
    });

    const sorted = [...result];
    switch (filters.sort) {
      case 'date-asc':
        sorted.sort(
          (a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime(),
        );
        break;
      case 'date-desc':
        sorted.sort(
          (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime(),
        );
        break;
      case 'cost-asc':
        sorted.sort((a, b) => a.cost - b.cost);
        break;
      case 'cost-desc':
        sorted.sort((a, b) => b.cost - a.cost);
        break;
    }
    return sorted;
  }, [requests, filters]);

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <Header
        title="Request Dashboard"
        subtitle={`${requests.length} total · ${filtered.length} shown`}
        action={
          <button
            onClick={onNewRequest}
            className="bg-indigo-500 hover:bg-indigo-600 text-white text-[13px] font-medium px-4 py-2 rounded-md transition-colors"
          >
            + New Request
          </button>
        }
      />

      <div className="flex-1 overflow-auto p-6 space-y-4">
        <StatsStrip requests={requests} />
        <FilterBar filters={filters} onChange={setFilters} />
        <RequestTable
          requests={filtered}
          onRowView={onRowView}
          onRowApprove={onRowApprove}
          onRowReject={onRowReject}
        />
      </div>
    </div>
  );
};

export default Dashboard;
