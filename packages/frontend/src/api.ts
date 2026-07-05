import type { PolicyProfile, EvaluationReport } from '@procura/shared';

const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? '';

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, init);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export function createProfile(
  data: Omit<PolicyProfile, 'id' | 'createdAt'>,
): Promise<PolicyProfile> {
  return req('/profiles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export function listProfiles(): Promise<PolicyProfile[]> {
  return req('/profiles');
}

export function runEvaluation(params: {
  documentText: string;
  policyProfileId: string;
}): Promise<EvaluationReport> {
  return req('/evaluate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
}
