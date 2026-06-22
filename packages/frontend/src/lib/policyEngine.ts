import type { ToolRequest, ToolDBEntry } from '../types';

export function getRequiredApprovals(req: ToolRequest, db: ToolDBEntry[]): string[] {
  const approvals: string[] = ['Manager'];

  if (req.cost > 1000) {
    approvals.push('Finance');
  }

  if (req.dataSens === 'Code / IP' || req.dataSens === 'Customer data') {
    approvals.push('Security/IT');
  }

  if (req.dataSens === 'Customer data' || req.dataSens === 'PII') {
    approvals.push('Compliance');
  }

  const dbEntry = db.find((e) => e.name.toLowerCase() === req.tool.toLowerCase());
  if (dbEntry?.status === 'restricted') {
    approvals.push('IT Review');
  }

  return approvals;
}
