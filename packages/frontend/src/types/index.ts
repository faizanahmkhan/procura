export type ToolCategory =
  | 'AI Coding'
  | 'AI Chat / LLM'
  | 'AI Search'
  | 'AI Image/Video'
  | 'AI Voice'
  | 'Data / Analytics'
  | 'Productivity'
  | 'Other';

export type DataSensitivity =
  | 'Public only'
  | 'Internal documents'
  | 'Code / IP'
  | 'Customer data'
  | 'PII';

export type RequestStatus = 'Pending' | 'Under Review' | 'Approved' | 'Rejected';

export type RiskLevel = 'low' | 'medium' | 'high';

export interface AIFlag {
  label: string;
  type: 'info' | 'warn' | 'danger';
}

export interface DuplicateMatch {
  tool: string;
  note: string;
}

export interface AIAnalysis {
  riskLevel: RiskLevel;
  toolType: string;
  flags: AIFlag[];
  duplicates: DuplicateMatch[];
  requiredApprovals: string[];
  recommendations: string[];
  reviewerQuestions: string[];
}

export interface ToolRequest {
  id: string;
  tool: string;
  vendor: string;
  cat: ToolCategory;
  cost: number;
  dept: string;
  dataSens: DataSensitivity;
  usage: string;
  justification: string;
  status: RequestStatus;
  submittedAt: string;
  resolvedAt: string | null;
  reason: string | null;
  aiAnalysis: AIAnalysis | null;
}

export interface ToolDBEntry {
  name: string;
  vendor: string;
  cat: ToolCategory;
  status: 'approved' | 'restricted' | 'unknown';
  alts: string[];
  risk: RiskLevel;
  notes: string;
}
