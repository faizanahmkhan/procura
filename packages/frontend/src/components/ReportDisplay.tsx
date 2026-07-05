import type { FC, ReactNode } from 'react';
import type { EvaluationReport, PolicyCheckResult } from '@procura/shared';

const STATUS_CONFIG = {
  pass: { label: 'Pass', cls: 'bg-emerald-900/60 text-emerald-300 border border-emerald-700' },
  fail: { label: 'Fail', cls: 'bg-red-900/60 text-red-300 border border-red-700' },
  'needs-review': {
    label: 'Needs review',
    cls: 'bg-amber-900/60 text-amber-300 border border-amber-700',
  },
} satisfies Record<string, { label: string; cls: string }>;

const CheckRow: FC<{ check: PolicyCheckResult }> = ({ check }) => {
  const cfg = STATUS_CONFIG[check.status];
  return (
    <div className="flex items-start gap-4 py-3 border-b border-slate-800 last:border-0">
      <span className={`mt-0.5 shrink-0 px-2 py-0.5 rounded text-xs font-medium ${cfg.cls}`}>
        {cfg.label}
      </span>
      <div>
        <p className="text-sm font-medium text-slate-200">{check.checkName}</p>
        <p className="text-xs text-slate-500 mt-0.5">{check.detail}</p>
      </div>
    </div>
  );
};

const Card: FC<{ title: string; children: ReactNode }> = ({ title, children }) => (
  <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
      {title}
    </h3>
    {children}
  </div>
);

const ReportDisplay: FC<{ report: EvaluationReport }> = ({ report }) => (
  <div className="space-y-6 pt-6 border-t border-slate-800">
    <div>
      <h2 className="text-lg font-semibold text-white">{report.vendorName}</h2>
      <p className="text-xs text-slate-500 font-mono mt-1">
        {report.id} · {new Date(report.createdAt).toLocaleString()}
      </p>
    </div>

    <div>
      <h3 className="text-sm font-medium text-slate-400 mb-3">Policy checks</h3>
      <div className="rounded-lg border border-slate-800 px-4">
        {report.policyChecks.map((check) => (
          <CheckRow key={check.checkId} check={check} />
        ))}
      </div>
    </div>

    <div className="grid gap-4 sm:grid-cols-3">
      <Card title="Fit">
        <p className="text-sm text-slate-300 leading-relaxed">{report.fitAnalysis}</p>
      </Card>
      <Card title="Risk">
        <p className="text-sm text-slate-300 leading-relaxed">{report.riskAnalysis}</p>
      </Card>
      <Card title="Value">
        <p className="text-sm text-slate-300 leading-relaxed">{report.valueAnalysis}</p>
      </Card>
    </div>
  </div>
);

export default ReportDisplay;
