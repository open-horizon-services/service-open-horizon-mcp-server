/**
 * Test script for the fixed publish-service.ts
 * 
 * This script tests the exact error scenario that was reported
 */

// Mock the necessary objects and functions
const mockContext = {
  requestInfo: {
    headers: {
      'exchange-url': 'https://example.com/api',
      'exchange-credential': 'base64credential',
      'exchange-org': 'test-org'
    }
  }
};

// Mock the getExchangeParams function
const getExchangeParams = (params, context) => {
  return {
    url: context.requestInfo.headers['exchange-url'],
    credential: context.requestInfo.headers['exchange-credential'],
    organization: params.org || context.requestInfo.headers['exchange-org']
  };
};

// Mock the makePostRequest function
const makePostRequest = async (url, data, headers, method) => {
  console.log(`[MOCK] Making ${method} request to ${url}`);
  console.log(`[MOCK] Headers:`, headers);
  console.log(`[MOCK] Data:`, JSON.stringify(data, null, 2));
  
  // Check if deployment is a string
  if (data.deployment && typeof data.deployment === 'string') {
    console.log('[SUCCESS] deployment is correctly formatted as a string');
  } else {
    console.log('[ERROR] deployment is not a string:', typeof data.deployment);
  }
  
  return { status: 200 };
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

// Import the function from publish-service.ts (simulated here)
async function simulatePublishService(params, context) {
  try {
    // Access headers from the shared context
    const {url, credential, organization} = getExchangeParams(params, context);
    let serviceDefinition;
    
    // Process the serviceDefinition parameter
    if (params.serviceDefinition) {
      console.log('Original serviceDefinition:', typeof params.serviceDefinition);
      
      // Check if serviceDefinition is a string (JSON string) or an object
      if (typeof params.serviceDefinition === 'string') {
        try {
          serviceDefinition = JSON.parse(params.serviceDefinition);
          console.log('Parsed from JSON string');
        } catch (parseError) {
          console.log('Parsing error:', parseError);
          
          // Try handling escaped JSON strings
          try {
            const unescapedString = params.serviceDefinition.replace(/\\"/g, '"');
            serviceDefinition = JSON.parse(unescapedString);
            console.log('Parsed after unescaping quotes');
          } catch (unescapeError) {
            console.log('Unescaping quotes failed:', unescapeError);
            
            // If that also fails, try removing outer quotes and then parsing
            const trimmedString = params.serviceDefinition.trim();
            
            if (
              (trimmedString.startsWith('"') && trimmedString.endsWith('"')) ||
              (trimmedString.startsWith("'") && trimmedString.endsWith("'")) ||
              (trimmedString.startsWith('`') && trimmedString.endsWith('`'))
            ) {
              const innerString = trimmedString.substring(1, trimmedString.length - 1);
              
              try {
                serviceDefinition = JSON.parse(innerString);
                console.log('Parsed after removing outer quotes');
              } catch (innerParseError) {
                console.log('Parsing after removing outer quotes failed:', innerParseError);
                return getErrorMessage(`Invalid serviceDefinition: Not a valid JSON string`);
              }
            } else {
              return getErrorMessage(`Invalid serviceDefinition: Not a valid JSON string`);
            }
          }
        }
      } else {
        // It's already an object
        serviceDefinition = params.serviceDefinition;
        console.log('Using object directly');
      }
    } else {
      return getErrorMessage("serviceDefinition is required");
    }
    
    // Publish the service to the Exchange
    const serviceUrl = `${url}/${organization}/services/${serviceDefinition.url}_${serviceDefinition.version}_${serviceDefinition.arch}`;
    console.log(`Publishing service to Exchange at ${serviceUrl}`);
    console.log('Service definition:', JSON.stringify(serviceDefinition, null, 2));
    
    // Fix Docker image URL format if needed
    // Docker Hub images should not include "hub.docker.com/" prefix
    if (serviceDefinition.deployment && typeof serviceDefinition.deployment === 'object') {
      const services = serviceDefinition.deployment.services || {};
      for (const serviceName in services) {
        const service = services[serviceName];
        if (service.image && service.image.startsWith('hub.docker.com/')) {
          service.image = service.image.replace('hub.docker.com/', '');
          console.log(`Fixed Docker image URL: ${service.image}`);
        }
      }
    }
    
    // Convert deployment field to a string if it's an object
    // This is required by the Open Horizon Exchange API
    if (serviceDefinition.deployment && typeof serviceDefinition.deployment === 'object') {
      serviceDefinition.deployment = JSON.stringify(serviceDefinition.deployment);
      console.log('Converted deployment to string:', serviceDefinition.deployment);
    }
    
    // Remove the "org" field from the service definition
    // The API doesn't expect this field in the request body
    if ('org' in serviceDefinition) {
      console.log('Removing "org" field from service definition');
      delete serviceDefinition.org;
    }
    
    const response = await makePostRequest(serviceUrl, serviceDefinition, {
      Authorization: `Basic ${credential}`
    }, 'PUT');
    
    return {
      content: [
        {
          type: 'text',
          text: `Successfully published service "${serviceDefinition.url}" version ${serviceDefinition.version} for architecture ${serviceDefinition.arch} to organization ${organization}.`
        }
      ]
    };
  } catch (error) {
    console.error(`Error publishing service: ${error}`);
    return getErrorMessage(error);
  }
}

// Test the error scenario
async function testErrorScenario() {
  console.log('=== Testing the fixed publish-service with the error scenario ===');
  
  // This is the exact service definition that caused the error
  const errorScenario = {
    org: 'playground',
    serviceDefinition: `{
  \"org\": \"playground\",
  \"label\": \"chunk-saved-model-service for amd64\",
  \"url\": \"chunk-saved-model-service\",
  \"version\": \"1.0.0\",
  \"arch\": \"amd64\",
  \"public\": true,
  \"sharable\": \"singleton\",
  \"requiredServices\": [],
  \"userInput\": [],
  \"deployment\": {
    \"services\": {
      \"chunk-saved-model-service\": {
        \"image\": \"hub.docker.com/playbox21/chunk-saved-model-service_amd64:1.0.0\",
        \"binds\": [
          \"mms_shared_volume:/mms-shared:rw\",
          \"/var/run/docker.sock:/var/run/docker.sock\"
        ],
        \"ports\": [
          {
            \"HostIP\": \"0.0.0.0\",
            \"HostPort\": \"3002:3000/tcp\"
          }
        ],
        \"privileged\": true
      }
    }
  }
}`
  };
  
  const result = await simulatePublishService(errorScenario, mockContext);
  console.log('Result:', result);
}

// Run the test
testErrorScenario().catch(console.error);

// Made with Bob
