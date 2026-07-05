import type { APIGatewayProxyEventV2, APIGatewayProxyHandlerV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import Anthropic from '@anthropic-ai/sdk';
import { randomUUID } from 'node:crypto';
import type { PolicyProfile, EvaluationReport } from '@procura/shared';

const s3 = new S3Client({});
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

// Lazy so a missing ANTHROPIC_API_KEY only breaks /evaluations, not every route.
let anthropicClient: Anthropic | undefined;
function getAnthropic(): Anthropic {
  anthropicClient ??= new Anthropic();
  return anthropicClient;
}

const SYSTEM_PROMPT = `You are Procura's AI governance evaluator. You assess AI vendor tools against an organisation's policy profile on behalf of UK public sector procurement teams. Your reader is a senior procurement officer: write directly and professionally, lead with the finding, and avoid marketing language, filler, and unnecessary hedging.

## Step 1 — Run the deterministic policy checks first

You have MCP tools that perform deterministic checks against the vendor documentation:
- check_data_residency: detects whether the documentation indicates data is hosted in a required region
- check_security_certification: detects whether the documentation mentions required security certifications

Before writing any analysis, call every tool that corresponds to a requirement in the policy profile, in the order the requirements appear in the profile:
1. If the profile specifies a required data residency region, call check_data_residency with the full, unmodified documentation text and the required region.
2. If the profile lists required security certifications, call check_security_certification with the full, unmodified documentation text and the required certification list.

Do not skip a tool whose requirement is present in the profile. Do not call a tool whose requirement is absent. Do not attempt to perform these checks yourself by reading the documentation — the tools are the source of truth for pass/fail.

## Step 2 — Map tool results to policy checks

Produce one policyChecks entry per check you actually ran:
- Tool reports compliant=true → status "pass"
- Tool reports compliant=false → status "fail"
- Tool result is ambiguous or contradicted by the documentation (e.g. a certification is mentioned only as "in progress", or hosting region statements conflict) → status "needs-review", and say why in the detail

Never include a check you did not run. Never change a tool's verdict because the documentation "sounds" compliant.

## Step 3 — Analyse within the fixed rubric

Write exactly three analysis sections. Do not add, merge, or rename dimensions.

- fitAnalysis — how well the tool matches the organisation's needs as expressed in the policy profile: intended use, requirements met or unmet, material capability gaps.
- riskAnalysis — cover three risk classes: data (residency, handling, exposure), vendor (maturity, dependence, lock-in relative to the profile's stated tolerance), and compliance (certification gaps, regulatory exposure for a UK public sector body).
- valueAnalysis — whether the cost is justified against the profile's cost banding, and whether the organisation should weigh alternatives before committing.

## Evidence rules — these override everything else

- Never assert that a vendor holds a certification, accreditation, or hosts data in a region unless the tool results support it. Absence of evidence is not evidence of compliance.
- Quote or closely paraphrase the documentation when a claim rests on it; do not embellish or extrapolate beyond what the text says.
- If the documentation is silent on something material to the analysis, state that it is silent — do not fill the gap with plausible assumptions.
- Base fit/risk/value reasoning only on the policy profile, the tool results, and the documentation text provided. Bring in no outside knowledge of the vendor.

## Output format

Respond with ONLY a valid JSON object — no markdown fences, no text before or after it:
{
  "vendorName": "<vendor name as provided by the requester; otherwise extracted from the documentation; otherwise 'Unknown'>",
  "policyChecks": [
    {
      "checkId": "<short-kebab-id, e.g. 'data-residency' or 'cert-soc2'>",
      "checkName": "<human-readable name, e.g. 'Data Residency (UK)'>",
      "status": "<pass|fail|needs-review>",
      "detail": "<one or two sentences: the tool's verdict and the supporting evidence>"
    }
  ],
  "fitAnalysis": "<2-4 sentences>",
  "riskAnalysis": "<2-4 sentences covering data, vendor, and compliance risk>",
  "valueAnalysis": "<2-4 sentences on cost justification and alternatives>"
}`;

const BANDINGS = ['low', 'medium', 'high'] as const;

function json(statusCode: number, body: unknown): APIGatewayProxyResultV2 {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

function parseBody(event: APIGatewayProxyEventV2): Record<string, unknown> | null {
  if (!event.body) return null;
  try {
    const parsed: unknown = JSON.parse(event.body);
    return typeof parsed === 'object' && parsed !== null
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

// ── POST /profiles ─────────────────────────────────────────────────────────────

async function createProfile(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  const body = parseBody(event);
  if (!body) return json(400, { message: 'A JSON request body is required' });

  const { name, dataResidencyRegion, requiredCertifications, costBanding, vendorLockInTolerance } =
    body as Partial<Omit<PolicyProfile, 'id' | 'createdAt'>>;

  if (typeof name !== 'string' || !name.trim()) {
    return json(400, { message: 'name is required' });
  }
  if (typeof dataResidencyRegion !== 'string' || !dataResidencyRegion.trim()) {
    return json(400, { message: 'dataResidencyRegion is required' });
  }
  if (
    !Array.isArray(requiredCertifications) ||
    requiredCertifications.some((c) => typeof c !== 'string')
  ) {
    return json(400, { message: 'requiredCertifications must be an array of strings' });
  }
  if (!BANDINGS.includes(costBanding as (typeof BANDINGS)[number])) {
    return json(400, { message: `costBanding must be one of: ${BANDINGS.join(', ')}` });
  }
  if (!BANDINGS.includes(vendorLockInTolerance as (typeof BANDINGS)[number])) {
    return json(400, { message: `vendorLockInTolerance must be one of: ${BANDINGS.join(', ')}` });
  }

  const profile: PolicyProfile = {
    id: randomUUID(),
    name: name.trim(),
    dataResidencyRegion,
    requiredCertifications,
    costBanding: costBanding as PolicyProfile['costBanding'],
    vendorLockInTolerance: vendorLockInTolerance as PolicyProfile['vendorLockInTolerance'],
    createdAt: new Date().toISOString(),
  };

  await ddb.send(
    new PutCommand({
      TableName: process.env.POLICY_PROFILES_TABLE!,
      Item: { profileId: profile.id, ...profile },
    }),
  );

  return json(201, profile);
}

// ── GET /profiles ──────────────────────────────────────────────────────────────

async function listProfiles(): Promise<APIGatewayProxyResultV2> {
  const result = await ddb.send(
    new ScanCommand({ TableName: process.env.POLICY_PROFILES_TABLE! }),
  );

  const profiles = (result.Items ?? []).map((item) => {
    const { id, name, dataResidencyRegion, requiredCertifications, costBanding, vendorLockInTolerance, createdAt } =
      item as PolicyProfile;
    return { id, name, dataResidencyRegion, requiredCertifications, costBanding, vendorLockInTolerance, createdAt };
  });

  return json(200, profiles);
}

// ── POST /evaluations ──────────────────────────────────────────────────────────

async function createEvaluation(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  const body = parseBody(event);
  if (!body) return json(400, { message: 'A JSON request body is required' });

  const policyProfileId = body.policyProfileId as string | undefined;
  const vendorName = body.vendorName as string | undefined;
  const vendorDocumentation = body.vendorDocumentation as string | undefined;
  const s3Key = body.s3Key as string | undefined;

  if (!policyProfileId) {
    return json(400, { message: 'policyProfileId is required' });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return json(503, {
      message:
        'Evaluation service is not configured: ANTHROPIC_API_KEY is not set on the backend',
    });
  }
  if (!vendorDocumentation && !s3Key) {
    return json(400, { message: 'Either vendorDocumentation or s3Key is required' });
  }

  const profileResult = await ddb.send(
    new GetCommand({
      TableName: process.env.POLICY_PROFILES_TABLE!,
      Key: { profileId: policyProfileId },
    }),
  );

  if (!profileResult.Item) {
    return json(404, { message: `Policy profile '${policyProfileId}' not found` });
  }

  const profile = profileResult.Item as PolicyProfile;

  let documentText: string;
  if (vendorDocumentation) {
    documentText = vendorDocumentation;
  } else {
    const s3Result = await s3.send(
      new GetObjectCommand({
        Bucket: process.env.VENDOR_DOCS_BUCKET!,
        Key: s3Key!,
      }),
    );
    documentText = await s3Result.Body!.transformToString('utf-8');
  }

  const userMessage = `Policy Profile:
- Organisation: ${profile.name}
- Required data residency region: ${profile.dataResidencyRegion}
- Required certifications: ${profile.requiredCertifications.join(', ') || 'none specified'}
- Cost banding: ${profile.costBanding}
- Vendor lock-in tolerance: ${profile.vendorLockInTolerance}
${vendorName ? `\nVendor name (as provided by the requester): ${vendorName}\n` : ''}
Vendor Documentation:
---
${documentText}
---

Run the relevant policy-check tools and return the evaluation report as JSON.`;

  // MCP connector beta: mcp_servers + mcp_toolset are not yet in the SDK's
  // TypeScript types but are accepted at runtime via the beta header.
  const createParams = {
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    betas: ['mcp-client-2025-11-20'],
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
    mcp_servers: [{ type: 'url', url: process.env.MCP_SERVER_URL!, name: 'procura-policy-checks' }],
    tools: [{ type: 'mcp_toolset', mcp_server_name: 'procura-policy-checks' }],
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const claudeResponse = await getAnthropic().beta.messages.create(createParams as any);

  const textBlock = claudeResponse.content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')
    .pop();

  if (!textBlock) {
    return json(502, { message: 'No text response received from Claude' });
  }

  let reportData: {
    vendorName: string;
    policyChecks: EvaluationReport['policyChecks'];
    fitAnalysis: string;
    riskAnalysis: string;
    valueAnalysis: string;
  };

  try {
    const cleaned = textBlock.text
      .replace(/^```(?:json)?\n?/m, '')
      .replace(/\n?```$/m, '')
      .trim();
    reportData = JSON.parse(cleaned);
  } catch {
    return json(502, { message: 'Claude returned an unparseable response', raw: textBlock.text });
  }

  const report: EvaluationReport = {
    id: randomUUID(),
    requestId: randomUUID(),
    vendorName: vendorName?.trim() || reportData.vendorName,
    policyChecks: reportData.policyChecks,
    fitAnalysis: reportData.fitAnalysis,
    riskAnalysis: reportData.riskAnalysis,
    valueAnalysis: reportData.valueAnalysis,
    createdAt: new Date().toISOString(),
  };

  await ddb.send(
    new PutCommand({
      TableName: process.env.EVALUATIONS_TABLE!,
      Item: {
        evaluationId: report.id,
        profileId: policyProfileId,
        ...report,
      },
    }),
  );

  return json(200, report);
}

// ── Router ─────────────────────────────────────────────────────────────────────

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const method = event.requestContext.http.method;
  const path = event.rawPath;

  try {
    // The $default route catches OPTIONS before API Gateway's CORS auto-responder
    // can reply, so answer preflights here; the gateway appends the CORS headers.
    if (method === 'OPTIONS') return { statusCode: 204 };
    if (method === 'POST' && path === '/profiles') return await createProfile(event);
    if (method === 'GET' && path === '/profiles') return await listProfiles();
    if (method === 'POST' && (path === '/evaluations' || path === '/evaluate')) {
      return await createEvaluation(event);
    }
    return json(404, { message: `No route for ${method} ${path}` });
  } catch (err) {
    console.error('Unhandled error', err);
    return json(500, { message: 'Internal server error' });
  }
};
