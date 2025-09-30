/**
 * Test script for the fixed generate-service-definition.ts
 * 
 * This script tests the updated functionality
 */

// Mock the necessary objects and functions
const mockContext = {
  requestInfo: {
    headers: {}
  }
};

// Mock the fs module
const fs = {
  readFile: async (path, encoding) => {
    console.log(`[MOCK] Reading file: ${path}`);
    if (path.includes('service-definition.json')) {
      return `{
  "org": "$HZN_ORG_ID",
  "label": "$SERVICE_NAME for $ARCH",
  "url": "$SERVICE_NAME",
  "version": "$SERVICE_VERSION",
  "arch": "$ARCH",
  "public": true,
  "sharable": "singleton",
  "requiredServices": [],
  "userInput": [],
  "deployment": {
    "services": {
      "$SERVICE_NAME": {
        "image": "$SERVICE_CONTAINER",
        "binds": ["$MMS_SHARED_VOLUME:$VOLUME_MOUNT:rw","/var/run/docker.sock:/var/run/docker.sock"],
        "ports": [
          { "HostIP": "0.0.0.0", "HostPort": "$EXPOSE_PORT:$APP_PORT/tcp" }
        ],
        "privileged": true
      }
    }
  }
}`;
    } else {
      throw new Error(`File not found: ${path}`);
    }
  },
  writeFile: async (path, content, encoding) => {
    console.log(`[MOCK] Writing file: ${path}`);
    console.log(`[MOCK] Content: ${content}`);
    return true;
  }
};

// Mock the path module
const path = {
  join: (...parts) => parts.join('/')
};

// Import the function from generate-service-definition.ts (simulated here)
async function simulateGenerateServiceDefinition(params, context) {
  try {
    let configData = {};
    let serviceType = params.type || 'basic';
    
    // Use individual parameters
    configData = {
      ARCH: params.arch || 'amd64',
      HZN_ORG_ID: params.org || 'myorg',
      SERVICE_NAME: params.serviceName,
      SERVICE_VERSION: params.serviceVersion,
      SERVICE_CONTAINER: params.serviceContainer,
      VOLUME_MOUNT: params.volumeMount || '/mms-shared',
      SHARED_VOLUME: params.mmsVolume || 'mms_shared_volume',
      EXPOSE_PORT: params.exposePort || '3000',
      APP_PORT: params.appPort || '3000',
      PRIVILEGED: true
    };
    
    // Load the template
    const templatePath = path.join(process.cwd(), 'templates', 'service-definition.json');
    console.log(`Loading template from ${templatePath}`);
    const templateContent = await fs.readFile(templatePath, 'utf8');
    
    // Replace variables in the template
    let processedTemplate = templateContent
      .replace(/\$HZN_ORG_ID/g, configData.HZN_ORG_ID)
      .replace(/\$SERVICE_NAME/g, configData.SERVICE_NAME)
      .replace(/\$SERVICE_VERSION/g, configData.SERVICE_VERSION)
      .replace(/\$SERVICE_CONTAINER/g, configData.SERVICE_CONTAINER)
      .replace(/\$ARCH/g, configData.ARCH)
      .replace(/\$VOLUME_MOUNT/g, configData.VOLUME_MOUNT)
      .replace(/\$MMS_SHARED_VOLUME/g, configData.SHARED_VOLUME)
      .replace(/\$EXPOSE_PORT/g, configData.EXPOSE_PORT)
      .replace(/\$APP_PORT/g, configData.APP_PORT);
    
    // Parse the template to validate it's valid JSON
    const serviceDefinition = JSON.parse(processedTemplate);
    
    // Generate the output file name
    const serviceName = configData.SERVICE_NAME;
    const serviceVersion = configData.SERVICE_VERSION;
    const architecture = configData.ARCH;
    const fileName = `${serviceName}_${serviceVersion}_${architecture}.json`;
    const outputDirectory = params.outputPath || '.';
    const outputFilePath = path.join(outputDirectory, fileName);
    
    // Only save to file if explicitly requested
    const saveToFile = params.saveToFile === true;
    let fileMessage = '';
    
    if (saveToFile) {
      await fs.writeFile(outputFilePath, JSON.stringify(serviceDefinition, null, 2), 'utf8');
      fileMessage = `Successfully generated service definition file: ${outputFilePath}\n\n`;
    }
    
    return {
      content: [
        {
          type: 'text',
          text: `${fileMessage}Service Definition:\n${JSON.stringify(serviceDefinition, null, 2)}`
        }
      ]
    };
  } catch (error) {
    console.error(`Error generating service definition: ${error}`);
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

// Test cases
async function runTests() {
  console.log('=== TEST 1: Generate service definition without saving to file ===');
  const result1 = await simulateGenerateServiceDefinition({
    serviceName: "test-service",
    serviceVersion: "1.0.0",
    serviceContainer: "test-image:latest",
    arch: "amd64",
    saveToFile: false
  }, mockContext);
  console.log('Result:', result1);
  console.log('\n');

  console.log('=== TEST 2: Generate service definition and save to file ===');
  const result2 = await simulateGenerateServiceDefinition({
    serviceName: "test-service",
    serviceVersion: "1.0.0",
    serviceContainer: "test-image:latest",
    arch: "amd64",
    saveToFile: true,
    outputPath: "./output"
  }, mockContext);
  console.log('Result:', result2);
  console.log('\n');
}

// Run the tests
runTests().catch(console.error);

// Made with Bob
