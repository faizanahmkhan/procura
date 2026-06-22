import type { FC } from 'react';
import type { AIAnalysis, AIFlag, RiskLevel } from '../../types';

const RISK_BADGE: Record<RiskLevel, string> = {
  low: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25',
  medium: 'bg-amber-500/15 text-amber-400 border border-amber-500/25',
  high: 'bg-red-500/15 text-red-400 border border-red-500/25',
};

const FLAG_STYLES: Record<AIFlag['type'], { cls: string; icon: string }> = {
  info: { cls: 'bg-blue-500/10 border border-blue-500/20 text-blue-300', icon: 'ℹ' },
  warn: { cls: 'bg-amber-500/10 border border-amber-500/20 text-amber-300', icon: '⚠' },
  danger: { cls: 'bg-red-500/10 border border-red-500/20 text-red-300', icon: '✕' },
};

const Section: FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div>
    <h4 className="text-[11px] font-semibold text-[#3d5870] uppercase tracking-wider mb-2">
      {title}
    </h4>
    {children}
  </div>
);

const AIAnalysisPanel: FC<{ analysis: AIAnalysis }> = ({ analysis }) => {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <span
          className={`px-3 py-1 rounded-full text-[12px] font-semibold capitalize ${RISK_BADGE[analysis.riskLevel]}`}
        >
          {analysis.riskLevel} risk
        </span>
        <span className="text-[#607080] text-[13px]">{analysis.toolType}</span>
      </div>

      {analysis.flags.length > 0 && (
        <Section title="Flags">
          <div className="space-y-2">
            {analysis.flags.map((flag, i) => {
              const s = FLAG_STYLES[flag.type];
              return (
                <div key={i} className={`flex items-start gap-2 rounded-md px-3 py-2 ${s.cls}`}>
                  <span className="text-[11px] font-bold mt-0.5 shrink-0">{s.icon}</span>
                  <span className="text-[13px]">{flag.label}</span>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {analysis.duplicates.length > 0 && (
        <Section title="Potential Duplicates">
          <div className="space-y-2">
            {analysis.duplicates.map((dup, i) => (
              <div key={i} className="bg-[#0d1018] border border-[#1a2035] rounded-md px-3 py-2">
                <p className="text-[13px] font-medium text-[#c8d8e8]">{dup.tool}</p>
                <p className="text-[12px] text-[#4a6880] mt-0.5">{dup.note}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {analysis.requiredApprovals.length > 0 && (
        <Section title="Required Approvals">
          <div className="flex flex-wrap gap-2">
            {analysis.requiredApprovals.map((a) => (
              <span
                key={a}
                className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[11px] font-medium px-2.5 py-1 rounded-full"
              >
                {a}
              </span>
            ))}
          </div>
        </Section>
      )}

      {analysis.recommendations.length > 0 && (
        <Section title="Recommendations">
          <ul className="space-y-1.5">
            {analysis.recommendations.map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-[13px] text-[#8aacb8]">
                <span className="text-indigo-400 mt-0.5 shrink-0">→</span>
                {r}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {analysis.reviewerQuestions.length > 0 && (
        <Section title="Questions for Requester">
          <ul className="space-y-1.5">
            {analysis.reviewerQuestions.map((q, i) => (
              <li key={i} className="flex items-start gap-2 text-[13px] text-[#8aacb8]">
                <span className="text-[#3a5870] mt-0.5 shrink-0 font-bold">?</span>
                {q}
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
};

export default AIAnalysisPanel;
