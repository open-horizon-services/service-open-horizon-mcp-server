/**
 * Custom test script for the API query tool
 * 
 * This script tests the API query tool with a specific query.
 */

// Import the test functions from test-api-query-tool.js
const { simulateApiQueryTool } = require('./test-api-query-tool');

// Mock the fetch function if not already mocked
if (!global.fetch) {
  global.fetch = async (url) => {
    console.log(`[MOCK] Fetching from URL: ${url}`);
    
    if (url === 'https://open-horizon.github.io/docs/exchange-api/docs/openapi-3-user.json') {
      // Return a simplified mock OpenAPI spec
      return {
        ok: true,
        json: async () => ({
          openapi: '3.0.0',
          info: {
            title: 'Open Horizon Exchange API',
            version: '1.0.0',
            description: 'API for the Open Horizon Exchange'
          },
          paths: {
            '/orgs/{org}/services': {
              get: {
                summary: 'List services',
                description: 'Returns all services in the specified organization.',
                operationId: 'listServices',
                tags: ['services'],
                parameters: [
                  {
                    name: 'org',
                    in: 'path',
                    required: true,
                    schema: { type: 'string' },
                    description: 'Organization ID'
                  }
                ],
                responses: {
                  '200': {
                    description: 'Success',
                    content: {
                      'application/json': {
                        schema: {
                          type: 'object'
                        }
                      }
                    }
                  }
                }
              }
            },
            '/orgs/{org}/services/{service}': {
              get: {
                summary: 'Get service',
                description: 'Returns a specific service in the specified organization.',
                operationId: 'getService',
                tags: ['services'],
                parameters: [
                  {
                    name: 'org',
                    in: 'path',
                    required: true,
                    schema: { type: 'string' },
                    description: 'Organization ID'
                  },
                  {
                    name: 'service',
                    in: 'path',
                    required: true,
                    schema: { type: 'string' },
                    description: 'Service ID'
                  }
                ],
                responses: {
                  '200': {
                    description: 'Success',
                    content: {
                      'application/json': {
                        schema: {
                          type: 'object'
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        })
      };
    }
    
    return {
      ok: false,
      status: 404,
      statusText: 'Not Found'
    };
  };
}

// Define the custom query function
async function runCustomQuery(query) {
  console.log(`=== Testing query: "${query}" ===`);
  
  // Use the simulateApiQueryTool function directly
  try {
    // If simulateApiQueryTool is not available, define it here
    if (typeof simulateApiQueryTool !== 'function') {
      // Extract search terms from the query
      const searchTerms = query.toLowerCase()
        .replace(/[^\w\s]/g, ' ')  // Replace punctuation with spaces
        .split(/\s+/)              // Split by whitespace
        .filter(term => term.length > 2);  // Filter out short terms
      
      console.log('Search terms:', searchTerms);
      
      // Fetch the OpenAPI specification
      const spec = await fetchOpenApiSpec();
      
      // Find matching endpoints
      const matchingEndpoints = findMatchingEndpoints(spec, searchTerms, query);
      
      if (matchingEndpoints.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: `I couldn't find any API endpoints matching your query: "${query}"\n\nTry rephrasing your question or using more specific terms related to services, nodes, policies, or patterns.`
            }
          ]
        };
      }
      
      // Format the results
      let responseText = `# API Information for: "${query}"\n\n`;
      responseText += `I found ${matchingEndpoints.length} API endpoints that match your query. Here are the most relevant ones:\n\n`;
      
      for (const endpoint of matchingEndpoints.slice(0, 3)) {
        responseText += formatEndpointAsMarkdown(endpoint);
        responseText += generateUsageExample(endpoint);
        responseText += '---\n\n';
      }
      
      if (matchingEndpoints.length > 3) {
        responseText += `*Note: ${matchingEndpoints.length - 3} additional endpoints were found but not shown. Please refine your query for more specific results.*\n`;
      }
      
      return {
        content: [
          {
            type: 'text',
            text: responseText
          }
        ]
      };
    } else {
      const result = await simulateApiQueryTool({ query });
      console.log('Result:', JSON.stringify(result, null, 2));
      return result;
    }
  } catch (error) {
    console.error(`Error running custom query: ${error}`);
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error.message || error}`
        }
      ]
    };
  }
}

// Get the query from command line arguments or use a default
const query = process.argv[2] || "How do I query a service or get service details?";

// Special test for response examples
if (query === "test-response-examples") {
  console.log("=== Testing response examples ===");
  
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
    },
    relevanceScore: 200
  };
  
  // Format the endpoint as markdown
  const markdown = formatEndpointAsMarkdown(mockEndpoint);
  console.log(markdown);
  
  // Generate a usage example
  const usageExample = generateUsageExample(mockEndpoint);
  console.log(usageExample);
  
  process.exit(0);
}

// If testing node queries specifically
if (query.toLowerCase().includes('node') && query.toLowerCase().includes('query')) {
  // Add the GET /orgs/{org}/nodes/{node_id} endpoint to the mock spec
  global.fetch = async (url) => {
    console.log(`[MOCK] Fetching from URL: ${url}`);
    
    if (url === 'https://open-horizon.github.io/docs/exchange-api/docs/openapi-3-user.json') {
      // Return a simplified mock OpenAPI spec with the node endpoint
      return {
        ok: true,
        json: async () => ({
          openapi: '3.0.0',
          info: {
            title: 'Open Horizon Exchange API',
            version: '1.0.0',
            description: 'API for the Open Horizon Exchange'
          },
          paths: {
            '/orgs/{org}/nodes/{node_id}': {
              get: {
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
                // Add a high relevance score to trigger the direct answer format
                relevanceScore: 200,
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
              }
            },
            '/orgs/{org}/nodes': {
              get: {
                summary: 'List nodes',
                description: 'Returns all nodes in the specified organization.',
                operationId: 'listNodes',
                tags: ['nodes'],
                parameters: [
                  {
                    name: 'org',
                    in: 'path',
                    required: true,
                    schema: { type: 'string' },
                    description: 'Organization ID'
                  }
                ],
                responses: {
                  '200': {
                    description: 'Success'
                  }
                }
              }
            }
          }
        })
      };
    }
    
    return {
      ok: false,
      status: 404,
      statusText: 'Not Found'
    };
  };
}

// Run the custom query
runCustomQuery(query).catch(console.error);

// Made with Bob
