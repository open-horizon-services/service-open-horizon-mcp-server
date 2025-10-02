/**
 * Test script for deployment signature generation
 * 
 * This script tests the deployment signature generation functions
 * added to the common.ts file.
 */

// Since we're importing from a TypeScript file, we need to use the compiled JavaScript
// The TypeScript files are compiled to JavaScript in the dist directory
const {
  generateDeploymentSignature,
  verifyDeploymentSignature,
  generateDeploymentSignatureFromKey,
  verifyDeploymentSignatureFromKey,
  addDeploymentSignature,
  addDeploymentSignatureFromKey,
  signServiceDefinition
} = require('../dist/services/common');
const fs = require('fs').promises;
const crypto = require('crypto');

// Sample service definition similar to the one in the task
const sampleServiceDefinition = {
  "org": "playground",
  "label": "chunk-saved-model-service for amd64",
  "description": "chunk-saved-model-service for amd64",
  "url": "chunk-saved-model-service",
  "version": "1.0.0",
  "arch": "amd64",
  "public": true,
  "sharable": "singleton",
  "requiredServices": [],
  "userInput": [],
  "deployment": {
    "services": {
      "chunk-saved-model-service": {
        "image": "hub.docker.com/playbox21/chunk-saved-model-service_amd64:1.0.0",
        "binds": [
          "mms_shared_volume:/mms-shared:rw",
          "/var/run/docker.sock:/var/run/docker.sock"
        ],
        "ports": [
          {
            "HostIP": "0.0.0.0",
            "HostPort": "3002:3000/tcp"
          }
        ],
        "privileged": true
      }
    }
  }
};

// Function to generate a test key pair
async function generateTestKeyPair() {
  console.log('Generating test key pair...');
  
  // Generate key pair
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem'
    }
  });
  
  // Write keys to temporary files
  await fs.writeFile('test-private-key.pem', privateKey);
  await fs.writeFile('test-public-key.pem', publicKey);
  
  console.log('Key pair generated and saved to test-private-key.pem and test-public-key.pem');
  
  return { publicKey, privateKey };
}

// Main test function
async function runTests() {
  try {
    console.log('Starting deployment signature tests...');
    
    // Generate test key pair
    const { publicKey, privateKey } = await generateTestKeyPair();
    
    // Test 1: Generate signature from key strings
    console.log('\nTest 1: Generate signature from key strings');
    const signature1 = generateDeploymentSignatureFromKey(
      sampleServiceDefinition.deployment, 
      privateKey
    );
    console.log('Signature generated:', signature1);
    
    // Verify the signature
    const isValid1 = verifyDeploymentSignatureFromKey(
      sampleServiceDefinition.deployment,
      signature1,
      publicKey
    );
    console.log('Signature valid:', isValid1);
    
    // Test 2: Generate signature from key files
    console.log('\nTest 2: Generate signature from key files');
    const signature2 = await generateDeploymentSignature(
      sampleServiceDefinition.deployment,
      'test-private-key.pem'
    );
    console.log('Signature generated:', signature2);
    
    // Verify the signature
    const isValid2 = await verifyDeploymentSignature(
      sampleServiceDefinition.deployment,
      signature2,
      'test-public-key.pem'
    );
    console.log('Signature valid:', isValid2);
    
    // Test 3: Add signature to service definition
    console.log('\nTest 3: Add signature to service definition');
    const signedService = await addDeploymentSignature(
      sampleServiceDefinition,
      'test-private-key.pem'
    );
    console.log('Service with signature:', JSON.stringify(signedService, null, 2));
    
    // Test 4: Add signature to service definition using key string
    console.log('\nTest 4: Add signature to service definition using key string');
    const signedService2 = addDeploymentSignatureFromKey(
      sampleServiceDefinition,
      privateKey
    );
    console.log('Service with signature:', JSON.stringify(signedService2, null, 2));
    
    // Test 5: Use environment variable for signing (CodeEngine approach)
    console.log('\nTest 5: Use environment variable for signing (CodeEngine approach)');
    
    // Set the private key as an environment variable
    process.env.PRIVATE_KEY = privateKey;
    
    // Sign the service definition using the environment variable
    const signedService3 = signServiceDefinition(sampleServiceDefinition);
    console.log('Service signed with env var private key:', signedService3.deploymentSignature ? 'Yes' : 'No');
    
    if (signedService3.deploymentSignature) {
      console.log('Signature generated:', signedService3.deploymentSignature);
      
      // Verify the signature
      const isValid3 = verifyDeploymentSignatureFromKey(
        signedService3.deployment,
        signedService3.deploymentSignature,
        publicKey
      );
      console.log('Signature valid:', isValid3);
    } else {
      console.log('No signature was generated. Make sure PRIVATE_KEY environment variable is set.');
    }
    
    // Clean up
    await fs.unlink('test-private-key.pem');
    await fs.unlink('test-public-key.pem');
    delete process.env.PRIVATE_KEY;
    console.log('\nTest keys removed');
    
    console.log('\nAll tests completed successfully!');
  } catch (error) {
    console.error('Error during tests:', error);
  }
}

// Run the tests
runTests();

// Made with Bob
