import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { checkDataResidency } from './tools/checkDataResidency.js';
import { checkSecurityCertification } from './tools/checkSecurityCertification.js';

export function createMcpServer(): Server {
  const server = new Server(
    { name: 'procura-mcp-server', version: '1.0.0' },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: 'check_data_residency',
        description:
          'Checks whether vendor documentation indicates that data is hosted in a required region. Returns the detected region and whether it matches.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            documentText: {
              type: 'string',
              description: 'The vendor documentation text to analyse',
            },
            requiredRegion: {
              type: 'string',
              description:
                'Required data residency region — accepts common names ("uk", "eu", "us") or AWS region codes ("eu-west-2")',
            },
          },
          required: ['documentText', 'requiredRegion'],
        },
      },
      {
        name: 'check_security_certification',
        description:
          'Checks whether vendor documentation mentions specific security certifications. Returns which were found and which are missing.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            documentText: {
              type: 'string',
              description: 'The vendor documentation text to analyse',
            },
            requiredCerts: {
              type: 'array',
              items: { type: 'string' },
              description:
                'Certifications to check for, e.g. ["SOC 2", "ISO 27001", "Cyber Essentials"]',
            },
          },
          required: ['documentText', 'requiredCerts'],
        },
      },
    ],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args = {} } = request.params;

    if (name === 'check_data_residency') {
      const { documentText, requiredRegion } = args as {
        documentText: string;
        requiredRegion: string;
      };
      const result = checkDataResidency(documentText, requiredRegion);
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result) }],
      };
    }

    if (name === 'check_security_certification') {
      const { documentText, requiredCerts } = args as {
        documentText: string;
        requiredCerts: string[];
      };
      const result = checkSecurityCertification(documentText, requiredCerts);
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result) }],
      };
    }

    return {
      content: [
        { type: 'text' as const, text: `Unknown tool: ${name}` },
      ],
      isError: true,
    };
  });

  return server;
}
