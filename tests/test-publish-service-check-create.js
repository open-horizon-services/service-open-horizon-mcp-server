/**
 * Test script for the publish-service tool with check-and-create behavior
 * This script simulates the new behavior of checking if a service exists
 * and creating it with POST if it doesn't, or updating it with PUT if it does
 */

// Mock HTTP request functions
const mockHttpRequest = async (url, headers) => {
  console.log(`Mock HTTP GET request to: ${url}`);
  console.log(`Headers:`, headers);
  
  // Simulate a 404 response for the web-hello-python service
  if (url.includes('web-hello-python')) {
    const error = new Error('Service not found');
    error.response = { status: 404 };
    throw error;
  }
  
  // Return a success response for other services
  return {
    status: 200,
    data: { msg: 'Service exists' }
  };
};

const mockPostRequest = async (url, data, headers, method = 'POST') => {
  console.log(`Mock HTTP ${method} request to: ${url}`);
  console.log(`Headers:`, headers);
  console.log(`Data:`, JSON.stringify(data, null, 2));
  
  // Return a success response
  return {
    status: method === 'PUT' ? 200 : 201,
    data: { msg: method === 'PUT' ? 'Service updated' : 'Service created' }
  };
};

// Create a test service definition with a digest in the image URL
const testServiceDefinition = {
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

// Mock the getExchangeParams function
const getExchangeParams = () => ({
  url: 'http://open-horizon-3.lfedge.iol.unh.edu:3091/v1',
  credential: 'base64-encoded-creds',
  organization: 'playground'
});

// Mock the signServiceDefinition function
const signServiceDefinition = (def) => {
  def.deploymentSignature = 'placeholder_signature';
  return def;
};

// Test function to simulate the publish-service tool's behavior
async function testPublishService() {
  console.log('Testing publish-service tool with check-and-create behavior...');
  
  try {
    // Get exchange parameters
    const { url, credential, organization } = getExchangeParams();
    
    // Parse the deployment string to an object
    const deploymentObj = JSON.parse(testServiceDefinition.deployment);
    
    // Extract the first service's image if available
    const services = deploymentObj.services || {};
    const firstServiceName = Object.keys(services)[0];
    
    if (firstServiceName && services[firstServiceName].image) {
      const imageUrl = services[firstServiceName].image;
      console.log(`Found Docker image: ${imageUrl}`);
      
      // For web-hello-python service, keep the original service ID
      if (imageUrl.includes('web-hello-python')) {
        console.log(`Special handling for web-hello-python: keeping original service ID`);
        // Keep the original service ID
        const serviceId = `${testServiceDefinition.url}_${testServiceDefinition.version}_${testServiceDefinition.arch}`;
        console.log(`Service ID will be: ${serviceId}`);
        
        // Construct the API URL that would be used
        const serviceUrl = `${url}/${organization}/services/${serviceId}`;
        console.log(`Service URL would be: ${serviceUrl}`);
        
        // Sign the service definition
        const signedServiceDefinition = signServiceDefinition(testServiceDefinition);
        console.log('Service definition signed:', signedServiceDefinition.deploymentSignature ? 'Yes' : 'No');
        
        // Check if the service exists
        try {
          console.log(`Checking if service exists at ${serviceUrl}`);
          await mockHttpRequest(serviceUrl, {
            Authorization: `Basic ${credential}`
          });
          
          console.log(`Service exists, updating it with PUT`);
          // Service exists, update it with PUT
          const response = await mockPostRequest(serviceUrl, signedServiceDefinition, {
            Authorization: `Basic ${credential}`
          }, 'PUT');
          
          console.log(`Update response:`, response);
        } catch (error) {
          // Service doesn't exist, create it with POST
          if (error.response && error.response.status === 404) {
            console.log(`Service doesn't exist, creating it with POST`);
            
            // Use POST to create a new service
            const servicesUrl = `${url}/${organization}/services`;
            console.log(`Posting to ${servicesUrl}`);
            
            const createResponse = await mockPostRequest(
              servicesUrl, 
              signedServiceDefinition, 
              { Authorization: `Basic ${credential}` }
            );
            
            console.log(`Creation response:`, createResponse);
          } else {
            // Some other error occurred
            console.error(`Error checking service: ${error}`);
          }
        }
      }
    }
    
    console.log('\nTest completed successfully');
  } catch (error) {
    console.error('Test error:', error);
  }
}

// Run the test
testPublishService();

// Made with Bob
