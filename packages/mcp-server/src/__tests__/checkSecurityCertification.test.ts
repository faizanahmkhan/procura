import { describe, it, expect } from 'vitest';
import { checkSecurityCertification } from '../tools/checkSecurityCertification.js';

describe('checkSecurityCertification', () => {
  it('marks all certs as found when the document mentions all of them', () => {
    const doc =
      'Our platform holds SOC 2 Type II and ISO 27001 certifications, audited annually.';
    const result = checkSecurityCertification(doc, ['SOC 2', 'ISO 27001']);
    expect(result.found).toEqual(['SOC 2', 'ISO 27001']);
    expect(result.missing).toEqual([]);
    expect(result.compliant).toBe(true);
  });

  it('correctly splits found and missing certs', () => {
    const doc =
      'We are ISO 27001 certified. PCI DSS and SOC 2 assessments are planned for next year.';
    const result = checkSecurityCertification(doc, ['ISO 27001', 'PCI DSS', 'SOC 2']);
    expect(result.found).toContain('ISO 27001');
    expect(result.found).toContain('PCI DSS'); // mentioned even if "planned"
    expect(result.found).toContain('SOC 2');
    expect(result.compliant).toBe(true);
  });

  it('returns all certs missing when the document mentions none', () => {
    const doc =
      'We take security seriously and follow industry best practices throughout our operations.';
    const result = checkSecurityCertification(doc, ['SOC 2', 'ISO 27001']);
    expect(result.found).toEqual([]);
    expect(result.missing).toEqual(['SOC 2', 'ISO 27001']);
    expect(result.compliant).toBe(false);
  });

  it('matches cert aliases — SOC2 without a space satisfies "SOC 2"', () => {
    const doc = 'The vendor has achieved SOC2 Type 2 compliance as of last quarter.';
    const result = checkSecurityCertification(doc, ['SOC 2']);
    expect(result.found).toContain('SOC 2');
    expect(result.compliant).toBe(true);
  });

  it('matches ISO/IEC variant for ISO 27001', () => {
    const doc = 'Security managed under ISO/IEC 27001:2022 framework.';
    const result = checkSecurityCertification(doc, ['ISO 27001']);
    expect(result.found).toContain('ISO 27001');
    expect(result.compliant).toBe(true);
  });

  it('matches Cyber Essentials Plus as a variant of Cyber Essentials', () => {
    const doc = 'UK government-certified Cyber Essentials Plus scheme.';
    const result = checkSecurityCertification(doc, ['Cyber Essentials']);
    expect(result.found).toContain('Cyber Essentials');
    expect(result.compliant).toBe(true);
  });

  it('returns compliant:false when only some certs are present', () => {
    const doc = 'Certified to ISO 27001. No PCI DSS certification at this time.';
    const result = checkSecurityCertification(doc, ['ISO 27001', 'SOC 2']);
    expect(result.found).toEqual(['ISO 27001']);
    expect(result.missing).toEqual(['SOC 2']);
    expect(result.compliant).toBe(false);
  });
});
