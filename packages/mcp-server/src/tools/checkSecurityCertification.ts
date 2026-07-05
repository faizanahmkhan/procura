import type { SecurityCertificationCheckResult } from '@procura/shared';

/**
 * Known certification aliases — keys are the canonical lower-cased name,
 * values are regexes that recognise any common text representation.
 */
const CERT_PATTERNS: Record<string, RegExp[]> = {
  'soc 2': [/\bSOC\s*2\b/i, /\bSOC\s+Type\s+II\b/i, /\bSOC\s+Type\s+2\b/i],
  'iso 27001': [/\bISO\s*[\/-]?IEC\s*27001\b/i, /\bISO\s*27001\b/i],
  'iso 9001': [/\bISO\s*9001\b/i],
  'pci dss': [/\bPCI[\s-]DSS\b/i, /\bPayment\s+Card\s+Industry\s+Data\s+Security\b/i],
  'cyber essentials': [/\bCyber\s+Essentials(\s+Plus)?\b/i],
  gdpr: [/\bGDPR\b/, /\bGeneral\s+Data\s+Protection\s+Regulation\b/i],
  hipaa: [/\bHIPAA\b/i, /\bHealth\s+Insurance\s+Portability\b/i],
  fedramp: [/\bFedRAMP\b/i, /\bFederal\s+Risk\s+and\s+Authorisation\b/i],
};

function normaliseCert(cert: string): string {
  return cert.toLowerCase().trim();
}

function getPatternsForCert(cert: string): RegExp[] {
  const norm = normaliseCert(cert);

  // Direct lookup
  if (CERT_PATTERNS[norm]) return CERT_PATTERNS[norm];

  // Partial key match (e.g. "ISO 27001" ≅ "iso 27001")
  for (const [key, patterns] of Object.entries(CERT_PATTERNS)) {
    if (key.includes(norm) || norm.includes(key)) return patterns;
  }

  // No alias — fall back to a case-insensitive literal match
  return [new RegExp(cert.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')];
}

/**
 * Checks which of the requiredCerts are mentioned in documentText.
 * Returns the ones found, the ones missing, and whether all are satisfied.
 */
export function checkSecurityCertification(
  documentText: string,
  requiredCerts: string[],
): SecurityCertificationCheckResult {
  const found: string[] = [];
  const missing: string[] = [];

  for (const cert of requiredCerts) {
    const patterns = getPatternsForCert(cert);
    if (patterns.some((re) => re.test(documentText))) {
      found.push(cert);
    } else {
      missing.push(cert);
    }
  }

  return { found, missing, compliant: missing.length === 0 };
}
