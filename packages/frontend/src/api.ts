import type { PolicyProfile, EvaluationRequest, EvaluationReport } from '@procura/shared';

const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? '';

/** Client-supplied fields when creating a profile; id/createdAt are server-generated. */
export type CreateProfileInput = Omit<PolicyProfile, 'id' | 'createdAt'>;

/** Client-supplied fields when requesting an evaluation; id/createdAt are server-generated. */
export type CreateEvaluationInput = Omit<EvaluationRequest, 'id' | 'createdAt'>;

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, init);
  if (!res.ok) {
    let message = `Request failed (HTTP ${res.status})`;
    try {
      const body = (await res.json()) as { message?: string };
      if (body.message) message = body.message;
    } catch {
      // Non-JSON error body — keep the status-code message.
    }
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

export function createProfile(input: CreateProfileInput): Promise<PolicyProfile> {
  return request('/profiles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

export function listProfiles(): Promise<PolicyProfile[]> {
  return request('/profiles');
}

export function createEvaluation(input: CreateEvaluationInput): Promise<EvaluationReport> {
  return request('/evaluations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}
