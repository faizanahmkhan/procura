import type { FC } from 'react';
import type { ToolRequest, RequestStatus, RiskLevel } from '../../types';

interface RequestTableProps {
  requests: ToolRequest[];
  onRowView: (req: ToolRequest) => void;
  onRowApprove: (req: ToolRequest) => void;
  onRowReject: (req: ToolRequest) => void;
}

const STATUS_STYLES: Record<RequestStatus, string> = {
  Pending: 'bg-amber-500/15 text-amber-400 border border-amber-500/25',
  'Under Review': 'bg-blue-500/15 text-blue-400 border border-blue-500/25',
  Approved: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25',
  Rejected: 'bg-red-500/15 text-red-400 border border-red-500/25',
};

const RISK_STYLES: Record<RiskLevel, string> = {
  low: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25',
  medium: 'bg-amber-500/15 text-amber-400 border border-amber-500/25',
  high: 'bg-red-500/15 text-red-400 border border-red-500/25',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

const TH = ({ children }: { children: string }) => (
  <th className="text-left px-4 py-3 text-[10px] font-semibold text-[#3d5870] uppercase tracking-wider whitespace-nowrap">
    {children}
  </th>
);

const RequestTable: FC<RequestTableProps> = ({ requests, onRowView, onRowApprove, onRowReject }) => {
  if (requests.length === 0) {
    return (
      <div className="bg-[#13161f] border border-[#1a2035] rounded-lg p-12 text-center">
        <p className="text-[#3a5060] text-sm">No requests match your filters.</p>
      </div>
    );
  }

  return (
    <div className="bg-[#13161f] border border-[#1a2035] rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#0d1018] border-b border-[#1a2035]">
              <TH>ID</TH>
              <TH>Tool / Vendor</TH>
              <TH>Category</TH>
              <TH>Dept</TH>
              <TH>Cost / yr</TH>
              <TH>Data Sensitivity</TH>
              <TH>AI Risk</TH>
              <TH>Status</TH>
              <TH>Submitted</TH>
              <TH>Actions</TH>
            </tr>
          </thead>
          <tbody>
            {requests.map((req) => {
              const canAction = req.status === 'Pending' || req.status === 'Under Review';
              return (
                <tr
                  key={req.id}
                  onClick={() => onRowView(req)}
                  className="border-b border-[#1a2035] hover:bg-[#0f1320] cursor-pointer transition-colors last:border-0 group"
                >
                  <td className="px-4 py-3">
                    <span className="mono text-[11px] text-[#3a6080]">{req.id}</span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-[#e2e8f0] text-[13px]">{req.tool}</p>
                    <p className="text-[#4a6880] text-[11px] mt-0.5">{req.vendor}</p>
                  </td>
                  <td className="px-4 py-3 text-[#7a90a8] text-[13px] whitespace-nowrap">
                    {req.cat}
                  </td>
                  <td className="px-4 py-3 text-[#7a90a8] text-[13px]">{req.dept}</td>
                  <td className="px-4 py-3">
                    <span className="mono text-[13px] font-medium text-[#b8ccd8]">
                      ${req.cost.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#7a90a8] text-[13px]">{req.dataSens}</td>
                  <td className="px-4 py-3">
                    {req.aiAnalysis ? (
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-medium capitalize ${RISK_STYLES[req.aiAnalysis.riskLevel]}`}
                      >
                        {req.aiAnalysis.riskLevel}
                      </span>
                    ) : (
                      <span className="text-[#2a4050] text-[12px]">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap ${STATUS_STYLES[req.status]}`}
                    >
                      {req.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#4a6080] text-[12px] whitespace-nowrap mono">
                    {formatDate(req.submittedAt)}
                  </td>
                  <td
                    className="px-4 py-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onRowView(req)}
                        className="text-[12px] text-[#4a6888] hover:text-indigo-400 px-2 py-1 rounded hover:bg-indigo-500/10 transition-colors whitespace-nowrap"
                      >
                        View
                      </button>
                      {canAction && (
                        <>
                          <button
                            onClick={() => onRowApprove(req)}
                            className="text-[12px] text-[#3a7060] hover:text-emerald-400 px-2 py-1 rounded hover:bg-emerald-500/10 transition-colors"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => onRowReject(req)}
                            className="text-[12px] text-[#703a3a] hover:text-red-400 px-2 py-1 rounded hover:bg-red-500/10 transition-colors"
                          >
                            Reject
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RequestTable;
