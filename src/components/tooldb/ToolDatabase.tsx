import { useState, type FC, type ChangeEvent } from 'react';
import type { RiskLevel } from '../../types';
import { TOOL_DATABASE } from '../../data/toolDatabase';
import Header from '../layout/Header';

const STATUS_STYLES: Record<'approved' | 'restricted' | 'unknown', string> = {
  approved: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25',
  restricted: 'bg-amber-500/15 text-amber-400 border border-amber-500/25',
  unknown: 'bg-[#1a2035] text-[#7a90a8] border border-[#2a3850]',
};

const RISK_STYLES: Record<RiskLevel, string> = {
  low: 'text-emerald-400',
  medium: 'text-amber-400',
  high: 'text-red-400',
};

const TH = ({ children }: { children: string }) => (
  <th className="text-left px-4 py-3 text-[10px] font-semibold text-[#3d5870] uppercase tracking-wider whitespace-nowrap">
    {children}
  </th>
);

const ToolDatabase: FC = () => {
  const [search, setSearch] = useState('');

  const filtered = TOOL_DATABASE.filter(
    (e) =>
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.vendor.toLowerCase().includes(search.toLowerCase()) ||
      e.cat.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <Header
        title="Tool Intelligence Database"
        subtitle="Organisation-wide AI tool registry and governance status"
      />

      <div className="flex-1 overflow-auto p-6 space-y-4">
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Search tools, vendors, categories…"
            value={search}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
            className="bg-[#0d1018] border border-[#1a2035] text-[#c8d8e8] rounded-md px-3 py-2 text-[13px] w-64 placeholder:text-[#2a4050] focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
          />
          <span className="text-[12px] text-[#3a5060]">
            {filtered.length} / {TOOL_DATABASE.length} tools
          </span>
        </div>

        <div className="bg-[#13161f] border border-[#1a2035] rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#0d1018] border-b border-[#1a2035]">
                  <TH>Tool</TH>
                  <TH>Vendor</TH>
                  <TH>Category</TH>
                  <TH>Status</TH>
                  <TH>Risk</TH>
                  <TH>Alternatives</TH>
                  <TH>Notes</TH>
                </tr>
              </thead>
              <tbody>
                {filtered.map((entry) => (
                  <tr
                    key={entry.name}
                    className="border-b border-[#1a2035] hover:bg-[#0f1320] transition-colors last:border-0"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-[#e2e8f0] text-[13px]">{entry.name}</p>
                    </td>
                    <td className="px-4 py-3 text-[#7a90a8] text-[13px]">{entry.vendor}</td>
                    <td className="px-4 py-3 text-[#7a90a8] text-[13px] whitespace-nowrap">
                      {entry.cat}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-medium capitalize ${STATUS_STYLES[entry.status]}`}
                      >
                        {entry.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`mono text-[12px] font-semibold capitalize ${RISK_STYLES[entry.risk]}`}
                      >
                        {entry.risk}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {entry.alts.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {entry.alts.map((alt) => (
                            <span
                              key={alt}
                              className="text-[11px] text-[#4a6880] bg-[#0d1018] border border-[#1a2035] px-1.5 py-0.5 rounded"
                            >
                              {alt}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[#2a4050] text-[12px]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[#4a6880] text-[12px] max-w-xs leading-relaxed">
                      {entry.notes}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filtered.length === 0 && (
              <p className="text-center text-[#2a4050] text-sm py-12">
                No tools match your search.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ToolDatabase;
