import type { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import Anthropic from '@anthropic-ai/sdk';
import { randomUUID } from 'node:crypto';
import type { OrchestratorRequest, PolicyProfile, EvaluationReport } from '@procura/shared';

const s3 = new S3Client({});
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const anthropic = new Anthropic();

const SYSTEM_PROMPT = `You are an AI governance evaluator for UK public sector organisations. Your role is to assess AI vendors against policy requirements using deterministic policy checks combined with reasoned analysis.

You have access to MCP tools for policy checks:
- check_data_residency: verifies whether vendor documentation indicates data is hosted in a required region
- check_security_certification: verifies whether vendor documentation mentions required security certifications

Your process:
1. Review the policy profile requirements provided by the user
2. Call check_data_residency with the full vendor documentation text and the required region (if a data residency region is specified)
3. Call check_security_certification with the full vendor documentation text and the required certifications (if certifications are required)
4. Synthesise the tool results and documentation into a structured evaluation report

Rules:
- Map tool results to policyChecks entries: compliant=true → "pass", compliant=false → "fail"
- If a check cannot be determined from the documentation, use status "needs-review"
- Do not fabricate check results; only include checks you actually ran

You MUST respond with ONLY a valid JSON object — no markdown fences, no explanation, just the JSON:
{
  "vendorName": "<vendor name extracted from the documentation, or 'Unknown' if unclear>",
  "policyChecks": [
    {
      "checkId": "<short-kebab-id>",
      "checkName": "<human-readable name>",
      "status": "<pass|fail|needs-review>",
      "detail": "<brief explanation>"
    }
  ],
  "fitAnalysis": "<2-3 sentences on overall fit for the organisation's needs>",
  "riskAnalysis": "<2-3 sentences on key risks or concerns>",
  "valueAnalysis": "<2-3 sentences on value for money given the cost banding and lock-in tolerance>"
}`;

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  if (!event.body) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Request body is required' }),
    };
  }

  let request: OrchestratorRequest;
  try {
    request = JSON.parse(event.body) as OrchestratorRequest;
  } catch {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Invalid JSON body' }),
    };
  }

  const { s3Key, policyProfileId } = request;

  if (!s3Key || !policyProfileId) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 's3Key and policyProfileId are required' }),
    };
  }

  const profileResult = await ddb.send(
    new GetCommand({
      TableName: process.env.POLICY_PROFILES_TABLE!,
      Key: { profileId: policyProfileId },
    }),
  );

  if (!profileResult.Item) {
    return {
      statusCode: 404,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: `Policy profile '${policyProfileId}' not found` }),
    };
  }

  const profile = profileResult.Item as PolicyProfile;

  const s3Result = await s3.send(
    new GetObjectCommand({
      Bucket: process.env.VENDOR_DOCS_BUCKET!,
      Key: s3Key,
    }),
  );

  const documentText = await s3Result.Body!.transformToString('utf-8');

  const userMessage = `Policy Profile:
- Organisation: ${profile.name}
- Required data residency region: ${profile.dataResidencyRegion}
- Required certifications: ${profile.requiredCertifications.join(', ') || 'none specified'}
- Cost banding: ${profile.costBanding}
- Vendor lock-in tolerance: ${profile.vendorLockInTolerance}

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
  const claudeResponse = await anthropic.beta.messages.create(createParams as any);

  const textBlock = claudeResponse.content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')
    .pop();

  if (!textBlock) {
    return {
      statusCode: 502,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'No text response received from Claude' }),
    };
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
    return {
      statusCode: 502,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Claude returned an unparseable response', raw: textBlock.text }),
    };
  }

  const report: EvaluationReport = {
    id: randomUUID(),
    requestId: randomUUID(),
    vendorName: reportData.vendorName,
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

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(report),
  };
};
