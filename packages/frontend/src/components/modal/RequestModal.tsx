import { useState, useEffect, type FC } from 'react';
import type { ToolRequest, RequestStatus, AIAnalysis, ToolDBEntry } from '../../types';
import { TOOL_DATABASE } from '../../data/toolDatabase';
import { getRequiredApprovals } from '../../lib/policyEngine';
import { runAIAnalysis } from '../../lib/claudeApi';
import AIAnalysisPanel from './AIAnalysisPanel';

interface RequestModalProps {
  req: ToolRequest;
  onClose: () => void;
  onUpdateStatus: (id: string, status: RequestStatus, reason?: string) => void;
  onSetAIAnalysis: (id: string, analysis: AIAnalysis) => void;
  initialShowReject?: boolean;
}

const STATUS_BADGE: Record<RequestStatus, string> = {
  Pending: 'bg-amber-500/15 text-amber-400 border border-amber-500/25',
  'Under Review': 'bg-blue-500/15 text-blue-400 border border-blue-500/25',
  Approved: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25',
  Rejected: 'bg-red-500/15 text-red-400 border border-red-500/25',
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

interface GridFieldProps {
  label: string;
  value: string;
  mono?: boolean;
}

function GridField({ label, value, mono }: GridFieldProps) {
  return (
    <div>
      <p className="text-[10px] font-semibold text-[#3d5870] uppercase tracking-wider mb-1">
        {label}
      </p>
      <p className={`text-[13px] text-[#c0d0e0] leading-snug ${mono ? 'mono' : ''}`}>{value}</p>
    </div>
  );
}

const RequestModal: FC<RequestModalProps> = ({
  req,
  onClose,
  onUpdateStatus,
  onSetAIAnalysis,
  initialShowReject = false,
}) => {
  const [analysing, setAnalysing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(initialShowReject);

  const dbEntry: ToolDBEntry | undefined = TOOL_DATABASE.find(
    (e) => e.name.toLowerCase() === req.tool.toLowerCase(),
  );
  const policyApprovals = getRequiredApprovals(req, TOOL_DATABASE);
  const existingApproved = TOOL_DATABASE.filter((e) => e.status === 'approved').map((e) => e.name);
  const canAction = req.status === 'Pending' || req.status === 'Under Review';

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  async function handleRunAnalysis() {
    setAnalysing(true);
    setAnalysisError(null);
    try {
      const analysis = await runAIAnalysis(req, dbEntry, existingApproved);
      onSetAIAnalysis(req.id, analysis);
    } catch (err) {
      setAnalysisError(err instanceof Error ? err.message : String(err));
    } finally {
      setAnalysing(false);
    }
  }

  function handleApprove() {
    onUpdateStatus(req.id, 'Approved');
    onClose();
  }

  function handleReject() {
    if (!rejectionReason.trim()) return;
    onUpdateStatus(req.id, 'Rejected', rejectionReason.trim());
    onClose();
  }

  return (
    <div
      className="fixed inset-0 bg-black/65 flex items-center justify-center z-50 p-4"
      style={{ backdropFilter: 'blur(3px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-[#13161f] border border-[#1e2840] rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Modal header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-[#1a2035]">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-[17px] font-semibold text-white">{req.tool}</h2>
              <span
                className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${STATUS_BADGE[req.status]}`}
              >
                {req.status}
              </span>
            </div>
            <p className="text-[#4a6880] text-[13px] mt-0.5">{req.vendor}</p>
          </div>
          <button
            onClick={onClose}
            className="text-[#3a5870] hover:text-[#8899aa] text-lg leading-none p-1 transition-colors mt-0.5"
          >
            ✕
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Two-column detail grid */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-4">
            <GridField label="Request ID" value={req.id} mono />
            <GridField label="Status" value={req.status} />
            <GridField label="Tool" value={req.tool} />
            <GridField label="Vendor" value={req.vendor} />
            <GridField label="Category" value={req.cat} />
            <GridField label="Department" value={req.dept} />
            <GridField label="Annual Cost" value={`$${req.cost.toLocaleString()}`} mono />
            <GridField label="Data Sensitivity" value={req.dataSens} />
            <GridField label="Submitted" value={fmtDate(req.submittedAt)} />
            {req.resolvedAt && (
              <GridField label="Resolved" value={fmtDate(req.resolvedAt)} />
            )}
          </div>

          {/* Intended usage */}
          <div className="border-t border-[#1a2035] pt-5">
            <p className="text-[11px] font-semibold text-[#3d5870] uppercase tracking-wider mb-1.5">
              Intended Usage
            </p>
            <p className="text-[13px] text-[#8aacb8] leading-relaxed">{req.usage}</p>
          </div>

          {/* Justification */}
          <div>
            <p className="text-[11px] font-semibold text-[#3d5870] uppercase tracking-wider mb-1.5">
              Business Justification
            </p>
            <p className="text-[13px] text-[#8aacb8] leading-relaxed">{req.justification}</p>
          </div>

          {/* Tool DB entry */}
          {dbEntry && (
            <div className="bg-[#0d1018] border border-[#1a2035] rounded-lg px-4 py-3 space-y-2">
              <p className="text-[10px] font-semibold text-[#3d5870] uppercase tracking-wider">
                Tool Database Entry
              </p>
              <div className="flex items-start gap-3">
                <span
                  className={`text-[12px] font-semibold capitalize shrink-0 ${
                    dbEntry.status === 'approved'
                      ? 'text-emerald-400'
                      : dbEntry.status === 'restricted'
                        ? 'text-amber-400'
                        : 'text-[#8899aa]'
                  }`}
                >
                  {dbEntry.status}
                </span>
                <span className="text-[12px] text-[#4a6880]">{dbEntry.notes}</span>
              </div>
              {dbEntry.alts.length > 0 && (
                <p className="text-[12px] text-[#3a5060]">
                  Alternatives:{' '}
                  <span className="text-[#607080]">{dbEntry.alts.join(', ')}</span>
                </p>
              )}
            </div>
          )}

          {/* Policy approvals */}
          <div>
            <p className="text-[11px] font-semibold text-[#3d5870] uppercase tracking-wider mb-2">
              Policy-Required Approvals
            </p>
            <div className="flex flex-wrap gap-2">
              {policyApprovals.map((a) => (
                <span
                  key={a}
                  className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[11px] font-medium px-2.5 py-1 rounded-full"
                >
                  {a}
                </span>
              ))}
            </div>
          </div>

          {/* Rejection reason */}
          {req.status === 'Rejected' && req.reason && (
            <div className="bg-red-500/8 border border-red-500/20 rounded-lg px-4 py-3">
              <p className="text-[11px] font-semibold text-red-400 uppercase tracking-wider mb-1">
                Rejection Reason
              </p>
              <p className="text-[13px] text-red-300/75 leading-relaxed">{req.reason}</p>
            </div>
          )}

          {/* AI Analysis */}
          <div className="border-t border-[#1a2035] pt-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-semibold text-[#3d5870] uppercase tracking-wider">
                AI Analysis
              </p>
              {!req.aiAnalysis && !analysing && (
                <button
                  onClick={handleRunAnalysis}
                  className="text-[12px] bg-indigo-500 hover:bg-indigo-600 text-white px-3 py-1.5 rounded-md font-medium transition-colors"
                >
                  Run AI Analysis
                </button>
              )}
            </div>

            {analysing && (
              <div className="flex items-center gap-2 text-[13px] text-[#4a7090] py-2">
                <span
                  className="inline-block animate-spin"
                  style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}
                >
                  ⟳
                </span>
                Running analysis…
              </div>
            )}

            {analysisError && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2 text-[13px] text-red-400">
                {analysisError}
              </div>
            )}

            {req.aiAnalysis ? (
              <AIAnalysisPanel analysis={req.aiAnalysis} />
            ) : (
              !analysing && (
                <p className="text-[13px] text-[#2a4050] italic">
                  No AI analysis yet. Click "Run AI Analysis" to generate one.
                </p>
              )
            )}
          </div>
        </div>

        {/* Footer actions */}
        {canAction && (
          <div className="px-6 py-4 border-t border-[#1a2035] space-y-3">
            {showRejectInput ? (
              <div className="space-y-2">
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Provide a reason for rejection…"
                  rows={3}
                  autoFocus
                  className="w-full bg-[#0d1018] border border-[#1a2035] text-[#c8d8e8] rounded-md px-3 py-2 text-[13px] placeholder:text-[#2a4050] focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500 resize-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleReject}
                    disabled={!rejectionReason.trim()}
                    className="bg-red-500 hover:bg-red-600 disabled:opacity-40 text-white text-[13px] font-medium px-4 py-2 rounded-md transition-colors"
                  >
                    Confirm Rejection
                  </button>
                  <button
                    onClick={() => setShowRejectInput(false)}
                    className="border border-[#1a2035] text-[#7a90a8] text-[13px] px-4 py-2 rounded-md hover:bg-[#0f1320] transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={handleApprove}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-[13px] font-medium px-4 py-2 rounded-md transition-colors"
                >
                  Approve
                </button>
                <button
                  onClick={() => setShowRejectInput(true)}
                  className="bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/25 text-[13px] font-medium px-4 py-2 rounded-md transition-colors"
                >
                  Reject
                </button>
                {req.status === 'Pending' && (
                  <button
                    onClick={() => onUpdateStatus(req.id, 'Under Review')}
                    className="border border-[#1a2035] text-[#7a90a8] hover:text-white hover:bg-[#0f1320] text-[13px] font-medium px-4 py-2 rounded-md transition-colors"
                  >
                    Mark Under Review
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default RequestModal;
