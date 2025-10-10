/**
 * Test script for the publish-service tool with image digest handling
 */

// Mock the common service functions
const mockCommon = {
  makeHttpRequest: jest.fn(),
  makePostRequest: jest.fn(),
  getErrorMessage: jest.fn(error => ({ content: [{ type: 'text', text: `Error: ${error}` }] })),
  getExchangeParams: jest.fn(() => ({
    url: 'http://open-horizon-3.lfedge.iol.unh.edu:3091/v1',
    credential: 'base64-encoded-creds',
    organization: 'playground'
  })),
  addDeploymentSignatureFromKey: jest.fn(def => def),
  generateDeploymentSignatureFromKey: jest.fn(() => 'mock-signature'),
  signServiceDefinition: jest.fn(def => {
    def.deploymentSignature = 'placeholder_signature';
    return def;
  })
};

// Mock the fs/promises module
const mockFs = {
  readFile: jest.fn()
};

// Mock the path module
const mockPath = {
  join: jest.fn((dir, ...paths) => paths.join('/'))
};

// Mock the modules
jest.mock('../src/services/common', () => mockCommon);
jest.mock('fs/promises', () => mockFs);
jest.mock('path', () => mockPath);

// Import the module under test
const { registerPublishServiceTool } = require('../src/tools/publish-service');

// Create a mock MCP server
const mockServer = {
  tool: jest.fn()
};

// Test function
async function runTests() {
  console.log('Registering publish-service tool...');
  registerPublishServiceTool(mockServer);
  
  // Extract the callback function registered with the server
  const toolCallback = mockServer.tool.mock.calls[0][3];
  
  // Test case 1: Service with digest in image URL
  console.log('\n--- Test Case 1: Service with digest in image URL ---');
  
  // Mock the HTTP response
  mockCommon.makePostRequest.mockResolvedValueOnce({
    status: 201,
    data: { msg: 'Service created/updated' }
  });
  
  // Create a test service definition with a digest in the image URL
  const serviceDefinition = {
    label: 'web-hello-python for amd64',
    description: 'A simple HTTP service to respond with a custom hello greeting in HTML format',
    public: true,
    documentation: 'https://github.com/open-horizon-services/web-helloworld-python/blob/main/README.md',
    url: 'web-hello-python',
    version: '1.0.0',
    arch: 'amd64',
    sharable: 'singleton',
    requiredServices: [],
    userInput: [],
    deployment: JSON.stringify({
      services: {
        'web-hello-python': {
          image: 'joewxboy/web-hello-python@sha256:4726debe35c1179de5739cbeb2abdabb26212dad5df8b0350db05bf9f3fe4d3d',
          binds: ['mms_shared_volume:/mms-shared:rw', '/var/run/docker.sock:/var/run/docker.sock'],
          ports: [{ HostIP: '0.0.0.0', HostPort: '8000:8000/tcp' }],
          privileged: true
        }
      }
    }),
    deploymentSignature: 'placeholder_signature'
  };
  
  // Call the tool callback with the service definition
  const result = await toolCallback({ serviceDefinition });
  
  // Check the result
  console.log('Result:', result);
  
  // Check if the service URL was updated correctly
  console.log('Service URL used in API call:', mockCommon.makePostRequest.mock.calls[0][0]);
  console.log('Service definition sent to API:', mockCommon.makePostRequest.mock.calls[0][1]);
  
  console.log('\nTests completed');
}

// Run the tests
runTests().catch(error => {
  console.error('Test error:', error);
});

// Made with Bob
