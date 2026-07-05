export interface PolicyProfile {
  id: string;
  name: string;
  dataResidencyRegion: string;
  requiredCertifications: string[];
  costBanding: 'low' | 'medium' | 'high';
  vendorLockInTolerance: 'low' | 'medium' | 'high';
  createdAt: string;
}

export interface OrchestratorRequest {
  s3Key: string;
  policyProfileId: string;
}

export interface EvaluationRequest {
  id: string;
  policyProfileId: string;
  vendorName: string;
  vendorDocumentation: string;
  createdAt: string;
}

export interface PolicyCheckResult {
  checkId: string;
  checkName: string;
  status: 'pass' | 'fail' | 'needs-review';
  detail: string;
}

// ── Policy-check tool result types (returned by MCP server tools) ────────────

export interface DataResidencyCheckResult {
  detectedRegion: string | null;
  compliant: boolean;
}

export interface SecurityCertificationCheckResult {
  found: string[];
  missing: string[];
  compliant: boolean;
}

// ── Evaluation domain types ───────────────────────────────────────────────────

export interface EvaluationReport {
  id: string;
  requestId: string;
  vendorName: string;
  policyChecks: PolicyCheckResult[];
  fitAnalysis: string;
  riskAnalysis: string;
  valueAnalysis: string;
  createdAt: string;
}
