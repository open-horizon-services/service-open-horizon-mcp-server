/**
 * api-query-tool-nlp.ts
 * 
 * MCP tool for querying the Open Horizon API documentation using NLP (compromise)
 * to provide information about API endpoints, parameters, and usage examples.
 */

import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { makeHttpRequest, getErrorMessage } from '../services/common';
import nlp from 'compromise';
import nlpPlugin from 'compromise-sentences';

// Register the sentences plugin
nlp.extend(nlpPlugin);

// OpenAPI specification URL
const OPENAPI_SPEC_URL = 'https://open-horizon.github.io/docs/exchange-api/docs/openapi-3-user.json';

// Cache for the OpenAPI specification
let openApiSpecCache: any = null;
let lastFetchTime: number = 0;
const CACHE_TTL = 3600000; // 1 hour in milliseconds

// Define API resource types and their related terms
const resourceTypes = {
  service: ['service', 'services', 'microservice', 'microservices', 'container', 'containers', 'application', 'applications'],
  node: ['node', 'nodes', 'device', 'devices', 'edge', 'edges', 'agent', 'agents'],
  organization: ['organization', 'organizations', 'org', 'orgs'],
  user: ['user', 'users', 'account', 'accounts'],
  policy: ['policy', 'policies'],
  pattern: ['pattern', 'patterns', 'deployment', 'deployments']
};

// Define API actions and their related terms
const apiActions = {
  get: ['get', 'fetch', 'retrieve', 'query', 'find', 'show', 'display', 'list', 'view', 'see'],
  create: ['create', 'add', 'register', 'publish', 'make', 'define', 'insert', 'deploy'],
  update: ['update', 'modify', 'change', 'edit', 'alter', 'revise'],
  delete: ['delete', 'remove', 'unregister', 'unpublish', 'destroy']
};

// Define HTTP methods mapping
const httpMethods: Record<string, string> = {
  get: 'GET',
  create: 'POST',
  update: 'PUT',
  delete: 'DELETE'
};

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
 * Analyzes a query using NLP to extract relevant information
 * @param query The query to analyze
 * @returns An object with extracted information
 */
export function analyzeQuery(query: string): any {
  const doc = nlp(query);
  const result = {
    resources: [] as string[],
    actions: [] as string[],
    qualifiers: [] as string[],
    isSpecific: false,
    isAccessQuery: false,
    isUserRelated: false
  };
  
  // Extract nouns as potential resources
  const nouns: string[] = doc.nouns().out('array');
  
  // Extract verbs as potential actions
  const verbs: string[] = doc.verbs().toInfinitive().out('array');
  
  // Extract adjectives as potential qualifiers
  const adjectives: string[] = doc.adjectives().out('array');
  
  // Check for specific resource indicators
  result.isSpecific = query.toLowerCase().includes('specific') ||
                      query.toLowerCase().includes('single') ||
                      query.toLowerCase().includes('particular') ||
                      query.toLowerCase().includes('one') ||
                      query.toLowerCase().includes('by id');
  
  // Check for access-related terms
  result.isAccessQuery = query.toLowerCase().includes('access') ||
                         query.toLowerCase().includes('view') ||
                         query.toLowerCase().includes('see') ||
                         query.toLowerCase().includes('available');
  
  // Check for user-related terms
  result.isUserRelated = query.toLowerCase().includes('user') ||
                         query.toLowerCase().includes('my') ||
                         query.toLowerCase().includes('i') ||
                         query.toLowerCase().includes('me');
  
  // Direct resource extraction from query text (more aggressive approach)
  const lowerQuery = query.toLowerCase();
  
  // Check for service-related terms
  if (lowerQuery.includes('service') || lowerQuery.includes('services')) {
    result.resources.push('service');
  }
  
  // Check for node-related terms
  if (lowerQuery.includes('node') || lowerQuery.includes('nodes') ||
      lowerQuery.includes('device') || lowerQuery.includes('devices')) {
    result.resources.push('node');
  }
  
  // Check for organization-related terms
  if (lowerQuery.includes('organization') || lowerQuery.includes('organizations') ||
      lowerQuery.includes('org') || lowerQuery.includes('orgs')) {
    result.resources.push('organization');
  }
  
  // Check for policy-related terms
  if (lowerQuery.includes('policy') || lowerQuery.includes('policies')) {
    result.resources.push('policy');
  }
  
  // Check for pattern-related terms
  if (lowerQuery.includes('pattern') || lowerQuery.includes('patterns')) {
    result.resources.push('pattern');
  }
  
  // Map nouns to resource types (as additional check)
  for (const noun of nouns) {
    const lowerNoun = noun.toLowerCase();
    for (const [resourceType, terms] of Object.entries(resourceTypes)) {
      if (terms.includes(lowerNoun)) {
        if (!result.resources.includes(resourceType)) {
          result.resources.push(resourceType);
        }
      }
    }
  }
  
  // Direct action extraction from query text
  if (lowerQuery.includes('get') || lowerQuery.includes('list') ||
      lowerQuery.includes('find') || lowerQuery.includes('show') ||
      lowerQuery.includes('view') || lowerQuery.includes('see') ||
      lowerQuery.includes('check')) {
    result.actions.push('get');
  }
  
  if (lowerQuery.includes('create') || lowerQuery.includes('add') ||
      lowerQuery.includes('register') || lowerQuery.includes('make') ||
      lowerQuery.includes('publish')) {
    result.actions.push('create');
  }
  
  if (lowerQuery.includes('update') || lowerQuery.includes('modify') ||
      lowerQuery.includes('change') || lowerQuery.includes('edit')) {
    result.actions.push('update');
  }
  
  if (lowerQuery.includes('delete') || lowerQuery.includes('remove') ||
      lowerQuery.includes('unregister')) {
    result.actions.push('delete');
  }
  
  // Special case for "check if registered" - this should be a GET not a POST
  if (lowerQuery.includes('check') && lowerQuery.includes('registered')) {
    // Remove create action if it was added
    const createIndex = result.actions.indexOf('create');
    if (createIndex !== -1) {
      result.actions.splice(createIndex, 1);
    }
    // Ensure get action is present
    if (!result.actions.includes('get')) {
      result.actions.push('get');
    }
  }
  
  // Map verbs to API actions (as additional check)
  for (const verb of verbs) {
    const lowerVerb = verb.toLowerCase();
    for (const [actionType, terms] of Object.entries(apiActions)) {
      if (terms.includes(lowerVerb)) {
        if (!result.actions.includes(actionType)) {
          result.actions.push(actionType);
        }
      }
    }
  }
  
  // Add qualifiers
  result.qualifiers = adjectives.map(adj => adj.toLowerCase());
  
  return result;
}

/**
 * Finds endpoints that match the given query analysis
 * @param spec The OpenAPI specification
 * @param analysis The query analysis
 * @returns An array of matching endpoints with their details
 */
export function findMatchingEndpoints(spec: any, analysis: any): any[] {
  const results: any[] = [];
  const paths = spec.paths || {};
  
  // Process each path and method in the OpenAPI spec
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
        
        // Match HTTP method with action
        const actionMatch = analysis.actions.some((action: string) => {
          const httpMethod = httpMethods[action];
          return httpMethod && httpMethod.toLowerCase() === method.toUpperCase();
        });
        
        if (actionMatch) {
          relevanceScore += 100; // Increased from 50 to give more weight to action matches
        } else if (analysis.actions.length === 0) {
          // If no action is specified, give a small base score to all methods
          relevanceScore += 10;
        }
        
        // Match resources in path - this is critical for good matching
        for (const resource of analysis.resources) {
          // Check if the resource appears in the path
          if (path.toLowerCase().includes(resource.toLowerCase())) {
            relevanceScore += 100; // Increased from 30 to give more weight to resource matches in path
          }
          
          // Check if the resource appears in tags
          if (tags.some((tag: string) => tag.toLowerCase().includes(resource.toLowerCase()))) {
            relevanceScore += 50; // Increased from 20
          }
          
          // Check if the resource appears in description
          if (description.toLowerCase().includes(resource.toLowerCase())) {
            relevanceScore += 20; // Increased from 10
          }
        }
        
        // Special handling for organization access queries
        if (analysis.resources.includes('organization') &&
            analysis.isAccessQuery &&
            analysis.isUserRelated) {
          // Boost score for the myorgs endpoint
          if (method === 'post' && path === '/v1/myorgs') {
            relevanceScore += 200;
          }
        } else {
          // Reduce the default bias toward myorgs endpoint when not explicitly asking about organizations
          if (method === 'post' && path === '/v1/myorgs' && !analysis.resources.includes('organization')) {
            relevanceScore = 0; // Reset score for myorgs when not asking about organizations
          }
        }
        
        // Handle specific vs. list queries
        if (analysis.isSpecific) {
          // Boost endpoints that target a specific resource (contain path parameters)
          if (path.includes('{') && path.includes('}')) {
            relevanceScore += 80; // Increased from 40
          }
        } else {
          // Boost endpoints that list resources (don't have specific resource identifiers)
          if (path.endsWith('s') && (!path.includes('{') || !path.includes('}'))) {
            relevanceScore += 40; // Increased from 20 and made more specific to plural endpoints
          }
        }
        
        // Boost for common query patterns
        if (analysis.actions.includes('get') && path.toLowerCase().includes('service')) {
          if (!analysis.isSpecific && path === '/orgs/{org}/services' && method === 'get') {
            // "How do I get a list of services?"
            relevanceScore += 50;
          } else if (analysis.isSpecific && path === '/orgs/{org}/services/{service}' && method === 'get') {
            // "How do I get a specific service by ID?"
            relevanceScore += 50;
          }
        }
        
        if (analysis.actions.includes('delete') && path.toLowerCase().includes('service')) {
          // "How do I delete a service?"
          if (path === '/orgs/{org}/services/{service}' && method === 'delete') {
            relevanceScore += 50;
          }
        }
        
        if ((analysis.actions.includes('create') || analysis.actions.includes('register')) &&
            path.toLowerCase().includes('node')) {
          // "How do I register a node?"
          if (path === '/orgs/{org}/nodes' && method === 'post') {
            relevanceScore += 50;
          }
        }
        
        // Special handling for publishing/creating services
        if ((analysis.actions.includes('create') || analysis.actions.includes('publish')) &&
            analysis.resources.includes('service')) {
          // "How do I publish a service?"
          if (path === '/orgs/{org}/services' && method === 'post') {
            relevanceScore += 100;
          }
        }
        
        // Special handling for node policy updates
        if (analysis.actions.includes('update') &&
            analysis.resources.includes('node') &&
            analysis.resources.includes('policy')) {
          // "How do I update a node policy?"
          if (path === '/orgs/{org}/nodes/{node_id}/policy' && method === 'put') {
            relevanceScore += 100;
          }
        }
        
        // Special handling for checking if a node is registered
        if (analysis.actions.includes('get') &&
            analysis.resources.includes('node') &&
            path.toLowerCase().includes('node')) {
          // "How can I check if a node is registered?"
          if (path === '/orgs/{org}/nodes' && method === 'get') {
            relevanceScore += 50;
          } else if (path === '/orgs/{org}/nodes/{node_id}' && method === 'get') {
            relevanceScore += 30;
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
 * Register the api-query-tool-nlp with the MCP server
 */
export function registerApiQueryToolNlp(server: McpServer) {
  const toolName = 'api-query-tool-nlp';
  const toolDescription = `
    Use this NLP-powered tool to query the Open Horizon API documentation and get information about API endpoints,
    parameters, and usage examples.
    
    You can ask questions in natural language like:
    - How do I get a list of services?
    - How do I get a specific service by ID?
    - What endpoints are available for managing nodes?
    - How do I register a node?
    - What parameters are required for publishing a service?
    - How do I delete a specific service?
    - How do I query a single node?
    - Which organizations can a user view?
    
    The tool will analyze your query using natural language processing to understand your intent,
    and return relevant information about matching endpoints, including parameters, request bodies,
    responses, and usage examples.
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
      
      console.log(`Processing query: "${query}"`);
      
      // Analyze the query using NLP
      const analysis = analyzeQuery(query);
      console.log('Query analysis:', JSON.stringify(analysis, null, 2));
      
      // Fetch the OpenAPI specification
      const spec = await fetchOpenApiSpec();
      
      // Find matching endpoints
      const matchingEndpoints = findMatchingEndpoints(spec, analysis);
      
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
      
      // Format the results - focus on the most relevant endpoint for direct answers
      let responseText = '';
      
      // Get the best match (highest relevance score)
      const bestMatch = matchingEndpoints[0];
      
      // Format the response
      responseText = `# API Information for: "${query}"\n\n`;
      
      // Add the NLP analysis for transparency
      responseText += `## Query Analysis\n\n`;
      responseText += `- **Resources**: ${analysis.resources.join(', ') || 'None detected'}\n`;
      responseText += `- **Actions**: ${analysis.actions.join(', ') || 'None detected'}\n`;
      responseText += `- **Specific Resource**: ${analysis.isSpecific ? 'Yes' : 'No'}\n`;
      responseText += `- **Access Query**: ${analysis.isAccessQuery ? 'Yes' : 'No'}\n`;
      responseText += `- **User Related**: ${analysis.isUserRelated ? 'Yes' : 'No'}\n\n`;
      
      // Add the best matching endpoint
      responseText += formatEndpointAsMarkdown(bestMatch);
      responseText += generateUsageExample(bestMatch);
      
      // Add information about other potential matches
      if (matchingEndpoints.length > 1) {
        responseText += '## Other Relevant Endpoints\n\n';
        responseText += 'These endpoints might also be relevant to your query:\n\n';
        
        for (let i = 1; i < Math.min(3, matchingEndpoints.length); i++) {
          const endpoint = matchingEndpoints[i];
          responseText += `- **${endpoint.method} ${endpoint.path}** - ${endpoint.summary || endpoint.description || 'No description'}\n`;
        }
        
        responseText += '\nFor more details on these endpoints, you can ask a more specific question.\n';
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
      console.error(`Error in API query tool (NLP): ${error}`);
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
