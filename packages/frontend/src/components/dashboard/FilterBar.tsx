import type { FC, ChangeEvent } from 'react';
import type { RequestStatus, ToolCategory } from '../../types';

export type SortKey = 'date-desc' | 'date-asc' | 'cost-desc' | 'cost-asc';

export interface FilterState {
  search: string;
  status: RequestStatus | 'All';
  category: ToolCategory | 'All';
  sort: SortKey;
}

interface FilterBarProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
}

const STATUS_OPTIONS: Array<RequestStatus | 'All'> = [
  'All',
  'Pending',
  'Under Review',
  'Approved',
  'Rejected',
];

const CATEGORY_OPTIONS: Array<ToolCategory | 'All'> = [
  'All',
  'AI Coding',
  'AI Chat / LLM',
  'AI Search',
  'AI Image/Video',
  'AI Voice',
  'Data / Analytics',
  'Productivity',
  'Other',
];

const SORT_OPTIONS: Array<{ value: SortKey; label: string }> = [
  { value: 'date-desc', label: 'Newest first' },
  { value: 'date-asc', label: 'Oldest first' },
  { value: 'cost-desc', label: 'Cost: High → Low' },
  { value: 'cost-asc', label: 'Cost: Low → High' },
];

const selectCls =
  'bg-[#0d1018] border border-[#1a2035] text-[#c8d8e8] rounded-md px-3 py-2 text-[13px] focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors cursor-pointer';

const FilterBar: FC<FilterBarProps> = ({ filters, onChange }) => {
  const update = (patch: Partial<FilterState>) => onChange({ ...filters, ...patch });
  const hasActive = filters.search || filters.status !== 'All' || filters.category !== 'All';

  return (
    <div className="flex items-center gap-2.5 flex-wrap">
      <input
        type="text"
        placeholder="Search tool or vendor…"
        value={filters.search}
        onChange={(e: ChangeEvent<HTMLInputElement>) => update({ search: e.target.value })}
        className={`${selectCls} w-52 placeholder:text-[#334a60]`}
      />

      <select
        value={filters.status}
        onChange={(e: ChangeEvent<HTMLSelectElement>) =>
          update({ status: e.target.value as RequestStatus | 'All' })
        }
        className={selectCls}
      >
        {STATUS_OPTIONS.map((s) => (
          <option key={s} value={s}>
            {s === 'All' ? 'All Statuses' : s}
          </option>
        ))}
      </select>

      <select
        value={filters.category}
        onChange={(e: ChangeEvent<HTMLSelectElement>) =>
          update({ category: e.target.value as ToolCategory | 'All' })
        }
        className={selectCls}
      >
        {CATEGORY_OPTIONS.map((c) => (
          <option key={c} value={c}>
            {c === 'All' ? 'All Categories' : c}
          </option>
        ))}
      </select>

      <select
        value={filters.sort}
        onChange={(e: ChangeEvent<HTMLSelectElement>) =>
          update({ sort: e.target.value as SortKey })
        }
        className={selectCls}
      >
        {SORT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      {hasActive && (
        <button
          onClick={() =>
            onChange({ search: '', status: 'All', category: 'All', sort: filters.sort })
          }
          className="text-[12px] text-[#4a6080] hover:text-indigo-400 transition-colors"
        >
          Clear filters
        </button>
      )}
    </div>
  );
};

export default FilterBar;
