import type { ToolRequest, ToolDBEntry, AIAnalysis } from '../types';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-20250514';

class ClaudeApiError extends Error {
  readonly statusCode: number | undefined;

  constructor(message: string, statusCode?: number) {
    super(message);
    this.name = 'ClaudeApiError';
    this.statusCode = statusCode;
  }
}

function buildSystemPrompt(): string {
  return `You are Procura's AI governance analyst. Your role is to evaluate enterprise AI tool procurement requests and return a structured risk assessment.

You MUST respond with valid JSON only. No prose, no markdown fences, no explanation outside the JSON object.

The JSON must conform exactly to this shape:
{
  "riskLevel": "low" | "medium" | "high",
  "toolType": string,
  "flags": Array<{ "label": string, "type": "info" | "warn" | "danger" }>,
  "duplicates": Array<{ "tool": string, "note": string }>,
  "requiredApprovals": string[],
  "recommendations": string[],
  "reviewerQuestions": string[]
}

Rules:
- riskLevel: "high" if the tool handles PII/customer data with unclear data residency, runs autonomous code, or is from an unvetted vendor. "medium" if moderate data access or restricted status. "low" otherwise.
- flags: surface data privacy issues, IP risks, shadow IT risks, compliance gaps, or vendor lock-in. Use "danger" for blocking issues, "warn" for notable concerns, "info" for advisory notes.
- duplicates: list any tools in the organisation's approved stack that overlap with this request.
- requiredApprovals: list the approval roles needed based on cost, data sensitivity, and risk.
- recommendations: 2–4 concrete, actionable steps the reviewer should take.
- reviewerQuestions: 2–4 specific questions the reviewer should ask the requester before approving.`;
}

function buildUserPrompt(
  req: ToolRequest,
  dbEntry: ToolDBEntry | undefined,
  existingTools: string[],
): string {
  const dbContext = dbEntry
    ? `Database status: ${dbEntry.status} | Risk: ${dbEntry.risk} | Notes: ${dbEntry.notes} | Alternatives: ${dbEntry.alts.join(', ')}`
    : 'This tool is NOT in our approved tool database.';

  return `Evaluate this procurement request:

Tool: ${req.tool}
Vendor: ${req.vendor}
Category: ${req.cat}
Annual Cost: $${req.cost}
Department: ${req.dept}
Data Sensitivity: ${req.dataSens}
Intended Usage: ${req.usage}
Business Justification: ${req.justification}

Organisation Context:
${dbContext}
Currently approved tools in stack: ${existingTools.length > 0 ? existingTools.join(', ') : 'None listed'}

Return the JSON assessment now.`;
}

export async function runAIAnalysis(
  req: ToolRequest,
  dbEntry: ToolDBEntry | undefined,
  existingTools: string[],
): Promise<AIAnalysis> {
  // TODO: Load API key from environment variable VITE_ANTHROPIC_API_KEY
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY as string | undefined;
  if (!apiKey) {
    throw new ClaudeApiError('VITE_ANTHROPIC_API_KEY is not set. Add it to your .env file.');
  }

  const body = {
    model: MODEL,
    max_tokens: 1000,
    system: buildSystemPrompt(),
    messages: [
      {
        role: 'user',
        content: buildUserPrompt(req, dbEntry, existingTools),
      },
    ],
  };

  let response: Response;
  try {
    response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    throw new ClaudeApiError(`Network error calling Anthropic API: ${String(err)}`);
  }

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new ClaudeApiError(`Anthropic API error ${response.status}: ${text}`, response.status);
  }

  const json = (await response.json()) as {
    content: Array<{ type: string; text: string }>;
  };

  const textBlock = json.content.find((b) => b.type === 'text');
  if (!textBlock) {
    throw new ClaudeApiError('No text content returned by Anthropic API.');
  }

  let parsed: AIAnalysis;
  try {
    parsed = JSON.parse(textBlock.text) as AIAnalysis;
  } catch {
    throw new ClaudeApiError(`Failed to parse AI response as JSON: ${textBlock.text}`);
  }

  return parsed;
}
