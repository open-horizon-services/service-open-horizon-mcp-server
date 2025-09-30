/**
 * Test script for response examples in the API query tool
 */

// Import the functions directly
// Note: We need to use the compiled JavaScript file, not the TypeScript file
const { formatEndpointAsMarkdown, generateUsageExample } = require('../dist/tools/api-query-tool');

// Create a mock endpoint with response examples
const mockEndpoint = {
  path: '/orgs/{org}/nodes/{node_id}',
  method: 'GET',
  summary: 'Get node',
  description: 'Returns a specific node in the specified organization.',
  operationId: 'getNode',
  tags: ['nodes'],
  parameters: [
    {
      name: 'org',
      in: 'path',
      required: true,
      schema: { type: 'string' },
      description: 'Organization ID'
    },
    {
      name: 'node_id',
      in: 'path',
      required: true,
      schema: { type: 'string' },
      description: 'Node ID'
    }
  ],
  responses: {
    '200': {
      description: 'Success',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              owner: { type: 'string' },
              lastHeartbeat: { type: 'string' },
              publicKey: { type: 'string' }
            }
          },
          example: {
            "id": "node1",
            "name": "My Edge Node",
            "owner": "user@example.com",
            "lastHeartbeat": "2023-09-30T12:00:00Z",
            "publicKey": "-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...\n-----END PUBLIC KEY-----"
          }
        }
      }
    }
  }
};

// Test the formatEndpointAsMarkdown function
console.log('=== Testing formatEndpointAsMarkdown with response examples ===');
console.log(formatEndpointAsMarkdown(mockEndpoint));

// Test the generateUsageExample function
console.log('\n=== Testing generateUsageExample with response examples ===');
console.log(generateUsageExample(mockEndpoint));

// Made with Bob
