import { describe, it, expect } from 'vitest';
import { checkDataResidency } from '../tools/checkDataResidency.js';

describe('checkDataResidency', () => {
  it('detects UK and returns compliant when requiredRegion is "uk"', () => {
    const doc = 'All customer data is stored exclusively in the United Kingdom.';
    const result = checkDataResidency(doc, 'uk');
    expect(result.detectedRegion).toBe('uk');
    expect(result.compliant).toBe(true);
  });

  it('detects UK from the "UK" abbreviation', () => {
    const doc = 'Our servers are UK-based and comply with UK data protection law.';
    const result = checkDataResidency(doc, 'uk');
    expect(result.detectedRegion).toBe('uk');
    expect(result.compliant).toBe(true);
  });

  it('returns non-compliant when document mentions a different region', () => {
    const doc = 'Data is replicated across United States data centres, specifically us-east-1.';
    const result = checkDataResidency(doc, 'uk');
    expect(result.detectedRegion).toBe('us');
    expect(result.compliant).toBe(false);
  });

  it('returns null detectedRegion when no region is mentioned', () => {
    const doc = 'We store your data with AES-256 encryption and regular backups.';
    const result = checkDataResidency(doc, 'uk');
    expect(result.detectedRegion).toBeNull();
    expect(result.compliant).toBe(false);
  });

  it('accepts an AWS region code as requiredRegion (eu-west-2 maps to uk)', () => {
    const doc = 'Infrastructure is deployed to eu-west-2 (London).';
    const result = checkDataResidency(doc, 'eu-west-2');
    expect(result.detectedRegion).toBe('uk');
    expect(result.compliant).toBe(true);
  });

  it('is case-insensitive for requiredRegion', () => {
    const doc = 'Data sovereignty: Great Britain only.';
    const result = checkDataResidency(doc, 'UK');
    expect(result.compliant).toBe(true);
  });

  it('handles EU region correctly', () => {
    const doc = 'Personal data remains within the European Union at all times.';
    const result = checkDataResidency(doc, 'eu');
    expect(result.detectedRegion).toBe('eu');
    expect(result.compliant).toBe(true);
  });
});
