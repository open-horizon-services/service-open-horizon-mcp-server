/**
 * manage-deployment-policy.ts
 * 
 * MCP tool for managing (get, create, update, delete) a deployment policy in the Open Horizon Exchange
 */

import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { makeHttpRequest, makePostRequest, makeDeleteRequest, getErrorMessage, getExchangeParams } from '../services/common';

/**
 * Register the manage-deployment-policy tool with the MCP server
 */
export function registerManageDeploymentPolicy(server: McpServer) {
  const toolName = 'manage-deployment-policy';
  const toolDescription = `
    Use this tool to manage a deployment policy in the Open Horizon Exchange.
    
    You can:
    1. Get details of a specific deployment policy
    2. Create a new deployment policy
    3. Update an existing deployment policy
    4. Delete a deployment policy
    
    For create and update operations, you need to provide a policy JSON object.
    
    Example policy JSON structure:
    {
      "label": "human readable name of the deployment policy",
      "description": "policy description",
      "service": {
        "name": "service-name",
        "org": "service-org",
        "arch": "amd64",
        "serviceVersions": [
          {
            "version": "1.0.0",
            "priority": {
              "priority_value": 5,
              "retries": 1,
              "retry_durations": 3600,
              "verified_durations": 52
            }
          }
        ]
      },
      "properties": [
        {
          "name": "example.property",
          "value": "property value"
        }
      ],
      "constraints": [
        "example == true"
      ],
      "userInput": [
        {
          "serviceOrgid": "service-org",
          "serviceUrl": "service-name",
          "serviceArch": "amd64",
          "serviceVersionRange": "1.0.0",
          "inputs": [
            {
              "name": "VAR1",
              "value": "value1"
            }
          ]
        }
      ]
    }
  `;
  const toolSchema = {
    name: z.string().describe('The name of the deployment policy'),
    operation: z.enum(['get', 'create', 'update', 'delete']).describe('The operation to perform on the deployment policy'),
    policy: z.any().optional().describe('The deployment policy JSON object (required for create and update operations)'),
    org: z.string().optional().describe('Organization ID. If not provided, uses the default organization.'),
  };
  
  const toolCallback = async (params: any, context: any): Promise<any> => {
    try {
      const { name, operation } = params;
      // Access headers from the shared context
      const {url, credential, organization} = getExchangeParams(params, context);
      
      if (!name) {
        return getErrorMessage("Deployment policy name is required");
      }
      
      if (!operation) {
        return getErrorMessage("Operation is required (get, create, update, or delete)");
      }
      
      const policyUrl = `${url}/${organization}/business/policies/${name}`;
      
      // Handle different operations
      switch (operation.toLowerCase()) {
        case 'get':
          console.log(`Getting deployment policy from: ${policyUrl}`);
          const getResponse = await makeHttpRequest(policyUrl, {
            Authorization: `Basic ${credential}`
          });
          
          // If response has content property, it's an error
          if (getResponse && typeof getResponse === 'object' && 'content' in getResponse) {
            return getResponse;
          }
          
          // Format the response
          let formattedGetResponse = `# Deployment Policy: ${name}\n\n`;
          
          if (typeof getResponse === 'object' && getResponse !== null) {
            const label = getResponse.label || 'No Label';
            const description = getResponse.description || 'No Description';
            
            formattedGetResponse += `- **Label**: ${label}\n`;
            formattedGetResponse += `- **Description**: ${description}\n\n`;
            
            // Add creation and modification times if available
            if (getResponse.created) {
              formattedGetResponse += `- **Created**: ${new Date(getResponse.created).toLocaleString()}\n`;
            }
            if (getResponse.lastUpdated) {
              formattedGetResponse += `- **Last Updated**: ${new Date(getResponse.lastUpdated).toLocaleString()}\n`;
            }
            
            // Add service information if available
            if (getResponse.service) {
              formattedGetResponse += `\n## Service\n\n`;
              formattedGetResponse += `- **Name**: ${getResponse.service.name}\n`;
              formattedGetResponse += `- **Organization**: ${getResponse.service.org}\n`;
              formattedGetResponse += `- **Architecture**: ${getResponse.service.arch}\n`;
              
              if (getResponse.service.serviceVersions && getResponse.service.serviceVersions.length > 0) {
                formattedGetResponse += `\n### Service Versions\n\n`;
                for (const version of getResponse.service.serviceVersions) {
                  formattedGetResponse += `- **Version**: ${version.version}\n`;
                  if (version.priority) {
                    formattedGetResponse += `  - **Priority**: ${version.priority.priority_value}\n`;
                    formattedGetResponse += `  - **Retries**: ${version.priority.retries}\n`;
                    formattedGetResponse += `  - **Retry Duration**: ${version.priority.retry_durations}\n`;
                    formattedGetResponse += `  - **Verified Duration**: ${version.priority.verified_durations}\n`;
                  }
                }
              }
            }
            
            // Add constraints if available
            if (getResponse.constraints && Array.isArray(getResponse.constraints) && getResponse.constraints.length > 0) {
              formattedGetResponse += `\n## Constraints\n\n`;
              for (const constraint of getResponse.constraints) {
                formattedGetResponse += `- ${constraint}\n`;
              }
              formattedGetResponse += '\n';
            }
            
            // Add properties if available
            if (getResponse.properties && Array.isArray(getResponse.properties) && getResponse.properties.length > 0) {
              formattedGetResponse += `\n## Properties\n\n`;
              formattedGetResponse += `| Name | Value |\n`;
              formattedGetResponse += `|------|-------|\n`;
              for (const prop of getResponse.properties) {
                formattedGetResponse += `| ${prop.name} | ${prop.value} |\n`;
              }
              formattedGetResponse += '\n';
            }
            
            // Add user input if available
            if (getResponse.userInput && Array.isArray(getResponse.userInput) && getResponse.userInput.length > 0) {
              formattedGetResponse += `\n## User Input\n\n`;
              for (const input of getResponse.userInput) {
                formattedGetResponse += `### Service: ${input.serviceUrl} (${input.serviceOrgid}/${input.serviceArch})\n`;
                formattedGetResponse += `- **Version Range**: ${input.serviceVersionRange}\n`;
                
                if (input.inputs && input.inputs.length > 0) {
                  formattedGetResponse += `- **Variables**:\n`;
                  for (const variable of input.inputs) {
                    formattedGetResponse += `  - ${variable.name}: ${variable.value}\n`;
                  }
                }
                formattedGetResponse += '\n';
              }
            }
            
            // Add raw JSON
            formattedGetResponse += `\n## Raw JSON\n\n\`\`\`json\n${JSON.stringify(getResponse, null, 2)}\n\`\`\`\n`;
          } else if (typeof getResponse === 'string') {
            formattedGetResponse += getResponse;
          } else {
            formattedGetResponse += JSON.stringify(getResponse, null, 2);
          }
          
          return {
            content: [
              {
                type: 'text',
                text: formattedGetResponse
              }
            ]
          };
          
        case 'create':
          if (!params.policy) {
            return getErrorMessage("Policy JSON is required for create operation");
          }
          
          // Ensure policy is an object
          let createPolicy;
          if (typeof params.policy === 'string') {
            try {
              createPolicy = JSON.parse(params.policy);
            } catch (e) {
              console.error('Error parsing policy JSON:', e);
              return getErrorMessage("Failed to parse policy JSON");
            }
          } else {
            createPolicy = params.policy;
          }
          
          console.log(`Creating deployment policy at: ${policyUrl}`);
          const createResponse = await makePostRequest(policyUrl, createPolicy, {
            Authorization: `Basic ${credential}`
          }, 'POST');
          
          // If response has content property, it's an error
          if (createResponse && typeof createResponse === 'object' && 'content' in createResponse) {
            return createResponse;
          }
          
          return {
            content: [
              {
                type: 'text',
                text: `Successfully created deployment policy "${name}" in organization ${organization}.`
              },
              {
                type: 'text',
                text: `Policy: ${JSON.stringify(createPolicy, null, 2)}`
              }
            ]
          };
          
        case 'update':
          if (!params.policy) {
            return getErrorMessage("Policy JSON is required for update operation");
          }
          
          // Ensure policy is an object
          let updatePolicy;
          if (typeof params.policy === 'string') {
            try {
              updatePolicy = JSON.parse(params.policy);
            } catch (e) {
              console.error('Error parsing policy JSON:', e);
              return getErrorMessage("Failed to parse policy JSON");
            }
          } else {
            updatePolicy = params.policy;
          }
          
          console.log(`Updating deployment policy at: ${policyUrl}`);
          const updateResponse = await makePostRequest(policyUrl, updatePolicy, {
            Authorization: `Basic ${credential}`
          }, 'PUT');
          
          // If response has content property, it's an error
          if (updateResponse && typeof updateResponse === 'object' && 'content' in updateResponse) {
            return updateResponse;
          }
          
          return {
            content: [
              {
                type: 'text',
                text: `Successfully updated deployment policy "${name}" in organization ${organization}.`
              },
              {
                type: 'text',
                text: `Updated policy: ${JSON.stringify(updatePolicy, null, 2)}`
              }
            ]
          };
          
        case 'delete':
          console.log(`Deleting deployment policy at: ${policyUrl}`);
          const deleteResponse = await makeDeleteRequest(policyUrl, {
            Authorization: `Basic ${credential}`
          });
          
          // If response has content property, it's an error
          if (deleteResponse && typeof deleteResponse === 'object' && 'content' in deleteResponse) {
            return deleteResponse;
          }
          
          return {
            content: [
              {
                type: 'text',
                text: `Successfully deleted deployment policy "${name}" from organization ${organization}.`
              }
            ]
          };
          
        default:
          return getErrorMessage(`Invalid operation: ${operation}. Must be one of: get, create, update, delete`);
      }
    } catch (error) {
      console.error(`Error managing deployment policy: ${error}`);
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