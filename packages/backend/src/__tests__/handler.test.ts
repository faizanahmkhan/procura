import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { APIGatewayProxyEventV2, Context } from 'aws-lambda';

// Hoisted so they're available inside vi.mock factory functions
const mocks = vi.hoisted(() => ({
  s3Send: vi.fn(),
  ddbSend: vi.fn(),
  anthropicCreate: vi.fn(),
}));

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn(() => ({ send: mocks.s3Send })),
  GetObjectCommand: vi.fn((params: unknown) => params),
}));

vi.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: vi.fn(() => ({})),
}));

vi.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: {
    from: vi.fn(() => ({ send: mocks.ddbSend })),
  },
  GetCommand: vi.fn((params: unknown) => params),
  PutCommand: vi.fn((params: unknown) => params),
  ScanCommand: vi.fn((params: unknown) => params),
}));

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn(() => ({
    beta: {
      messages: {
        create: mocks.anthropicCreate,
      },
    },
  })),
}));

import { handler } from '../index.js';

const mockProfile = {
  profileId: 'profile-abc',
  id: 'profile-abc',
  name: 'UK Gov Test Profile',
  dataResidencyRegion: 'uk',
  requiredCertifications: ['SOC 2', 'Cyber Essentials'],
  costBanding: 'medium',
  vendorLockInTolerance: 'low',
  createdAt: '2024-01-01T00:00:00Z',
};

const mockClaudeReport = {
  vendorName: 'Acme AI Solutions',
  policyChecks: [
    { checkId: 'data-residency', checkName: 'Data Residency (UK)', status: 'pass', detail: 'Data hosted in eu-west-2 (UK)' },
    { checkId: 'cert-soc2', checkName: 'SOC 2', status: 'pass', detail: 'SOC 2 certification confirmed in documentation' },
    { checkId: 'cert-cyber-essentials', checkName: 'Cyber Essentials', status: 'pass', detail: 'Cyber Essentials confirmed' },
  ],
  fitAnalysis: 'Strong fit for UK public sector with confirmed UK data residency and all required certifications.',
  riskAnalysis: 'Low risk profile; all required certifications are present and data remains in the UK.',
  valueAnalysis: 'Good value at medium cost banding given the compliance posture and low vendor lock-in risk.',
};

function makeEvent(body: unknown, method = 'POST', path = '/evaluations'): APIGatewayProxyEventV2 {
  const routeKey = `${method} ${path}`;
  return {
    version: '2.0',
    routeKey,
    rawPath: path,
    rawQueryString: '',
    headers: { 'content-type': 'application/json' },
    requestContext: {
      accountId: '123456789012',
      apiId: 'test-api-id',
      domainName: 'test.execute-api.eu-west-2.amazonaws.com',
      domainPrefix: 'test',
      http: {
        method,
        path,
        protocol: 'HTTP/1.1',
        sourceIp: '127.0.0.1',
        userAgent: 'vitest',
      },
      requestId: 'test-request-id',
      routeKey,
      stage: '$default',
      time: '01/Jan/2024:00:00:00 +0000',
      timeEpoch: 1704067200000,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    isBase64Encoded: false,
  } as APIGatewayProxyEventV2;
}

const mockContext = {} as Context;

beforeEach(() => {
  process.env.VENDOR_DOCS_BUCKET = 'test-vendor-docs';
  process.env.POLICY_PROFILES_TABLE = 'PolicyProfiles';
  process.env.EVALUATIONS_TABLE = 'Evaluations';
  process.env.MCP_SERVER_URL = 'https://test-mcp.execute-api.eu-west-2.amazonaws.com';
  process.env.ANTHROPIC_API_KEY = 'test-api-key';

  mocks.s3Send.mockReset();
  mocks.ddbSend.mockReset();
  mocks.anthropicCreate.mockReset();
});

describe('handler', () => {
  it('returns 400 when body is missing', async () => {
    const event = { ...makeEvent(null), body: undefined } as APIGatewayProxyEventV2;
    const result = await handler(event, mockContext, vi.fn());
    expect(result).toMatchObject({ statusCode: 400 });
  });

  it('returns 400 when s3Key or policyProfileId is missing', async () => {
    const result = await handler(makeEvent({ s3Key: 'docs/file.txt' }), mockContext, vi.fn());
    expect(result).toMatchObject({ statusCode: 400 });
  });

  it('returns 404 when policy profile is not found', async () => {
    mocks.ddbSend.mockResolvedValue({ Item: undefined });
    const result = await handler(
      makeEvent({ s3Key: 'docs/file.txt', policyProfileId: 'unknown' }),
      mockContext,
      vi.fn(),
    );
    expect(result).toMatchObject({ statusCode: 404 });
  });

  it('fetches profile and document, calls Claude, stores and returns the report', async () => {
    mocks.ddbSend
      .mockResolvedValueOnce({ Item: mockProfile })  // GetCommand — fetch profile
      .mockResolvedValueOnce({});                     // PutCommand — store evaluation

    mocks.s3Send.mockResolvedValue({
      Body: {
        transformToString: vi.fn().mockResolvedValue(
          'Acme AI Solutions stores all data in eu-west-2 (United Kingdom). ' +
          'We hold SOC 2 and Cyber Essentials certifications.',
        ),
      },
    });

    mocks.anthropicCreate.mockResolvedValue({
      id: 'msg_test123',
      type: 'message',
      role: 'assistant',
      model: 'claude-sonnet-4-6',
      content: [{ type: 'text', text: JSON.stringify(mockClaudeReport) }],
      stop_reason: 'end_turn',
      usage: { input_tokens: 200, output_tokens: 300 },
    });

    const result = await handler(
      makeEvent({ s3Key: 'docs/acme.txt', policyProfileId: 'profile-abc' }),
      mockContext,
      vi.fn(),
    );

    expect(result).toMatchObject({ statusCode: 200 });

    const body = JSON.parse((result as { body: string }).body) as Record<string, unknown>;
    expect(body.vendorName).toBe('Acme AI Solutions');
    expect(body.policyChecks).toHaveLength(3);
    expect(body.fitAnalysis).toBeTruthy();
    expect(body.riskAnalysis).toBeTruthy();
    expect(body.valueAnalysis).toBeTruthy();
    expect(typeof body.id).toBe('string');
    expect(typeof body.createdAt).toBe('string');

    // GetCommand called with correct table + key
    expect(mocks.ddbSend).toHaveBeenCalledWith(
      expect.objectContaining({
        TableName: 'PolicyProfiles',
        Key: { profileId: 'profile-abc' },
      }),
    );

    // S3 called with correct bucket + key
    expect(mocks.s3Send).toHaveBeenCalledWith(
      expect.objectContaining({
        Bucket: 'test-vendor-docs',
        Key: 'docs/acme.txt',
      }),
    );

    // Claude called with MCP server config pointing at the env-var URL
    expect(mocks.anthropicCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'claude-sonnet-4-6',
        mcp_servers: [
          expect.objectContaining({ url: 'https://test-mcp.execute-api.eu-west-2.amazonaws.com' }),
        ],
      }),
    );

    // Evaluation stored in DynamoDB with correct table + profile link
    expect(mocks.ddbSend).toHaveBeenCalledWith(
      expect.objectContaining({
        TableName: 'Evaluations',
        Item: expect.objectContaining({
          profileId: 'profile-abc',
          vendorName: 'Acme AI Solutions',
        }),
      }),
    );
  });

  it('handles Claude responses wrapped in markdown fences', async () => {
    mocks.ddbSend
      .mockResolvedValueOnce({ Item: mockProfile })
      .mockResolvedValueOnce({});

    mocks.s3Send.mockResolvedValue({
      Body: { transformToString: vi.fn().mockResolvedValue('Some vendor doc.') },
    });

    // Claude wraps JSON in a markdown block (despite instructions)
    const fencedText = '```json\n' + JSON.stringify(mockClaudeReport) + '\n```';
    mocks.anthropicCreate.mockResolvedValue({
      id: 'msg_fenced',
      type: 'message',
      role: 'assistant',
      model: 'claude-sonnet-4-6',
      content: [{ type: 'text', text: fencedText }],
      stop_reason: 'end_turn',
      usage: { input_tokens: 100, output_tokens: 200 },
    });

    const result = await handler(
      makeEvent({ s3Key: 'docs/vendor.txt', policyProfileId: 'profile-abc' }),
      mockContext,
      vi.fn(),
    );

    expect(result).toMatchObject({ statusCode: 200 });
    const body = JSON.parse((result as { body: string }).body) as Record<string, unknown>;
    expect(body.vendorName).toBe('Acme AI Solutions');
  });

  it('accepts inline vendorDocumentation without touching S3 and prefers the client vendor name', async () => {
    mocks.ddbSend
      .mockResolvedValueOnce({ Item: mockProfile })
      .mockResolvedValueOnce({});

    mocks.anthropicCreate.mockResolvedValue({
      id: 'msg_inline',
      type: 'message',
      role: 'assistant',
      model: 'claude-sonnet-4-6',
      content: [{ type: 'text', text: JSON.stringify(mockClaudeReport) }],
      stop_reason: 'end_turn',
      usage: { input_tokens: 200, output_tokens: 300 },
    });

    const result = await handler(
      makeEvent({
        policyProfileId: 'profile-abc',
        vendorName: 'Client-Supplied Name Ltd',
        vendorDocumentation: 'We store data in eu-west-2 and hold SOC 2.',
      }),
      mockContext,
      vi.fn(),
    );

    expect(result).toMatchObject({ statusCode: 200 });
    expect(mocks.s3Send).not.toHaveBeenCalled();

    const body = JSON.parse((result as { body: string }).body) as Record<string, unknown>;
    expect(body.vendorName).toBe('Client-Supplied Name Ltd');
    expect(body.policyChecks).toHaveLength(3);
  });

  it('returns 400 when neither vendorDocumentation nor s3Key is provided', async () => {
    const result = await handler(
      makeEvent({ policyProfileId: 'profile-abc', vendorName: 'Acme' }),
      mockContext,
      vi.fn(),
    );
    expect(result).toMatchObject({ statusCode: 400 });
  });

  it('creates a policy profile via POST /profiles', async () => {
    mocks.ddbSend.mockResolvedValueOnce({});

    const result = await handler(
      makeEvent(
        {
          name: 'Standard procurement policy',
          dataResidencyRegion: 'uk',
          requiredCertifications: ['SOC 2', 'ISO 27001'],
          costBanding: 'medium',
          vendorLockInTolerance: 'low',
        },
        'POST',
        '/profiles',
      ),
      mockContext,
      vi.fn(),
    );

    expect(result).toMatchObject({ statusCode: 201 });
    const body = JSON.parse((result as { body: string }).body) as Record<string, unknown>;
    expect(typeof body.id).toBe('string');
    expect(typeof body.createdAt).toBe('string');
    expect(body.name).toBe('Standard procurement policy');

    expect(mocks.ddbSend).toHaveBeenCalledWith(
      expect.objectContaining({
        TableName: 'PolicyProfiles',
        Item: expect.objectContaining({ profileId: body.id, name: 'Standard procurement policy' }),
      }),
    );
  });

  it('rejects an invalid profile with 400', async () => {
    const result = await handler(
      makeEvent(
        {
          name: 'Bad profile',
          dataResidencyRegion: 'uk',
          requiredCertifications: 'not-an-array',
          costBanding: 'medium',
          vendorLockInTolerance: 'low',
        },
        'POST',
        '/profiles',
      ),
      mockContext,
      vi.fn(),
    );
    expect(result).toMatchObject({ statusCode: 400 });
    expect(mocks.ddbSend).not.toHaveBeenCalled();
  });

  it('lists policy profiles via GET /profiles', async () => {
    mocks.ddbSend.mockResolvedValueOnce({ Items: [mockProfile] });

    const result = await handler(makeEvent(undefined, 'GET', '/profiles'), mockContext, vi.fn());

    expect(result).toMatchObject({ statusCode: 200 });
    const body = JSON.parse((result as { body: string }).body) as Record<string, unknown>[];
    expect(body).toHaveLength(1);
    expect(body[0].id).toBe('profile-abc');
    expect(body[0]).not.toHaveProperty('profileId');
  });

  it('answers CORS preflight OPTIONS with 204', async () => {
    const result = await handler(makeEvent(undefined, 'OPTIONS', '/profiles'), mockContext, vi.fn());
    expect(result).toMatchObject({ statusCode: 204 });
  });

  it('returns 404 for unknown routes', async () => {
    const result = await handler(makeEvent(undefined, 'GET', '/nope'), mockContext, vi.fn());
    expect(result).toMatchObject({ statusCode: 404 });
  });

  it('returns 502 when Claude returns no text block', async () => {
    mocks.ddbSend.mockResolvedValueOnce({ Item: mockProfile });
    mocks.s3Send.mockResolvedValue({
      Body: { transformToString: vi.fn().mockResolvedValue('doc') },
    });
    mocks.anthropicCreate.mockResolvedValue({
      id: 'msg_empty',
      type: 'message',
      role: 'assistant',
      model: 'claude-sonnet-4-6',
      content: [],
      stop_reason: 'end_turn',
      usage: { input_tokens: 50, output_tokens: 0 },
    });

    const result = await handler(
      makeEvent({ s3Key: 'docs/x.txt', policyProfileId: 'profile-abc' }),
      mockContext,
      vi.fn(),
    );

    expect(result).toMatchObject({ statusCode: 502 });
  });
});
