import type { FC } from 'react';
import type { ToolRequest } from '../../types';

interface StatsStripProps {
  requests: ToolRequest[];
}

const StatsStrip: FC<StatsStripProps> = ({ requests }) => {
  const pending = requests.filter((r) => r.status === 'Pending').length;
  const highRisk = requests.filter((r) => r.aiAnalysis?.riskLevel === 'high').length;
  const approved = requests.filter((r) => r.status === 'Approved').length;

  const stats = [
    { label: 'Total Requests', value: requests.length, valueColor: 'text-white' },
    { label: 'Pending', value: pending, valueColor: 'text-amber-400' },
    { label: 'High-Risk Flagged', value: highRisk, valueColor: 'text-red-400' },
    { label: 'Approved', value: approved, valueColor: 'text-emerald-400' },
  ];

  return (
    <div className="grid grid-cols-4 gap-3">
      {stats.map((s) => (
        <div
          key={s.label}
          className="bg-[#13161f] border border-[#1a2035] rounded-lg px-5 py-4"
        >
          <p className="text-[11px] font-medium text-[#4a6080] uppercase tracking-wider">{s.label}</p>
          <p className={`mono text-[30px] font-bold mt-1.5 leading-none tabular-nums ${s.valueColor}`}>
            {s.value}
          </p>
        </div>
      ))}
    </div>
  );
};

export default StatsStrip;
