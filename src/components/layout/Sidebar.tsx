import { useState, useEffect, type FC } from 'react';
import type { ToolRequest } from '../../types';

interface SidebarProps {
  activeView: string;
  onNavigate: (view: string) => void;
  requests: ToolRequest[];
}

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: '⊞' },
  { id: 'new-request', label: 'New Request', icon: '+' },
  { id: 'tool-database', label: 'Tool Database', icon: '◫' },
];

const Sidebar: FC<SidebarProps> = ({ activeView, onNavigate, requests }) => {
  const [time, setTime] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const pending = requests.filter((r) => r.status === 'Pending').length;
  const underReview = requests.filter((r) => r.status === 'Under Review').length;
  const approved = requests.filter((r) => r.status === 'Approved').length;
  const rejected = requests.filter((r) => r.status === 'Rejected').length;

  const statusCounts = [
    { label: 'Pending', count: pending, color: 'text-amber-400' },
    { label: 'Under Review', count: underReview, color: 'text-blue-400' },
    { label: 'Approved', count: approved, color: 'text-emerald-400' },
    { label: 'Rejected', count: rejected, color: 'text-red-400' },
  ];

  return (
    <aside className="w-[220px] min-h-screen bg-[#080b11] border-r border-[#1a2035] flex flex-col shrink-0">
      {/* Logo + Clock */}
      <div className="px-5 py-5 border-b border-[#1a2035]">
        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-7 h-7 rounded-md bg-indigo-500 flex items-center justify-center shrink-0">
            <span className="text-white text-xs font-bold leading-none">P</span>
          </div>
          <span className="text-white font-semibold text-[15px] tracking-tight">Procura</span>
        </div>
        <p className="text-[#3d5068] text-[11px] leading-4">AI Procurement Intelligence</p>
        <p className="mono text-indigo-400 text-[11px] mt-2 tabular-nums tracking-wide">
          {time.toLocaleTimeString('en-GB')}
        </p>
      </div>

      {/* Navigation */}
      <nav className="px-2.5 pt-3 pb-1 space-y-0.5">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] font-medium transition-all cursor-pointer ${
              activeView === item.id
                ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/20'
                : 'text-[#8899aa] hover:bg-[#0f1320] hover:text-[#c8d8e8] border border-transparent'
            }`}
          >
            <span className="w-4 text-center text-sm">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      {/* Live Status counts */}
      <div className="mx-2.5 mt-3 border border-[#1a2035] rounded-lg px-3 py-3">
        <p className="text-[10px] font-semibold text-[#3a5068] uppercase tracking-widest mb-3">
          Live Status
        </p>
        <div className="space-y-2.5">
          {statusCounts.map((s) => (
            <div key={s.label} className="flex items-center justify-between">
              <span className="text-[12px] text-[#4a6880]">{s.label}</span>
              <span className={`mono text-[13px] font-semibold tabular-nums ${s.color}`}>
                {s.count}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-auto px-4 py-4 border-t border-[#1a2035]">
        <p className="text-[#253545] text-[11px]">v1.0.0 · Enterprise</p>
      </div>
    </aside>
  );
};

export default Sidebar;
