/**
 * Test script for the API query tool
 * 
 * This script tests the API query tool's ability to fetch and parse the OpenAPI specification
 * and answer questions about the API endpoints.
 */

// Mock the necessary objects and functions
const mockContext = {
  requestInfo: {
    headers: {}
  }
};

// Mock the fetch function
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
            },
            post: {
              summary: 'Create service',
              description: 'Creates a new service in the specified organization.',
              operationId: 'createService',
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
              requestBody: {
                description: 'Service definition',
                required: true,
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        label: { type: 'string' },
                        description: { type: 'string' },
                        public: { type: 'boolean' },
                        url: { type: 'string' },
                        version: { type: 'string' },
                        arch: { type: 'string' },
                        sharable: { type: 'string' },
                        deployment: { type: 'string' },
                        deploymentSignature: { type: 'string' }
                      },
                      required: ['label', 'url', 'version', 'arch', 'deployment']
                    }
                  }
                }
              },
              responses: {
                '201': {
                  description: 'Created'
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
          },
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
          '/orgs/{org}/nodes/{node_id}': {
            delete: {
              summary: 'Delete node',
              description: 'Deletes a node from the specified organization.',
              operationId: 'deleteNode',
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
                '204': {
                  description: 'Deleted'
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

// Mock the getErrorMessage function
const getErrorMessage = (error) => {
  return {
    content: [
      {
        type: 'text',
        text: `Error: ${error}`
      }
    ]
  };
};

// Import the functions from api-query-tool.ts (simulated here)
async function fetchOpenApiSpec() {
  try {
    console.log(`Fetching OpenAPI specification from https://open-horizon.github.io/docs/exchange-api/docs/openapi-3-user.json`);
    const response = await fetch('https://open-horizon.github.io/docs/exchange-api/docs/openapi-3-user.json');
    
    if (!response.ok) {
      throw new Error(`Failed to fetch OpenAPI spec: ${response.status} ${response.statusText}`);
    }
    
    const spec = await response.json();
    console.log('Successfully fetched OpenAPI specification');
    return spec;
  } catch (error) {
    console.error('Error fetching OpenAPI specification:', error);
    throw error;
  }
}

function findMatchingEndpoints(spec, searchTerms, query) {
  const results = [];
  const paths = spec.paths || {};
  
  // Convert search terms to lowercase for case-insensitive matching
  const normalizedTerms = searchTerms.map(term => term.toLowerCase());
  const normalizedQuery = query.toLowerCase();
  
  // Define patterns for common API operations
  const patterns = [
    {
      pattern: /(get|query|fetch|retrieve)\s+(a|one|specific|single)\s+service/i,
      method: 'get',
      pathPattern: /\/orgs\/\{org\}\/services\/\{service\}/
    },
    {
      pattern: /(list|get|fetch|retrieve)\s+(all)?\s*services/i,
      method: 'get',
      pathPattern: /\/orgs\/\{org\}\/services$/
    },
    {
      pattern: /(get|query|fetch|retrieve)\s+(a|one|specific|single)\s+node/i,
      method: 'get',
      pathPattern: /\/orgs\/\{org\}\/nodes\/\{node_id\}/
    },
    {
      pattern: /(delete|remove)\s+(a|one|specific|single)\s+service/i,
      method: 'delete',
      pathPattern: /\/orgs\/\{org\}\/services\/\{service\}/
    },
    {
      pattern: /(create|add|register|publish)\s+(a|one|new)?\s*service/i,
      method: 'post',
      pathPattern: /\/orgs\/\{org\}\/services$/
    }
  ];
  
  // Check for pattern matches
  const matchedPatterns = patterns.filter(p => p.pattern.test(normalizedQuery));
  
  // Search through all paths and methods
  for (const path in paths) {
    const pathItem = paths[path];
    
    for (const method in pathItem) {
      if (['get', 'post', 'put', 'delete', 'patch'].includes(method)) {
        const operation = pathItem[method];
        const description = operation.description || operation.summary || '';
        const operationId = operation.operationId || '';
        const tags = operation.tags || [];
        
        // Calculate relevance score
        let relevanceScore = 0;
        
        // Check for pattern matches (highest priority)
        for (const pattern of matchedPatterns) {
          if (pattern.method === method && pattern.pathPattern.test(path)) {
            relevanceScore += 100; // High score for pattern matches
          }
        }
        
        // Check for direct path matches
        for (const term of normalizedTerms) {
          if (path.toLowerCase().includes(term)) {
            relevanceScore += 10;
          }
          
          // Check for method matches
          if (method.toLowerCase() === term) {
            relevanceScore += 15;
          }
          
          // Check for description, summary, operationId matches
          if (description.toLowerCase().includes(term)) {
            relevanceScore += 5;
          }
          
          if (operationId.toLowerCase().includes(term)) {
            relevanceScore += 8;
          }
          
          // Check for tag matches
          if (tags.some(tag => tag.toLowerCase().includes(term))) {
            relevanceScore += 12;
          }
        }
        
        // Special handling for specific endpoints
        if (normalizedQuery.includes('specific service') || normalizedQuery.includes('single service')) {
          if (method === 'get' && path.includes('/services/{service}')) {
            relevanceScore += 50;
          }
        }
        
        // Add to results if relevant
        if (relevanceScore > 0) {
          results.push({
            path,
            method: method.toUpperCase(),
            summary: operation.summary || '',
            description: operation.description || '',
            operationId: operation.operationId || '',
            parameters: operation.parameters || [],
            requestBody: operation.requestBody || null,
            responses: operation.responses || {},
            tags: operation.tags || [],
            relevanceScore // Store the relevance score for sorting
          });
        }
      }
    }
  }
  
  // Sort by relevance score
  results.sort((a, b) => b.relevanceScore - a.relevanceScore);
  
  return results;
}

function formatEndpointAsMarkdown(endpoint) {
  // Create a styled header with method and path
  const methodColors = {
    'GET': '💙 `GET`',
    'POST': '💚 `POST`',
    'PUT': '🧡 `PUT`',
    'DELETE': '❤️ `DELETE`',
    'PATCH': '💜 `PATCH`'
  };
  
  const methodBadge = methodColors[endpoint.method] || `\`${endpoint.method}\``;
  let markdown = `## ${methodBadge} ${endpoint.path}\n\n`;
  
  // Add tags as badges
  if (endpoint.tags && endpoint.tags.length > 0) {
    const tagBadges = endpoint.tags.map(tag => `\`${tag}\``).join(' ');
    markdown += `${tagBadges}\n\n`;
  }
  
  // Add summary and description
  if (endpoint.summary) {
    markdown += `### ${endpoint.summary}\n\n`;
  }
  
  if (endpoint.description) {
    markdown += `${endpoint.description}\n\n`;
  }
  
  // Add operation ID if available
  if (endpoint.operationId) {
    markdown += `**Operation ID:** \`${endpoint.operationId}\`\n\n`;
  }
  
  // Add parameters section with collapsible details
  if (endpoint.parameters && endpoint.parameters.length > 0) {
    markdown += '<details>\n';
    markdown += '<summary><strong>Parameters</strong></summary>\n\n';
    
    // Group parameters by location (path, query, header, etc.)
    const paramsByLocation = {};
    for (const param of endpoint.parameters) {
      const location = param.in || 'other';
      if (!paramsByLocation[location]) {
        paramsByLocation[location] = [];
      }
      paramsByLocation[location].push(param);
    }
    
    // Create tables for each parameter location
    for (const location in paramsByLocation) {
      markdown += `#### ${location.charAt(0).toUpperCase() + location.slice(1)} Parameters\n\n`;
      markdown += '| Name | Required | Type | Description |\n';
      markdown += '|------|:--------:|------|-------------|\n';
      
      const params = paramsByLocation[location] || [];
      for (const param of params) {
        const name = param.name || '';
        const required = param.required ? '✅' : '';
        const type = param.schema?.type || '';
        const description = param.description || '';
        
        markdown += `| **${name}** | ${required} | ${type} | ${description} |\n`;
      }
      
      markdown += '\n';
    }
    
    markdown += '</details>\n\n';
  }
  
  return markdown;
}

function generateUsageExample(endpoint) {
  // Add "Try it out" section
  let example = '### Try it out\n\n';
  example += '```bash\n';
  
  // Generate curl example
  let curlExample = `curl -X ${endpoint.method} `;
  
  // Add path with parameter placeholders
  let urlPath = endpoint.path;
  if (endpoint.parameters) {
    for (const param of endpoint.parameters) {
      if (param.in === 'path') {
        urlPath = urlPath.replace(`{${param.name}}`, `<YOUR_${param.name.toUpperCase()}>`);
      }
    }
  }
  
  // Add query parameters if any
  const queryParams = [];
  if (endpoint.parameters) {
    for (const param of endpoint.parameters) {
      if (param.in === 'query') {
        queryParams.push(`${param.name}=<YOUR_${param.name.toUpperCase()}>`);
      }
    }
  }
  
  const queryString = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';
  curlExample += `"https://your-exchange-api${urlPath}${queryString}" \\\n`;
  
  // Add headers
  curlExample += '  -H "Accept: application/json" \\\n';
  if (['POST', 'PUT', 'PATCH'].includes(endpoint.method)) {
    curlExample += '  -H "Content-Type: application/json" \\\n';
  }
  curlExample += '  -H "Authorization: Basic $(echo -n \'your-username:your-password\' | base64)"';
  
  // Add request body if applicable
  if (endpoint.requestBody) {
    curlExample += ' \\\n  -d \'';
    
    // Create a simple example request body
    const content = endpoint.requestBody.content || {};
    const mediaType = Object.keys(content)[0];
    
    if (mediaType && content[mediaType].schema) {
      const schema = content[mediaType].schema;
      
      if (schema.type === 'object' && schema.properties) {
        const example = {};
        
        for (const propName in schema.properties) {
          const prop = schema.properties[propName];
          
          if (prop.type === 'string') {
            example[propName] = 'example';
          } else if (prop.type === 'integer' || prop.type === 'number') {
            example[propName] = 123;
          } else if (prop.type === 'boolean') {
            example[propName] = true;
          } else if (prop.type === 'array') {
            example[propName] = [];
          } else if (prop.type === 'object') {
            example[propName] = {};
          }
        }
        
        curlExample += JSON.stringify(example, null, 2);
      }
    }
    
    curlExample += '\'';
  }
  
  example += curlExample;
  example += '\n```\n\n';
  
  // Also add JavaScript example
  example += '```javascript\n';
  example += `// Example using fetch for ${endpoint.method} ${endpoint.path}\n`;
  example += '// See the curl example above for parameter values\n';
  example += '```\n';
  
  return example;
}

// Simulate the API query tool
async function simulateApiQueryTool(params) {
  try {
    const { query } = params;
    
    if (!query) {
      return getErrorMessage("Query is required");
    }
    
    // Extract search terms from the query
    const searchTerms = query.toLowerCase()
      .replace(/[^\w\s]/g, ' ')  // Replace punctuation with spaces
      .split(/\s+/)              // Split by whitespace
      .filter(term => term.length > 2);  // Filter out short terms
    
    // Add specific terms based on common API operations
    if (query.toLowerCase().includes('get') || query.toLowerCase().includes('list')) {
      searchTerms.push('get');
    }
    if (query.toLowerCase().includes('create') || query.toLowerCase().includes('add')) {
      searchTerms.push('post');
    }
    if (query.toLowerCase().includes('update') || query.toLowerCase().includes('modify')) {
      searchTerms.push('put');
    }
    if (query.toLowerCase().includes('delete') || query.toLowerCase().includes('remove')) {
      searchTerms.push('delete');
    }
    
    // Add specific terms for common resources
    if (query.toLowerCase().includes('service')) {
      searchTerms.push('service');
    }
    if (query.toLowerCase().includes('node')) {
      searchTerms.push('node');
    }
    
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
    
    // Endpoints are already sorted by relevance score in findMatchingEndpoints
    
    // Limit to top 3 most relevant endpoints
    const topEndpoints = matchingEndpoints.slice(0, 3);
    
    // Format the results
    let responseText = `# API Information for: "${query}"\n\n`;
    responseText += `I found ${matchingEndpoints.length} API endpoints that match your query. Here are the most relevant ones:\n\n`;
    
    for (const endpoint of topEndpoints) {
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
  } catch (error) {
    console.error(`Error in API query tool: ${error}`);
    return getErrorMessage(error);
  }
}

// Test cases
async function runTests() {
  console.log('=== TEST 1: Query about listing services ===');
  const result1 = await simulateApiQueryTool({
    query: 'How do I get a list of services?'
  });
  console.log('Result:', result1);
  console.log('\n');

  console.log('=== TEST 2: Query about nodes ===');
  const result2 = await simulateApiQueryTool({
    query: 'How do I delete a node?'
  });
  console.log('Result:', result2);
  console.log('\n');

  console.log('=== TEST 3: Query with no matches ===');
  const result3 = await simulateApiQueryTool({
    query: 'How do I make coffee?'
  });
  console.log('Result:', result3);
  console.log('\n');
  
  console.log('=== TEST 4: Query for a specific service ===');
  const result4 = await simulateApiQueryTool({
    query: 'How do I get a specific service by ID?'
  });
  console.log('Result:', result4);
  console.log('\n');
}

// Run the tests if this file is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

// Export the functions for use in other test files
module.exports = {
  simulateApiQueryTool,
  fetchOpenApiSpec,
  findMatchingEndpoints,
  formatEndpointAsMarkdown,
  generateUsageExample
};

// Made with Bob
