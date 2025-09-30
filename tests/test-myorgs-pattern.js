/**
 * Test script for the myorgs pattern matching in the API query tool
 */

// Import necessary functions from the compiled JavaScript file
const { findMatchingEndpoints } = require('../dist/tools/api-query-tool');

// Mock OpenAPI spec with the myorgs endpoint
const mockSpec = {
  paths: {
    '/v1/myorgs': {
      post: {
        summary: 'Returns the orgs a user can view',
        description: 'Returns all the org definitions in the exchange that match the accounts the caller has access to. Can be run by any user.',
        operationId: 'getMyOrgs',
        tags: ['organizations'],
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
    '/orgs': {
      get: {
        summary: 'List all organizations',
        description: 'Returns all organizations.',
        operationId: 'listOrgs',
        tags: ['organizations'],
        responses: {
          '200': {
            description: 'Success'
          }
        }
      }
    }
  }
};

// Test queries
const testQueries = [
  'How do I see which organizations I have access to?',
  'What organizations can a user view?',
  'Show me my accessible organizations',
  'List organizations I can access',
  'Which orgs can I view?',
  'How to get organizations that a user can view?'
];

console.log('=== Testing myorgs pattern matching ===\n');

// Test each query
testQueries.forEach(query => {
  console.log(`Query: "${query}"`);
  
  // Extract search terms from the query
  const searchTerms = query.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(term => term.length > 2);
  
  // Add specific terms based on common API operations
  if (query.toLowerCase().includes('get') || query.toLowerCase().includes('list')) {
    searchTerms.push('get');
  }
  
  // Add specific terms for common resources
  if (query.toLowerCase().includes('organization') || query.toLowerCase().includes('org')) {
    searchTerms.push('organization');
  }
  
  if (query.toLowerCase().includes('user')) {
    searchTerms.push('user');
  }
  
  // Add specific terms for organization access queries
  if ((query.toLowerCase().includes('organization') || query.toLowerCase().includes('org')) && 
      (query.toLowerCase().includes('access') || query.toLowerCase().includes('view') || 
       query.toLowerCase().includes('my') || query.toLowerCase().includes('user'))) {
    searchTerms.push('myorgs');
  }
  
  console.log('Search terms:', searchTerms);
  
  // Find matching endpoints
  const matchingEndpoints = findMatchingEndpoints(mockSpec, searchTerms, query);
  
  // Check if the myorgs endpoint is the top result
  if (matchingEndpoints.length > 0) {
    const topEndpoint = matchingEndpoints[0];
    console.log(`Top match: ${topEndpoint.method} ${topEndpoint.path} (score: ${topEndpoint.relevanceScore})`);
    
    if (topEndpoint.method === 'POST' && topEndpoint.path === '/v1/myorgs') {
      console.log('✅ SUCCESS: myorgs endpoint is the top match\n');
    } else {
      console.log('❌ FAIL: myorgs endpoint is not the top match\n');
    }
  } else {
    console.log('❌ FAIL: No matching endpoints found\n');
  }
});

// Made with Bob