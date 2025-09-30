/**
 * Test script to compare the pattern matching and NLP approaches for API queries
 */

// Import functions from both implementations
const { findMatchingEndpoints: findMatchingEndpointsPattern } = require('../dist/tools/api-query-tool');
const { findMatchingEndpoints: findMatchingEndpointsNLP, analyzeQuery } = require('../dist/tools/api-query-tool-nlp');

// Test queries
const testQueries = [
  'How do I get a list of services?',
  'How do I get a specific service by ID?',
  'How do I register a node?',
  'How do I delete a service?',
  'How do I see which organizations I have access to?',
  'What organizations can a user view?',
  'How do I update a node policy?',
  'How can I check if a node is registered?'
];

// Mock OpenAPI spec with selected endpoints
const mockSpec = {
  paths: {
    '/orgs/{org}/services': {
      get: {
        summary: 'List all services',
        description: 'Returns all services in the specified organization.',
        operationId: 'listServices',
        tags: ['services']
      },
      post: {
        summary: 'Create a service',
        description: 'Creates a new service in the specified organization.',
        operationId: 'createService',
        tags: ['services']
      }
    },
    '/orgs/{org}/services/{service}': {
      get: {
        summary: 'Get service',
        description: 'Returns a specific service in the specified organization.',
        operationId: 'getService',
        tags: ['services']
      },
      delete: {
        summary: 'Delete service',
        description: 'Deletes a specific service in the specified organization.',
        operationId: 'deleteService',
        tags: ['services']
      }
    },
    '/orgs/{org}/nodes': {
      get: {
        summary: 'List all nodes',
        description: 'Returns all nodes in the specified organization.',
        operationId: 'listNodes',
        tags: ['nodes']
      },
      post: {
        summary: 'Create a node',
        description: 'Creates a new node in the specified organization.',
        operationId: 'createNode',
        tags: ['nodes']
      }
    },
    '/orgs/{org}/nodes/{node_id}': {
      get: {
        summary: 'Get node',
        description: 'Returns a specific node in the specified organization.',
        operationId: 'getNode',
        tags: ['nodes']
      },
      delete: {
        summary: 'Delete node',
        description: 'Deletes a specific node in the specified organization.',
        operationId: 'deleteNode',
        tags: ['nodes']
      }
    },
    '/v1/myorgs': {
      post: {
        summary: 'Returns the orgs a user can view',
        description: 'Returns all the org definitions in the exchange that match the accounts the caller has access to. Can be run by any user.',
        operationId: 'getMyOrgs',
        tags: ['organizations']
      }
    },
    '/orgs/{org}/nodes/{node_id}/policy': {
      get: {
        summary: 'Get node policy',
        description: 'Returns the policy for a specific node.',
        operationId: 'getNodePolicy',
        tags: ['nodes', 'policies']
      },
      put: {
        summary: 'Update node policy',
        description: 'Updates the policy for a specific node.',
        operationId: 'updateNodePolicy',
        tags: ['nodes', 'policies']
      }
    }
  }
};

// Function to extract search terms for pattern matching approach
function extractSearchTerms(query) {
  const searchTerms = query.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(term => term.length > 2);
  
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
  
  return searchTerms;
}

// Compare the two approaches
console.log('=== Comparing Pattern Matching vs. NLP Approaches ===\n');

for (const query of testQueries) {
  console.log(`Query: "${query}"`);
  
  // Pattern matching approach
  const searchTerms = extractSearchTerms(query);
  console.log('Pattern Matching - Search terms:', searchTerms);
  const patternResults = findMatchingEndpointsPattern(mockSpec, searchTerms, query);
  
  // NLP approach
  const analysis = analyzeQuery(query);
  console.log('NLP - Analysis:', JSON.stringify(analysis, null, 2));
  const nlpResults = findMatchingEndpointsNLP(mockSpec, analysis);
  
  // Compare top results
  console.log('\nTop Results:');
  
  if (patternResults.length > 0) {
    const topPattern = patternResults[0];
    console.log(`Pattern Matching: ${topPattern.method} ${topPattern.path} (score: ${topPattern.relevanceScore})`);
  } else {
    console.log('Pattern Matching: No results');
  }
  
  if (nlpResults.length > 0) {
    const topNLP = nlpResults[0];
    console.log(`NLP: ${topNLP.method} ${topNLP.path} (score: ${topNLP.relevanceScore})`);
  } else {
    console.log('NLP: No results');
  }
  
  // Check if they match
  if (patternResults.length > 0 && nlpResults.length > 0) {
    const patternTop = patternResults[0];
    const nlpTop = nlpResults[0];
    
    if (patternTop.method === nlpTop.method && patternTop.path === nlpTop.path) {
      console.log('✅ MATCH: Both approaches returned the same top result');
    } else {
      console.log('❌ MISMATCH: Different top results');
    }
  }
  
  console.log('\n' + '-'.repeat(80) + '\n');
}

// Made with Bob