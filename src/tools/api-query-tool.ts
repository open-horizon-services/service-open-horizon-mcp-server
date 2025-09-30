/**
 * api-query-tool.ts
 * 
 * MCP tool for querying the Open Horizon API documentation and providing information
 * about API endpoints, parameters, and usage examples.
 */

import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { makeHttpRequest, getErrorMessage } from '../services/common';

// OpenAPI specification URL
const OPENAPI_SPEC_URL = 'https://open-horizon.github.io/docs/exchange-api/docs/openapi-3-user.json';

// Cache for the OpenAPI specification
let openApiSpecCache: any = null;
let lastFetchTime: number = 0;
const CACHE_TTL = 3600000; // 1 hour in milliseconds

/**
 * Fetches the OpenAPI specification from the URL
 * @returns The OpenAPI specification as a JSON object
 */
async function fetchOpenApiSpec(): Promise<any> {
  const currentTime = Date.now();
  
  // Return cached spec if it's still valid
  if (openApiSpecCache && (currentTime - lastFetchTime < CACHE_TTL)) {
    return openApiSpecCache;
  }
  
  try {
    console.log(`Fetching OpenAPI specification from ${OPENAPI_SPEC_URL}`);
    const response = await fetch(OPENAPI_SPEC_URL);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch OpenAPI spec: ${response.status} ${response.statusText}`);
    }
    
    const spec = await response.json();
    openApiSpecCache = spec;
    lastFetchTime = currentTime;
    console.log('Successfully fetched and cached OpenAPI specification');
    return spec;
  } catch (error) {
    console.error('Error fetching OpenAPI specification:', error);
    throw error;
  }
}

/**
 * Finds endpoints that match the given search terms
 * @param spec The OpenAPI specification
 * @param searchTerms The search terms to match against endpoints
 * @returns An array of matching endpoints with their details
 */
/**
 * Finds endpoints that match the given search terms
 * @param spec The OpenAPI specification
 * @param searchTerms The search terms to match against endpoints
 * @param query The original query string for pattern matching
 * @returns An array of matching endpoints with their details
 */
export function findMatchingEndpoints(spec: any, searchTerms: string[], query: string): any[] {
  const results: any[] = [];
  const paths = spec.paths || {};
  
  // Convert search terms to lowercase for case-insensitive matching
  const normalizedTerms = searchTerms.map(term => term.toLowerCase());
  const normalizedQuery = query.toLowerCase();
  
  // Define patterns for common API operations
  const patterns = [
    // Pattern for viewing organizations a user has access to
    {
      pattern: /(list|get|fetch|retrieve|view|see|show|display)\s+(my|user|accessible|available)\s*(organizations|orgs)/i,
      method: 'post',
      pathPattern: /\/v1\/myorgs$/,
      priority: 150
    },
    // Pattern for questions about user organization access
    {
      pattern: /(what|which)\s+(organizations|orgs)\s+(can|do|does)\s+(i|user|one)\s+(have|has|access|view)/i,
      method: 'post',
      pathPattern: /\/v1\/myorgs$/,
      priority: 150
    },
    {
      pattern: /(get|query|fetch|retrieve)\s+(a|one|specific|single|details|information|about)\s+service/i,
      method: 'get',
      pathPattern: /\/orgs\/\{org\}\/services\/\{service\}$/,
      priority: 100
    },
    {
      pattern: /(list|get|fetch|retrieve)\s+(all)?\s*services/i,
      method: 'get',
      pathPattern: /\/orgs\/\{org\}\/services$/,
      priority: 90
    },
    {
      pattern: /(get|query|fetch|retrieve)\s+(a|one|specific|single|details|information|about)\s+node/i,
      method: 'get',
      pathPattern: /^\/orgs\/\{org\}\/nodes\/\{node_id\}$/,
      priority: 200
    },
    // Explicitly exclude subpath endpoints from node queries
    {
      pattern: /(get|query|fetch|retrieve)\s+(a|one|specific|single|details|information|about)\s+node/i,
      method: 'get',
      pathPattern: /\/nodes\/.*\/.+/,
      priority: -100
    },
    // Explicitly exclude POST endpoints for node queries
    {
      pattern: /(get|query|fetch|retrieve)\s+(a|one|specific|single|details|information|about)\s+node/i,
      method: 'post',
      pathPattern: /\/nodes\//,
      priority: -100
    },
    {
      pattern: /(delete|remove)\s+(a|one|specific|single)\s+service/i,
      method: 'delete',
      pathPattern: /\/orgs\/\{org\}\/services\/\{service\}/,
      priority: 90
    },
    {
      pattern: /(create|add|register|publish)\s+(a|one|new)?\s*service/i,
      method: 'post',
      pathPattern: /\/orgs\/\{org\}\/services$/,
      priority: 90
    },
    // Explicitly exclude docker auth endpoints from service queries
    {
      pattern: /(get|query|fetch|retrieve)\s+(a|one|specific|single|details|information|about)\s+service/i,
      method: 'get',
      pathPattern: /\/services\/.*\/dockauths/,
      priority: -100  // Negative priority to exclude this endpoint
    },
    // Explicitly exclude key/cert endpoints from service queries
    {
      pattern: /(get|query|fetch|retrieve)\s+(a|one|specific|single|details|information|about)\s+service/i,
      method: 'get',
      pathPattern: /\/services\/.*\/keys/,
      priority: -100  // Negative priority to exclude this endpoint
    },
    // Explicitly prioritize the main service endpoint
    {
      pattern: /(get|query|fetch|retrieve)\s+(a|one|specific|single|details|information|about)\s+service/i,
      method: 'get',
      pathPattern: /^\/orgs\/\{org\}\/services\/\{service\}$/,
      priority: 200  // Higher priority for the main service endpoint
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
            relevanceScore += pattern.priority || 100; // Use pattern priority or default to 100
          }
        }
        
        // Apply negative patterns to exclude certain endpoints
        for (const pattern of patterns) {
          if (pattern.priority < 0 && pattern.method === method && pattern.pathPattern.test(path)) {
            relevanceScore += pattern.priority; // Apply negative priority to exclude endpoints
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
          if (tags.some((tag: string) => tag.toLowerCase().includes(term))) {
            relevanceScore += 12;
          }
        }
        
        // Special handling for specific endpoints
        if (normalizedQuery.includes('specific service') ||
            normalizedQuery.includes('single service') ||
            normalizedQuery.includes('service details') ||
            normalizedQuery.includes('query service') ||
            normalizedQuery.includes('get service') ||
            normalizedQuery.includes('service information')) {
          // Exact match for the main service endpoint
          if (method === 'get' && path === '/orgs/{org}/services/{service}') {
            relevanceScore += 200;
          }
          // Match for service endpoint but with subpaths (less relevant)
          else if (method === 'get' && path.includes('/services/{service}/')) {
            // Check if this is a subpath endpoint (keys, dockauths, etc.)
            const parts = path.split('/services/{service}/');
            if (parts.length > 1 && parts[1] && parts[1].length > 0) {
              relevanceScore -= 50; // Penalize subpath endpoints
            }
          }
        }
        
        // Special handling for node queries
        if (normalizedQuery.includes('specific node') ||
            normalizedQuery.includes('single node') ||
            normalizedQuery.includes('node details') ||
            normalizedQuery.includes('query node') ||
            normalizedQuery.includes('get node') ||
            normalizedQuery.includes('node information')) {
          // Exact match for the main node endpoint
          if (method === 'get' && path === '/orgs/{org}/nodes/{node_id}') {
            relevanceScore += 200;
          }
          // Match for node endpoint but with subpaths (less relevant)
          else if (method === 'get' && path.includes('/nodes/{node_id}/')) {
            // Check if this is a subpath endpoint
            const parts = path.split('/nodes/{node_id}/');
            if (parts.length > 1 && parts[1] && parts[1].length > 0) {
              relevanceScore -= 50; // Penalize subpath endpoints
            }
          }
          // Penalize POST methods for node queries
          else if (method === 'post' && path.includes('/nodes/')) {
            relevanceScore -= 100;
          }
        }
        
        // Explicitly penalize auxiliary endpoints for service queries
        if ((normalizedQuery.includes('service') || normalizedQuery.includes('services'))) {
          if (path.includes('/dockauths') || path.includes('/keys') ||
              (path.includes('/services/{service}/') && !path.endsWith('/services/{service}'))) {
            relevanceScore -= 150;
          }
        }
        
        // Explicitly penalize auxiliary endpoints for node queries
        if ((normalizedQuery.includes('node') || normalizedQuery.includes('nodes'))) {
          if (path.includes('/hagroups/') ||
              (path.includes('/nodes/{node_id}/') && !path.endsWith('/nodes/{node_id}'))) {
            relevanceScore -= 150;
          }
        }
        
        // Special handling for organization access queries
        if (normalizedQuery.includes('organization') ||
            normalizedQuery.includes('organizations') ||
            normalizedQuery.includes('org') ||
            normalizedQuery.includes('orgs')) {
          
          // If the query is about user access to organizations
          if ((normalizedQuery.includes('access') ||
               normalizedQuery.includes('view') ||
               normalizedQuery.includes('my') ||
               normalizedQuery.includes('user')) &&
              method === 'post' &&
              path === '/v1/myorgs') {
            
            relevanceScore += 200; // Give high priority to the myorgs endpoint
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

/**
 * Formats an endpoint as a markdown string that resembles the OpenAPI UI
 * @param endpoint The endpoint to format
 * @returns A markdown string representation of the endpoint
 */
export function formatEndpointAsMarkdown(endpoint: any): string {
  // Create a styled header with method and path
  const methodColors: Record<string, string> = {
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
    const tagBadges = endpoint.tags.map((tag: string) => `\`${tag}\``).join(' ');
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
    const paramsByLocation: Record<string, any[]> = {};
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
      
      // TypeScript safety: ensure the array exists before iterating
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
  
  // Add request body section with collapsible details
  if (endpoint.requestBody) {
    markdown += '<details>\n';
    markdown += '<summary><strong>Request Body</strong></summary>\n\n';
    
    if (endpoint.requestBody.description) {
      markdown += `${endpoint.requestBody.description}\n\n`;
    }
    
    if (endpoint.requestBody.required) {
      markdown += '**Required:** ✅\n\n';
    }
    
    const content = endpoint.requestBody.content || {};
    for (const mediaType in content) {
      markdown += `**Media Type:** \`${mediaType}\`\n\n`;
      
      const schema = content[mediaType].schema;
      if (schema) {
        if (schema.type === 'object' && schema.properties) {
          markdown += '**Properties:**\n\n';
          markdown += '| Name | Type | Required | Description |\n';
          markdown += '|------|------|:--------:|-------------|\n';
          
          const required = schema.required || [];
          for (const propName in schema.properties) {
            const prop = schema.properties[propName];
            const type = prop.type || '';
            const isRequired = required.includes(propName) ? '✅' : '';
            const description = prop.description || '';
            
            markdown += `| **${propName}** | ${type} | ${isRequired} | ${description} |\n`;
          }
          
          markdown += '\n';
          
          // Add example JSON if properties exist
          markdown += '**Example:**\n\n';
          markdown += '```json\n';
          const example: Record<string, any> = {};
          for (const propName in schema.properties) {
            const prop = schema.properties[propName];
            if (prop.type === 'string') {
              example[propName] = 'string';
            } else if (prop.type === 'integer' || prop.type === 'number') {
              example[propName] = 0;
            } else if (prop.type === 'boolean') {
              example[propName] = false;
            } else if (prop.type === 'array') {
              example[propName] = [];
            } else if (prop.type === 'object') {
              example[propName] = {};
            } else {
              example[propName] = null;
            }
          }
          markdown += JSON.stringify(example, null, 2);
          markdown += '\n```\n\n';
        } else {
          markdown += `**Schema Type:** ${schema.type}\n\n`;
        }
      }
    }
    
    markdown += '</details>\n\n';
  }
  
  // Add responses section with collapsible details
  if (endpoint.responses) {
    // Add a summary of all response codes first
    markdown += '### Response Codes\n\n';
    markdown += '| Code | Description |\n';
    markdown += '|------|-------------|\n';
    
    for (const statusCode in endpoint.responses) {
      const response = endpoint.responses[statusCode];
      const description = response.description || '';
      
      // Add status code badge with color based on code
      let statusBadge = '';
      if (statusCode.startsWith('2')) {
        statusBadge = `🟢 \`${statusCode}\``;
      } else if (statusCode.startsWith('4')) {
        statusBadge = `🔶 \`${statusCode}\``;
      } else if (statusCode.startsWith('5')) {
        statusBadge = `🔴 \`${statusCode}\``;
      } else {
        statusBadge = `\`${statusCode}\``;
      }
      
      markdown += `| ${statusBadge} | ${description} |\n`;
    }
    
    markdown += '\n';
    
    // Detailed response information
    markdown += '<details>\n';
    markdown += '<summary><strong>Response Details</strong></summary>\n\n';
    
    for (const statusCode in endpoint.responses) {
      const response = endpoint.responses[statusCode];
      const description = response.description || '';
      
      // Add status code badge with color based on code
      let statusBadge = '';
      if (statusCode.startsWith('2')) {
        statusBadge = `🟢 \`${statusCode}\``;
      } else if (statusCode.startsWith('4')) {
        statusBadge = `🔶 \`${statusCode}\``;
      } else if (statusCode.startsWith('5')) {
        statusBadge = `🔴 \`${statusCode}\``;
      } else {
        statusBadge = `\`${statusCode}\``;
      }
      
      markdown += `### ${statusBadge} ${description}\n\n`;
      
      // Add response content if available
      if (response.content) {
        for (const mediaType in response.content) {
          markdown += `**Media Type:** \`${mediaType}\`\n\n`;
          
          const schema = response.content[mediaType].schema;
          if (schema) {
            if (schema.type === 'object' && schema.properties) {
              markdown += '**Properties:**\n\n';
              markdown += '| Name | Type | Description |\n';
              markdown += '|------|------|-------------|\n';
              
              for (const propName in schema.properties) {
                const prop = schema.properties[propName];
                const type = prop.type || '';
                const description = prop.description || '';
                
                markdown += `| **${propName}** | ${type} | ${description} |\n`;
              }
              
              markdown += '\n';
            } else {
              markdown += `**Schema Type:** ${schema.type}\n\n`;
            }
            
            // Add example if available
            if (response.content[mediaType].example) {
              markdown += '**Example:**\n\n';
              markdown += '```json\n';
              markdown += JSON.stringify(response.content[mediaType].example, null, 2);
              markdown += '\n```\n\n';
            } else if (response.content[mediaType].examples) {
              // Handle multiple examples
              for (const exampleName in response.content[mediaType].examples) {
                const example = response.content[mediaType].examples[exampleName];
                markdown += `**Example (${exampleName}):**\n\n`;
                markdown += '```json\n';
                if (example.value) {
                  markdown += JSON.stringify(example.value, null, 2);
                } else if (typeof example === 'object') {
                  markdown += JSON.stringify(example, null, 2);
                }
                markdown += '\n```\n\n';
              }
            }
          }
        }
      }
    }
    
    markdown += '</details>\n\n';
  }
  
  // Add "Try it out" section
  markdown += '### Try it out\n\n';
  markdown += '```bash\n';
  
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
  const queryParams: string[] = [];
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
        const example: Record<string, any> = {};
        
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
  
  markdown += curlExample;
  markdown += '\n```\n\n';
  
  return markdown;
}

/**
 * Generates a usage example for the given endpoint
 * @param endpoint The endpoint to generate an example for
 * @returns A markdown string with the usage example
 */
export function generateUsageExample(endpoint: any): string {
  const method = endpoint.method.toLowerCase();
  const path = endpoint.path;
  
  let example = `### Example Usage\n\n`;
  example += '```javascript\n';
  
  // Generate parameter values
  const queryParams: string[] = [];
  const pathParams: Record<string, string> = {};
  let requestBody: any = null;
  
  if (endpoint.parameters) {
    for (const param of endpoint.parameters) {
      if (param.in === 'query') {
        // Generate example value based on type
        let exampleValue = 'example';
        if (param.schema) {
          if (param.schema.type === 'integer' || param.schema.type === 'number') {
            exampleValue = '123';
          } else if (param.schema.type === 'boolean') {
            exampleValue = 'true';
          } else if (param.schema.enum && param.schema.enum.length > 0) {
            exampleValue = `"${param.schema.enum[0]}"`;
          }
        }
        
        queryParams.push(`${param.name}=${exampleValue}`);
      } else if (param.in === 'path') {
        pathParams[param.name] = param.name;
      }
    }
  }
  
  // Handle request body
  if (endpoint.requestBody && endpoint.requestBody.content) {
    const content = endpoint.requestBody.content;
    const mediaType = Object.keys(content)[0];
    
    if (mediaType && content[mediaType].schema) {
      const schema = content[mediaType].schema;
      
      if (schema.type === 'object' && schema.properties) {
        requestBody = {};
        
        for (const propName in schema.properties) {
          const prop = schema.properties[propName];
          
          // Generate example value based on type
          if (prop.type === 'string') {
            requestBody[propName] = 'example';
          } else if (prop.type === 'integer' || prop.type === 'number') {
            requestBody[propName] = 123;
          } else if (prop.type === 'boolean') {
            requestBody[propName] = true;
          } else if (prop.type === 'array') {
            requestBody[propName] = [];
          } else if (prop.type === 'object') {
            requestBody[propName] = {};
          }
        }
      }
    }
  }
  
  // Replace path parameters
  let urlPath = path;
  for (const paramName in pathParams) {
    urlPath = urlPath.replace(`{${paramName}}`, pathParams[paramName]);
  }
  
  // Add query parameters
  const queryString = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';
  
  // Generate fetch example
  example += `// Example using fetch\n`;
  example += `const url = 'https://your-exchange-api${urlPath}${queryString}';\n`;
  example += `const headers = {\n`;
  example += `  'Accept': 'application/json',\n`;
  
  if (['post', 'put', 'patch'].includes(method)) {
    example += `  'Content-Type': 'application/json',\n`;
  }
  
  example += `  'Authorization': 'Basic ' + btoa('username:password')\n`;
  example += `};\n\n`;
  
  if (requestBody) {
    example += `const requestBody = ${JSON.stringify(requestBody, null, 2)};\n\n`;
  }
  
  example += `fetch(url, {\n`;
  example += `  method: '${method.toUpperCase()}',\n`;
  example += `  headers: headers,\n`;
  
  if (requestBody) {
    example += `  body: JSON.stringify(requestBody)\n`;
  }
  
  example += `})\n`;
  example += `.then(response => {\n`;
  example += `  if (!response.ok) {\n`;
  example += `    throw new Error(\`HTTP error! Status: \${response.status}\`);\n`;
  example += `  }\n`;
  example += `  return response.json();\n`;
  example += `})\n`;
  example += `.then(data => {\n`;
  example += `  console.log('Success:', data);\n`;
  example += `})\n`;
  example += `.catch(error => {\n`;
  example += `  console.error('Error:', error);\n`;
  example += `});\n`;
  
  example += '```\n';
  return example;
}

/**
 * Register the api-query-tool with the MCP server
 */
export function registerApiQueryTool(server: McpServer) {
  const toolName = 'api-query-tool';
  const toolDescription = `
    Use this tool to query the Open Horizon API documentation and get information about API endpoints,
    parameters, and usage examples.
    
    You can ask questions like:
    - How do I get a list of services?
    - How do I get a specific service by ID?
    - What endpoints are available for managing nodes?
    - How do I register a node?
    - What parameters are required for publishing a service?
    - How do I delete a specific service?
    - How do I query a single node?
    
    The tool will search the OpenAPI specification and return relevant information about matching endpoints,
    including parameters, request bodies, responses, and usage examples. It can understand natural language
    queries and find the most appropriate API endpoints for your needs.
  `;
  const toolSchema = {
    query: z.string().describe('The question or search query about the Open Horizon API'),
  };
  
  const toolCallback = async (params: any): Promise<any> => {
    try {
      const { query } = params;
      
      if (!query) {
        return getErrorMessage("Query is required");
      }
      
      // Extract search terms from the query
      const searchTerms = query.toLowerCase()
        .replace(/[^\w\s]/g, ' ')  // Replace punctuation with spaces
        .split(/\s+/)              // Split by whitespace
        .filter((term: string) => term.length > 2);  // Filter out short terms
      
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
      if (query.toLowerCase().includes('policy')) {
        searchTerms.push('policy');
      }
      if (query.toLowerCase().includes('pattern')) {
        searchTerms.push('pattern');
      }
      if (query.toLowerCase().includes('user')) {
        searchTerms.push('user');
      }
      if (query.toLowerCase().includes('organization') || query.toLowerCase().includes('org')) {
        searchTerms.push('organization');
      }
      
      // Add specific terms for organization access queries
      if ((query.toLowerCase().includes('organization') || query.toLowerCase().includes('org')) &&
          (query.toLowerCase().includes('access') || query.toLowerCase().includes('view') ||
           query.toLowerCase().includes('my') || query.toLowerCase().includes('user'))) {
        searchTerms.push('myorgs');
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
      
      // Format the results - focus on the most relevant endpoint for direct answers
      let responseText = '';
      
      // If we have a very high relevance score match (pattern match), provide a direct answer
      let bestMatch = matchingEndpoints[0];
      
      // Define method colors for formatting
      const methodColors: Record<string, string> = {
        'GET': '💙 `GET`',
        'POST': '💚 `POST`',
        'PUT': '🧡 `PUT`',
        'DELETE': '❤️ `DELETE`',
        'PATCH': '💜 `PATCH`'
      };
      
      // Ensure we're prioritizing the main endpoints for queries
      if (query.toLowerCase().includes('service')) {
        // Check if we have the main service endpoint in our results
        const mainServiceEndpoint = matchingEndpoints.find(
          endpoint => endpoint.method === 'GET' && endpoint.path === '/orgs/{org}/services/{service}'
        );
        
        // If we found the main service endpoint and it's not already the best match
        if (mainServiceEndpoint && bestMatch.path !== '/orgs/{org}/services/{service}') {
          bestMatch = mainServiceEndpoint;
        }
        
        // If the best match is still a subpath endpoint, try to find a better one
        if (bestMatch.path.includes('/dockauths') || bestMatch.path.includes('/keys')) {
          // Use the next best match that's not a subpath endpoint
          for (let i = 1; i < matchingEndpoints.length; i++) {
            if (!matchingEndpoints[i].path.includes('/dockauths') &&
                !matchingEndpoints[i].path.includes('/keys')) {
              bestMatch = matchingEndpoints[i];
              break;
            }
          }
        }
      } else if (query.toLowerCase().includes('node')) {
        // Check if we have the main node endpoint in our results
        const mainNodeEndpoint = matchingEndpoints.find(
          endpoint => endpoint.method === 'GET' && endpoint.path === '/orgs/{org}/nodes/{node_id}'
        );
        
        // If we found the main node endpoint and it's not already the best match
        if (mainNodeEndpoint && bestMatch.path !== '/orgs/{org}/nodes/{node_id}') {
          bestMatch = mainNodeEndpoint;
        }
        
        // If the best match is still a subpath endpoint or POST method, try to find a better one
        if (bestMatch.path.includes('/hagroups/') ||
            (bestMatch.method === 'POST' && bestMatch.path.includes('/nodes/'))) {
          // Use the next best match that's not a subpath endpoint
          for (let i = 1; i < matchingEndpoints.length; i++) {
            if (!matchingEndpoints[i].path.includes('/hagroups/') &&
                !(matchingEndpoints[i].method === 'POST' && matchingEndpoints[i].path.includes('/nodes/'))) {
              bestMatch = matchingEndpoints[i];
              break;
            }
          }
        }
      }
      
      if (bestMatch && bestMatch.relevanceScore >= 100) {
        // Direct answer format - more concise and focused
        responseText = `# API Information for: "${query}"\n\n`;
        
        // Main endpoint information
        responseText += `## ${methodColors[bestMatch.method] || `\`${bestMatch.method}\``} ${bestMatch.path}\n\n`;
        
        if (bestMatch.tags && bestMatch.tags.length > 0) {
          const tagBadges = bestMatch.tags.map((tag: string) => `\`${tag}\``).join(' ');
          responseText += `${tagBadges}\n\n`;
        }
        
        if (bestMatch.summary) {
          responseText += `### ${bestMatch.summary}\n\n`;
        }
        
        if (bestMatch.description) {
          responseText += `${bestMatch.description}\n\n`;
        }
        
        // Add response codes summary
        if (bestMatch.responses) {
          responseText += '### Response Codes\n\n';
          responseText += '| Code | Description |\n';
          responseText += '|------|-------------|\n';
          
          for (const statusCode in bestMatch.responses) {
            const response = bestMatch.responses[statusCode];
            const description = response.description || '';
            
            // Add status code badge with color based on code
            let statusBadge = '';
            if (statusCode.startsWith('2')) {
              statusBadge = `🟢 \`${statusCode}\``;
            } else if (statusCode.startsWith('4')) {
              statusBadge = `🔶 \`${statusCode}\``;
            } else if (statusCode.startsWith('5')) {
              statusBadge = `🔴 \`${statusCode}\``;
            } else {
              statusBadge = `\`${statusCode}\``;
            }
            
            responseText += `| ${statusBadge} | ${description} |\n`;
          }
          
          responseText += '\n';
        }
        
        // Add parameters section - focus on required parameters
        if (bestMatch.parameters && bestMatch.parameters.length > 0) {
          const requiredParams = bestMatch.parameters.filter((p: any) => p.required);
          if (requiredParams.length > 0) {
            responseText += '### Required Parameters\n\n';
            responseText += '| Name | In | Type | Description |\n';
            responseText += '|------|----|----|-------------|\n';
            
            for (const param of requiredParams) {
              const name = param.name || '';
              const inWhere = param.in || '';
              const type = param.schema?.type || '';
              const description = param.description || '';
              
              responseText += `| **${name}** | ${inWhere} | ${type} | ${description} |\n`;
            }
            
            responseText += '\n';
          }
        }
        
        // Add response examples if available
        if (bestMatch.responses) {
          // Find a success response (2xx)
          const successResponses = Object.keys(bestMatch.responses)
            .filter(code => code.startsWith('2'))
            .map(code => ({ code, response: bestMatch.responses[code] }));
          
          if (successResponses.length > 0) {
            responseText += '### Response Examples\n\n';
            
            for (const { code, response } of successResponses) {
              responseText += `#### ${code} ${response.description || ''}\n\n`;
              
              if (response.content) {
                for (const mediaType in response.content) {
                  // Add example if available
                  if (response.content[mediaType].example) {
                    responseText += '```json\n';
                    responseText += JSON.stringify(response.content[mediaType].example, null, 2);
                    responseText += '\n```\n\n';
                  } else if (response.content[mediaType].examples) {
                    // Handle multiple examples
                    for (const exampleName in response.content[mediaType].examples) {
                      const example = response.content[mediaType].examples[exampleName];
                      responseText += `**${exampleName}:**\n\n`;
                      responseText += '```json\n';
                      if (example.value) {
                        responseText += JSON.stringify(example.value, null, 2);
                      } else if (typeof example === 'object') {
                        responseText += JSON.stringify(example, null, 2);
                      }
                      responseText += '\n```\n\n';
                    }
                  }
                }
              }
            }
          }
        }
        
        // Add curl example - simplified
        responseText += '### Example\n\n';
        responseText += '```bash\n';
        
        // Generate curl example
        let curlExample = `curl -X ${bestMatch.method} `;
        
        // Add path with parameter placeholders
        let urlPath = bestMatch.path;
        if (bestMatch.parameters) {
          for (const param of bestMatch.parameters) {
            if (param.in === 'path') {
              urlPath = urlPath.replace(`{${param.name}}`, `<YOUR_${param.name.toUpperCase()}>`);
            }
          }
        }
        
        // Add query parameters if any
        const queryParams: string[] = [];
        if (bestMatch.parameters) {
          for (const param of bestMatch.parameters) {
            if (param.in === 'query') {
              queryParams.push(`${param.name}=<YOUR_${param.name.toUpperCase()}>`);
            }
          }
        }
        
        const queryString = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';
        curlExample += `"https://your-exchange-api${urlPath}${queryString}" \\\n`;
        
        // Add headers
        curlExample += '  -H "Accept: application/json" \\\n';
        if (['POST', 'PUT', 'PATCH'].includes(bestMatch.method)) {
          curlExample += '  -H "Content-Type: application/json" \\\n';
        }
        curlExample += '  -H "Authorization: Basic $(echo -n \'your-username:your-password\' | base64)"';
        
        // Add request body if applicable
        if (bestMatch.requestBody) {
          curlExample += ' \\\n  -d \'';
          
          // Create a simple example request body
          const content = bestMatch.requestBody.content || {};
          const mediaType = Object.keys(content)[0];
          
          if (mediaType && content[mediaType].schema) {
            const schema = content[mediaType].schema;
            
            if (schema.type === 'object' && schema.properties) {
              const example: Record<string, any> = {};
              
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
        
        responseText += curlExample;
        responseText += '\n```\n\n';
      } else {
        // Standard format for less certain matches
        responseText = `# API Information for: "${query}"\n\n`;
        
        for (const endpoint of topEndpoints.slice(0, 1)) {
          responseText += formatEndpointAsMarkdown(endpoint);
          responseText += generateUsageExample(endpoint);
        }
        
        if (matchingEndpoints.length > 1) {
          responseText += '\n*Other potentially relevant endpoints are available. For more specific results, try refining your query.*\n';
        }
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
  };
  
  server.tool(
    toolName,
    toolDescription,
    toolSchema,
    toolCallback
  );
}

// Made with Bob
