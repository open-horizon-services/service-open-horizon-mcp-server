/**
 * Simple test script for the publish-service tool with image digest handling
 * This script doesn't rely on Jest and can be run directly with Node.js
 */

// Mock the required modules
const mockMakePostRequest = async (url, data, headers, method) => {
  console.log(`Mock API call to: ${url}`);
  console.log(`Method: ${method || 'POST'}`);
  console.log(`Headers:`, headers);
  console.log(`Data:`, JSON.stringify(data, null, 2));
  
  // Return a success response
  return {
    status: 201,
    data: { msg: 'Service created/updated' }
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

// Test function to simulate the publish-service tool's behavior
function testPublishService() {
  console.log('Testing publish-service tool with image digest handling...');
  
  // Parse the deployment string to an object
  const deploymentObj = JSON.parse(testServiceDefinition.deployment);
  
  // Extract the first service's image if available
  const services = deploymentObj.services || {};
  const firstServiceName = Object.keys(services)[0];
  
  if (firstServiceName && services[firstServiceName].image) {
    const imageUrl = services[firstServiceName].image;
    console.log(`Found Docker image: ${imageUrl}`);
    
    // Use the image name directly from the deployment
    if (imageUrl && imageUrl !== testServiceDefinition.url) {
      console.log(`Using Docker image "${imageUrl}" from deployment instead of service URL "${testServiceDefinition.url}"`);
      
      // Extract just the repository/name part without tag or digest for the service ID
      let serviceUrlFromImage = imageUrl;
      
      // For web-hello-python service, keep the original service ID
      if (imageUrl.includes('web-hello-python')) {
        console.log(`Special handling for web-hello-python: keeping original service ID`);
        // Keep the original service ID
        const serviceId = `${testServiceDefinition.url}_${testServiceDefinition.version}_${testServiceDefinition.arch}`;
        console.log(`Service ID will be: ${serviceId}`);
        
        // Construct the API URL that would be used
        const apiUrl = `http://open-horizon-3.lfedge.iol.unh.edu:3091/v1/playground/services/${serviceId}`;
        console.log(`API URL would be: ${apiUrl}`);
        
        // Show what would be sent to the API
        console.log(`Service definition would be sent with URL: ${testServiceDefinition.url}`);
      } else {
        // For other services, use the standard approach
        // Replace the service URL with the image name in the service ID
        const simpleName = imageUrl.split('/').pop()?.split('@')[0].split(':')[0];
        if (simpleName) {
          const serviceId = `${simpleName}_${testServiceDefinition.version}_${testServiceDefinition.arch}`;
          console.log(`Service ID would be: ${serviceId}`);
          
          // Construct the API URL that would be used
          const apiUrl = `http://open-horizon-3.lfedge.iol.unh.edu:3091/v1/playground/services/${serviceId}`;
          console.log(`API URL would be: ${apiUrl}`);
          
          // Show what would be sent to the API
          console.log(`Service definition would be sent with URL: ${simpleName}`);
        }
      }
    }
  }
  
  console.log('\nTest completed');
}

// Run the test
testPublishService();

// Made with Bob
