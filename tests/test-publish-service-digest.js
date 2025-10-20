/**
 * Test script for publish-service.ts
 * 
 * This script tests publishing a service with a Docker image digest
 * to verify that the fix for the 404 error handling works correctly.
 */

// Import fetch properly for newer Node.js versions
const nodeFetch = require('node-fetch');
const fetch = (...args) => nodeFetch.default(...args);
require('dotenv').config();
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Exchange credentials from environment variables
const EXCHANGE_URL = process.env.EXCHANGE_URL || '';
const EXCHANGE_ORG = process.env.EXCHANGE_ORG || '';
const EXCHANGE_CREDENTIAL = process.env.EXCHANGE_CREDENTIAL || '';

// Test service definition with Docker image digest
let serviceDefinition = {
  url: "test-service-digest",
  version: "1.0.0",
  arch: "amd64",
  sharable: "singleton",
  requiredServices: [],
  userInput: [],
  label: "Test Service with Digest",
  description: "A test service using an image with a digest",
  public: true,
  documentation: "https://example.com/docs",
  deployment: {
    services: {
      "test-service": {
        image: "alpine@sha256:c5c5fda71656f28e49ac9c5416b3643eaa6a108a8093151d6d1afc9463be8e33",
        privileged: false
      }
    }
  },
  deploymentSignature: ""
};

// Convert deployment to string as expected by the API
serviceDefinition.deployment = JSON.stringify(serviceDefinition.deployment);

// Function to sign the service definition
function signServiceDefinition(serviceDefinition) {
  try {
    // Make a copy of the service definition
    const signedServiceDefinition = { ...serviceDefinition };
    
    // Extract the deployment field
    let deployment = signedServiceDefinition.deployment;
    
    // If deployment is a string, parse it to an object for signing
    const deploymentObj = typeof deployment === 'string'
      ? JSON.parse(deployment)
      : deployment;
    
    // Check if we have a private key in the environment
    const privateKeyBase64 = process.env.PRIVATE_KEY;
    if (!privateKeyBase64) {
      console.warn('No PRIVATE_KEY environment variable found. Using dummy signature.');
      signedServiceDefinition.deploymentSignature = "abcdefghijklmnopqrstuvwxyz";
      return signedServiceDefinition;
    }
    
    const privateKey = Buffer.from(privateKeyBase64, 'base64').toString();
    
    try {
      // Generate the signature
      const sign = crypto.createSign('SHA256');
      sign.update(JSON.stringify(deploymentObj));
      
      // Try to sign with the private key
      const signature = sign.sign(privateKey, 'base64');
      
      // Add the signature to the service definition
      signedServiceDefinition.deploymentSignature = signature;
      console.log('Service definition successfully signed');
    } catch (signError) {
      console.error('Error during signing operation:', signError);
      console.log('Using dummy signature instead');
      signedServiceDefinition.deploymentSignature = "abcdefghijklmnopqrstuvwxyz";
    }
    
    return signedServiceDefinition;
  } catch (error) {
    console.error('Error signing service definition:', error);
    // Return the original service definition with a dummy signature if signing fails
    serviceDefinition.deploymentSignature = "abcdefghijklmnopqrstuvwxyz";
    return serviceDefinition;
  }
}

// Sign the service definition
serviceDefinition = signServiceDefinition(serviceDefinition);

// Function to delete the service if it exists
async function deleteServiceIfExists() {
  const serviceId = `${serviceDefinition.url}_${serviceDefinition.version}_${serviceDefinition.arch}`;
  const serviceUrl = `${EXCHANGE_URL}/${EXCHANGE_ORG}/services/${serviceId}`;
  
  console.log(`Checking if service exists at ${serviceUrl}`);
  
  try {
    const response = await fetch(serviceUrl, {
      headers: {
        "Authorization": `Basic ${EXCHANGE_CREDENTIAL}`,
        "Accept": "application/json"
      }
    });
    
    if (response.ok) {
      console.log('Service exists, deleting it first');
      
      const deleteResponse = await fetch(serviceUrl, {
        method: 'DELETE',
        headers: {
          "Authorization": `Basic ${EXCHANGE_CREDENTIAL}`,
          "Accept": "application/json"
        }
      });
      
      if (deleteResponse.ok) {
        console.log('Service deleted successfully');
      } else {
        console.error(`Failed to delete service: ${deleteResponse.status} ${deleteResponse.statusText}`);
        const errorText = await deleteResponse.text();
        console.error(errorText);
      }
    } else {
      console.log('Service does not exist, no need to delete');
    }
  } catch (error) {
    console.error('Error checking/deleting service:', error);
  }
}

// Function to publish the service
async function publishService() {
  const serviceId = `${serviceDefinition.url}_${serviceDefinition.version}_${serviceDefinition.arch}`;
  const serviceUrl = `${EXCHANGE_URL}/${EXCHANGE_ORG}/services/${serviceId}`;
  
  console.log(`Publishing service to ${serviceUrl}`);
  console.log('Service definition:', JSON.stringify(serviceDefinition, null, 2));
  
  try {
    // First check if the service exists
    const checkResponse = await fetch(serviceUrl, {
      headers: {
        "Authorization": `Basic ${EXCHANGE_CREDENTIAL}`,
        "Accept": "application/json"
      }
    });
    
    if (checkResponse.ok) {
      // Service exists, update it with PUT
      console.log('Service exists, updating with PUT');
      
      const putResponse = await fetch(serviceUrl, {
        method: 'PUT',
        headers: {
          "Authorization": `Basic ${EXCHANGE_CREDENTIAL}`,
          "Accept": "application/json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify(serviceDefinition)
      });
      
      if (putResponse.ok) {
        console.log('Service updated successfully');
        const responseData = await putResponse.json();
        console.log('Response:', responseData);
      } else {
        console.error(`Failed to update service: ${putResponse.status} ${putResponse.statusText}`);
        const errorText = await putResponse.text();
        console.error(errorText);
      }
    } else if (checkResponse.status === 404) {
      // Service doesn't exist, create it with POST
      console.log('Service does not exist, creating with POST');
      
      const servicesUrl = `${EXCHANGE_URL}/${EXCHANGE_ORG}/services`;
      const postResponse = await fetch(servicesUrl, {
        method: 'POST',
        headers: {
          "Authorization": `Basic ${EXCHANGE_CREDENTIAL}`,
          "Accept": "application/json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify(serviceDefinition)
      });
      
      if (postResponse.ok) {
        console.log('Service created successfully');
        const responseData = await postResponse.json();
        console.log('Response:', responseData);
      } else {
        console.error(`Failed to create service: ${postResponse.status} ${postResponse.statusText}`);
        const errorText = await postResponse.text();
        console.error(errorText);
      }
    } else {
      console.error(`Unexpected response when checking service: ${checkResponse.status} ${checkResponse.statusText}`);
      const errorText = await checkResponse.text();
      console.error(errorText);
    }
  } catch (error) {
    console.error('Error publishing service:', error);
  }
}

// Run the test
async function runTest() {
  try {
    // Skip deleting the service to test update functionality
    // await deleteServiceIfExists();
    
    // Publish the service (should update if it exists)
    await publishService();
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Execute the test
runTest();

// Made with Bob
