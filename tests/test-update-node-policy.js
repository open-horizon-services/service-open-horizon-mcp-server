/**
 * Test script for the update-node-policy tool
 */

const axios = require('axios');
require('dotenv').config();

// Get environment variables
const EXCHANGE_URL = process.env.EXCHANGE_URL;
const EXCHANGE_ORG = process.env.EXCHANGE_ORG;
const EXCHANGE_CREDENTIAL = process.env.EXCHANGE_CREDENTIAL;

// Test node name - replace with an actual node in your environment
const NODE_NAME = 'dragon-thigh';

async function testUpdateNodePolicy() {
  try {
    console.log('Testing update-node-policy tool...');
    
    // First, get the current policy to verify it later
    console.log(`Getting current policy for node ${NODE_NAME}...`);
    const getCurrentUrl = `${EXCHANGE_URL}/${EXCHANGE_ORG}/nodes/${NODE_NAME}/policy`;
    
    const currentPolicyResponse = await axios.get(getCurrentUrl, {
      headers: {
        Authorization: `Basic ${EXCHANGE_CREDENTIAL}`
      }
    });
    
    console.log('Current policy:');
    console.log(JSON.stringify(currentPolicyResponse.data, null, 2));
    
    // Update the policy with a new deployment property
    console.log('\nUpdating node policy...');
    const updateUrl = `${EXCHANGE_URL}/${EXCHANGE_ORG}/nodes/${NODE_NAME}/policy`;
    
    // Get the current policy and add the new property
    const updatedPolicy = currentPolicyResponse.data;
    
    // Ensure deployment and properties exist
    if (!updatedPolicy.deployment) {
      updatedPolicy.deployment = {};
    }
    
    if (!updatedPolicy.deployment.properties) {
      updatedPolicy.deployment.properties = [];
    }
    
    // Add or update the web-hello-python property
    const newProperty = {
      name: 'web-hello-python',
      value: 'Web Hello Python'
    };
    
    const existingPropIndex = updatedPolicy.deployment.properties.findIndex(
      prop => prop.name === newProperty.name
    );
    
    if (existingPropIndex >= 0) {
      updatedPolicy.deployment.properties[existingPropIndex].value = newProperty.value;
    } else {
      updatedPolicy.deployment.properties.push(newProperty);
    }
    
    // Update the policy
    await axios.put(updateUrl, updatedPolicy, {
      headers: {
        Authorization: `Basic ${EXCHANGE_CREDENTIAL}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Policy updated successfully');
    
    // Verify the update
    console.log('\nVerifying updated policy...');
    const verifyResponse = await axios.get(getCurrentUrl, {
      headers: {
        Authorization: `Basic ${EXCHANGE_CREDENTIAL}`
      }
    });
    
    console.log('Updated policy:');
    console.log(JSON.stringify(verifyResponse.data, null, 2));
    
    // Check if the property was added
    const webHelloPython = verifyResponse.data.deployment?.properties?.find(
      prop => prop.name === 'web-hello-python'
    );
    
    if (webHelloPython) {
      console.log('\nSuccess! The web-hello-python property was added:');
      console.log(JSON.stringify(webHelloPython, null, 2));
    } else {
      console.log('\nError: The web-hello-python property was not found in the updated policy');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
  }
}

testUpdateNodePolicy();

// Made with Bob
