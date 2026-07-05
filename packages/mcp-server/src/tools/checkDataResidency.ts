import type { DataResidencyCheckResult } from '@procura/shared';

type RegionEntry = { id: string; keywords: string[] };

// Ordered list — more specific entries first so detection prefers them.
const REGIONS: RegionEntry[] = [
  {
    id: 'uk',
    keywords: [
      'United Kingdom',
      'Great Britain',
      'England',
      'Scotland',
      'Wales',
      'Britain',
      'eu-west-2',
      'UK',
    ],
  },
  {
    id: 'eu',
    keywords: ['European Union', 'EEA', 'Europe', 'EU'],
  },
  {
    id: 'us',
    keywords: [
      'United States of America',
      'United States',
      'USA',
      'us-east-1',
      'us-east-2',
      'us-west-1',
      'us-west-2',
      'US',
    ],
  },
  {
    id: 'au',
    keywords: ['Australia', 'ap-southeast-2'],
  },
  {
    id: 'ap-southeast-1',
    keywords: ['Singapore', 'ap-southeast-1'],
  },
];

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Match a keyword without requiring a \b on both sides — handles hyphenated AWS codes. */
function buildPattern(keyword: string): RegExp {
  const escaped = escapeRegex(keyword);
  return new RegExp(`(?<![\\w-])${escaped}(?![\\w-])`, 'i');
}

function findMatchingRegion(text: string): RegionEntry | null {
  for (const region of REGIONS) {
    if (region.keywords.some((kw) => buildPattern(kw).test(text))) {
      return region;
    }
  }
  return null;
}

/** Resolve a free-form requiredRegion string to a RegionEntry (or null). */
function resolveRequiredRegion(requiredRegion: string): RegionEntry | null {
  const norm = requiredRegion.toLowerCase().trim();
  // Direct ID match (e.g. "uk", "eu", "us")
  const byId = REGIONS.find((r) => r.id === norm);
  if (byId) return byId;
  // Keyword match (e.g. "United Kingdom", "eu-west-2")
  return (
    REGIONS.find((r) => r.keywords.some((k) => k.toLowerCase() === norm)) ?? null
  );
}

/**
 * Checks whether documentText indicates data is hosted in requiredRegion.
 * Uses keyword/pattern matching — accuracy improvements come in a later version.
 */
export function checkDataResidency(
  documentText: string,
  requiredRegion: string,
): DataResidencyCheckResult {
  const detectedEntry = findMatchingRegion(documentText);
  const detectedRegion = detectedEntry?.id ?? null;

  const requiredEntry = resolveRequiredRegion(requiredRegion);

  let compliant: boolean;
  if (requiredEntry) {
    // Check if any of the required region's keywords appear in the text.
    compliant = requiredEntry.keywords.some((kw) => buildPattern(kw).test(documentText));
  } else {
    // Unknown region — fall back to a literal substring check.
    compliant = buildPattern(requiredRegion).test(documentText);
  }

  return { detectedRegion, compliant };
}
