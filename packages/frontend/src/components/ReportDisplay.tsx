import type { FC } from 'react';
import type { EvaluationReport, PolicyCheckResult } from '@procura/shared';

const STATUS_LABELS: Record<PolicyCheckResult['status'], string> = {
  pass: 'Pass',
  fail: 'Fail',
  'needs-review': 'Needs review',
};

const CheckCard: FC<{ check: PolicyCheckResult }> = ({ check }) => (
  <div className={`check-card check-${check.status}`}>
    <span className="check-badge">{STATUS_LABELS[check.status]}</span>
    <div>
      <p className="check-name">{check.checkName}</p>
      <p className="check-detail">{check.detail}</p>
    </div>
  </div>
);

const ReportDisplay: FC<{ report: EvaluationReport }> = ({ report }) => (
  <section className="report">
    <header className="report-header">
      <h2>{report.vendorName}</h2>
      <p className="muted">
        Evaluated {new Date(report.createdAt).toLocaleString()} · <code>{report.id}</code>
      </p>
    </header>

    <h3>Policy checks</h3>
    <div className="check-list">
      {report.policyChecks.length === 0 ? (
        <p className="muted">No policy checks were run.</p>
      ) : (
        report.policyChecks.map((check) => <CheckCard key={check.checkId} check={check} />)
      )}
    </div>

    <h3>Fit</h3>
    <p className="analysis">{report.fitAnalysis}</p>

    <h3>Risk</h3>
    <p className="analysis">{report.riskAnalysis}</p>

    <h3>Value</h3>
    <p className="analysis">{report.valueAnalysis}</p>
  </section>
);

export default ReportDisplay;
