/**
 * update-node-policy.ts
 *
 * MCP tool for updating a node policy in the Open Horizon Exchange
 */

import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { makeHttpRequest, makePostRequest, getErrorMessage, getExchangeParams } from '../services/common';

/**
 * Register the update-node-policy tool with the MCP server
 */
export function registerUpdateNodePolicyTool(server: McpServer) {
  const toolName = 'update-node-policy';
  const toolDescription = `
    Use this tool to update a node policy in the Open Horizon Exchange.
    
    You can either:
    1. Provide a complete policy as JSON to replace the existing policy
    2. Add or update a deployment property in the existing policy
    
    For option 1, the policy JSON can include:
    - label: Human readable name of the node policy
    - description: Policy description
    - properties: Array of node properties (e.g., openhorizon.allowPrivileged, openhorizon.arch)
    - constraints: Array of constraints
    - deployment: Object containing deployment properties and constraints
    - management: Object containing management properties and constraints
    
    For option 2, you need to specify:
    - name: The node name
    - deploymentProperty: The deployment property to add or update (name and value)
    
    Example policy JSON structure:
    {
      "label": "human readable name of the node policy",
      "description": "policy description",
      "properties": [
        {
          "name": "openhorizon.allowPrivileged",
          "value": true
        },
        {
          "name": "openhorizon.arch",
          "value": "amd64"
        }
      ],
      "constraints": [],
      "deployment": {
        "properties": [
          {"name": "mms-agent", "value": "MMS Agent"},
          {"name": "worker-safety", "value": "Worker Safety"}
        ],
        "constraints": []
      },
      "management": {
        "properties": [],
        "constraints": []
      }
    }
  `;
  const toolSchema = {
    name: z.string().describe('The name of the node'),
    policy: z.any().optional().describe('Complete node policy as JSON to replace the existing policy'),
    deploymentProperty: z.object({
      name: z.string().describe('The name of the deployment property'),
      value: z.any().describe('The value of the deployment property')
    }).optional().describe('Deployment property to add or update in the existing policy'),
    org: z.string().optional().describe('Organization ID. If not provided, uses the default organization.'),
  };
  
  const toolCallback = async (params: any, context: any): Promise<any> => {
    try {
      const { name } = params;
      // Access headers from the shared context
      const {url, credential, organization} = getExchangeParams(params, context);
      
      if (!name) {
        return getErrorMessage("Node name is required");
      }
      
      // First get the current policy
      const getCurrentUrl = `${url}/${organization}/nodes/${name}/policy`;
      console.log(`Getting current node policy from: ${getCurrentUrl}`);
      
      const currentPolicyResponse = await makeHttpRequest(getCurrentUrl, {
        Authorization: `Basic ${credential}`
      });
      
      // If response has content property, it's an error
      if (currentPolicyResponse && typeof currentPolicyResponse === 'object' && 'content' in currentPolicyResponse) {
        return currentPolicyResponse;
      }
      
      // Parse the current policy if needed
      let currentPolicy;
      
      // Handle different response types
      if (typeof currentPolicyResponse === 'string') {
        try {
          currentPolicy = JSON.parse(currentPolicyResponse);
        } catch (e) {
          console.error('Error parsing current policy response as JSON:', e);
          return getErrorMessage("Failed to parse current policy response as JSON");
        }
      } else {
        currentPolicy = currentPolicyResponse;
      }
      
      // Ensure currentPolicy is an object
      if (typeof currentPolicy === 'string') {
        try {
          currentPolicy = JSON.parse(currentPolicy);
        } catch (e) {
          console.error('Error parsing current policy string as JSON:', e);
          return getErrorMessage("Failed to parse current policy as JSON");
        }
      }
      
      // Use provided policy or update the current one
      let updatedPolicy;
      
      if (params.policy) {
        // Ensure params.policy is an object
        if (typeof params.policy === 'string') {
          try {
            updatedPolicy = JSON.parse(params.policy);
          } catch (e) {
            console.error('Error parsing provided policy as JSON:', e);
            return getErrorMessage("Failed to parse provided policy as JSON");
          }
        } else {
          updatedPolicy = params.policy;
        }
      } else {
        // Create a deep copy of the current policy
        try {
          updatedPolicy = JSON.parse(JSON.stringify(currentPolicy));
        } catch (e) {
          console.error('Error creating deep copy of current policy:', e);
          return getErrorMessage("Failed to process current policy");
        }
      }
      
      // Final check to ensure updatedPolicy is an object
      if (typeof updatedPolicy === 'string') {
        try {
          updatedPolicy = JSON.parse(updatedPolicy);
        } catch (e) {
          console.error('Error parsing updated policy as JSON:', e);
          return getErrorMessage("Failed to parse updated policy as JSON");
        }
      }
      
      // Log the policy for debugging
      console.log('Current policy type:', typeof currentPolicy);
      console.log('Current policy:', JSON.stringify(currentPolicy, null, 2));
      console.log('Updated policy type:', typeof updatedPolicy);
      console.log('Updated policy:', JSON.stringify(updatedPolicy, null, 2));
      
      // Add or update deployment property if provided
      if (params.deploymentProperty) {
        const { name: propName, value: propValue } = params.deploymentProperty;
        
        // Ensure deployment and properties exist
        if (!updatedPolicy.deployment) {
          updatedPolicy.deployment = {};
        }
        
        if (!updatedPolicy.deployment.properties) {
          updatedPolicy.deployment.properties = [];
        }
        
        // Check if property already exists
        const existingPropIndex = updatedPolicy.deployment.properties.findIndex(
          (prop: any) => prop.name === propName
        );
        
        if (existingPropIndex >= 0) {
          // Update existing property
          updatedPolicy.deployment.properties[existingPropIndex].value = propValue;
        } else {
          // Add new property
          updatedPolicy.deployment.properties.push({
            name: propName,
            value: propValue
          });
        }
      }
      
      // Ensure all required sections exist in the policy
      if (!updatedPolicy.properties) {
        updatedPolicy.properties = [];
      }
      
      if (!updatedPolicy.constraints) {
        updatedPolicy.constraints = [];
      }
      
      if (!updatedPolicy.deployment) {
        updatedPolicy.deployment = {
          properties: [],
          constraints: []
        };
      } else {
        if (!updatedPolicy.deployment.properties) {
          updatedPolicy.deployment.properties = [];
        }
        if (!updatedPolicy.deployment.constraints) {
          updatedPolicy.deployment.constraints = [];
        }
      }
      
      // Add management section if it doesn't exist
      if (!updatedPolicy.management) {
        updatedPolicy.management = {
          properties: [],
          constraints: []
        };
      } else {
        if (!updatedPolicy.management.properties) {
          updatedPolicy.management.properties = [];
        }
        if (!updatedPolicy.management.constraints) {
          updatedPolicy.management.constraints = [];
        }
      }
      
      // Update the node policy
      const updateUrl = `${url}/${organization}/nodes/${name}/policy`;
      console.log(`Updating node policy at: ${updateUrl}`);
      
      const response = await makePostRequest(updateUrl, updatedPolicy, {
        Authorization: `Basic ${credential}`
      }, 'PUT');
      
      // If response has content property, it's already formatted as ToolResponse (error case)
      if (response && typeof response === 'object' && 'content' in response) {
        return response;
      }
      
      // Create a summary of what was updated
      let updateSummary = '';
      
      if (params.policy) {
        updateSummary = 'Replaced the entire node policy with the provided policy.';
      } else if (params.deploymentProperty) {
        updateSummary = `Updated deployment property "${params.deploymentProperty.name}" with value "${params.deploymentProperty.value}".`;
      } else {
        updateSummary = 'Updated node policy structure to ensure all required sections exist.';
      }
      
      return {
        content: [
          {
            type: 'text',
            text: `Successfully updated policy for node "${name}" in organization ${organization}.`
          },
          {
            type: 'text',
            text: updateSummary
          },
          {
            type: 'text',
            text: `Updated policy: ${JSON.stringify(updatedPolicy, null, 2)}`
          }
        ]
      };
    } catch (error) {
      console.error(`Error updating node policy: ${error}`);
      return getErrorMessage(error);
    }
  };
  
  server.tool(
    toolName,
    toolDescription,
    toolSchema,
    toolCallback
  );
}

// Made with Bob
