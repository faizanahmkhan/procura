import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import type { APIGatewayProxyHandlerV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { createMcpServer } from './server.js';

/** Convert an API Gateway HTTP API v2 event into a Fetch-API Request. */
function toFetchRequest(event: Parameters<APIGatewayProxyHandlerV2>[0]): Request {
  const host = event.headers['host'] ?? 'localhost';
  const qs = event.rawQueryString ? `?${event.rawQueryString}` : '';
  const url = `https://${host}${event.rawPath}${qs}`;

  let body: string | undefined;
  if (event.body) {
    body = event.isBase64Encoded
      ? Buffer.from(event.body, 'base64').toString('utf-8')
      : event.body;
  }

  const method = event.requestContext.http.method;

  return new Request(url, {
    method,
    headers: event.headers as Record<string, string>,
    body: ['POST', 'PUT', 'PATCH'].includes(method) ? body : undefined,
  });
}

/** Convert a Fetch-API Response into an API Gateway HTTP API v2 result. */
async function toApiGatewayResult(response: Response): Promise<APIGatewayProxyResultV2> {
  const body = await response.text();
  const headers: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    headers[key] = value;
  });
  return { statusCode: response.status, headers, body };
}

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  // Fresh server + transport per invocation — stateless Lambda pattern.
  const server = createMcpServer();
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // stateless mode
  });
  await server.connect(transport);

  const response = await transport.handleRequest(toFetchRequest(event));
  return toApiGatewayResult(response);
};
