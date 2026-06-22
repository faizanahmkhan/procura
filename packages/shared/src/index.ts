export interface PolicyProfile {
  id: string;
  name: string;
  dataResidencyRegion: string;
  requiredCertifications: string[];
  costBanding: 'low' | 'medium' | 'high';
  vendorLockInTolerance: 'low' | 'medium' | 'high';
  createdAt: string;
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
