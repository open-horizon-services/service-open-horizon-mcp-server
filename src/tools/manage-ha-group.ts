/**
 * manage-ha-group.ts
 * 
 * MCP tool for managing (get, create, update, delete) a high availability group in the Open Horizon Exchange
 */

import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { makeHttpRequest, makePostRequest, makeDeleteRequest, getErrorMessage, getExchangeParams } from '../services/common';

/**
 * Register the manage-ha-group tool with the MCP server
 */
export function registerManageHaGroup(server: McpServer) {
  const toolName = 'manage-ha-group';
  const toolDescription = `
    Use this tool to manage a high availability (HA) group in the Open Horizon Exchange.
    
    You can:
    1. Get details of a specific HA group
    2. Create a new HA group
    3. Update an existing HA group
    4. Delete an HA group
    
    For create and update operations, you need to provide a group JSON object.
    
    Example group JSON structure:
    {
      "description": "Description of the HA group",
      "members": {}
    }
    
    Note: Members are added to the HA group using the manage-ha-group-node tool.
  `;
  const toolSchema = {
    name: z.string().describe('The name of the HA group'),
    operation: z.enum(['get', 'create', 'update', 'delete']).describe('The operation to perform on the HA group'),
    group: z.any().optional().describe('The HA group JSON object (required for create and update operations)'),
    org: z.string().optional().describe('Organization ID. If not provided, uses the default organization.'),
  };
  
  const toolCallback = async (params: any, context: any): Promise<any> => {
    try {
      const { name, operation } = params;
      // Access headers from the shared context
      const {url, credential, organization} = getExchangeParams(params, context);
      
      if (!name) {
        return getErrorMessage("HA group name is required");
      }
      
      if (!operation) {
        return getErrorMessage("Operation is required (get, create, update, or delete)");
      }
      
      const groupUrl = `${url}/orgs/${organization}/hagroups/${name}`;
      
      // Handle different operations
      switch (operation.toLowerCase()) {
        case 'get':
          console.log(`Getting HA group from: ${groupUrl}`);
          const getResponse = await makeHttpRequest(groupUrl, {
            Authorization: `Basic ${credential}`
          });
          
          // If response has content property, it's an error
          if (getResponse && typeof getResponse === 'object' && 'content' in getResponse) {
            return getResponse;
          }
          
          // Format the response
          let formattedGetResponse = `# HA Group: ${name}\n\n`;
          
          if (typeof getResponse === 'object' && getResponse !== null) {
            const description = getResponse.description || 'No Description';
            
            formattedGetResponse += `- **Description**: ${description}\n\n`;
            
            // Add creation and modification times if available
            if (getResponse.created) {
              formattedGetResponse += `- **Created**: ${new Date(getResponse.created).toLocaleString()}\n`;
            }
            if (getResponse.lastUpdated) {
              formattedGetResponse += `- **Last Updated**: ${new Date(getResponse.lastUpdated).toLocaleString()}\n`;
            }
            
            // Add members if available
            if (getResponse.members && typeof getResponse.members === 'object' && getResponse.members !== null) {
              const nodeCount = Object.keys(getResponse.members).length;
              formattedGetResponse += `\n## Members (${nodeCount})\n\n`;
              
              if (nodeCount > 0) {
                formattedGetResponse += `| Node ID | Added |\n`;
                formattedGetResponse += `|---------|-------|\n`;
                
                for (const [nodeId, nodeData] of Object.entries(getResponse.members)) {
                  const node = nodeData as Record<string, any>;
                  const added = node.added ? new Date(node.added).toLocaleString() : 'Unknown';
                  formattedGetResponse += `| ${nodeId} | ${added} |\n`;
                }
                formattedGetResponse += '\n';
              } else {
                formattedGetResponse += `No nodes in this HA group.\n\n`;
              }
            }
            
            // Add raw JSON
            formattedGetResponse += `\n## Raw JSON\n\n\`\`\`json\n${JSON.stringify(getResponse, null, 2)}\n\`\`\`\n`;
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
          if (!params.group) {
            return getErrorMessage("Group JSON is required for create operation");
          }
          
          // Ensure group is an object
          let createGroup;
          if (typeof params.group === 'string') {
            try {
              createGroup = JSON.parse(params.group);
            } catch (e) {
              console.error('Error parsing group JSON:', e);
              return getErrorMessage("Failed to parse group JSON");
            }
          } else {
            createGroup = params.group;
          }
          
          // Ensure the group has a description
          if (!createGroup.description) {
            createGroup.description = `HA group ${name}`;
          }
          
          // Ensure the group has an empty members object if not provided
          if (!createGroup.members) {
            createGroup.members = {};
          }
          
          console.log(`Creating HA group at: ${groupUrl}`);
          const createResponse = await makePostRequest(groupUrl, createGroup, {
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
                text: `Successfully created HA group "${name}" in organization ${organization}.`
              },
              {
                type: 'text',
                text: `Group: ${JSON.stringify(createGroup, null, 2)}`
              }
            ]
          };
          
        case 'update':
          if (!params.group) {
            return getErrorMessage("Group JSON is required for update operation");
          }
          
          // Ensure group is an object
          let updateGroup;
          if (typeof params.group === 'string') {
            try {
              updateGroup = JSON.parse(params.group);
            } catch (e) {
              console.error('Error parsing group JSON:', e);
              return getErrorMessage("Failed to parse group JSON");
            }
          } else {
            updateGroup = params.group;
          }
          
          console.log(`Updating HA group at: ${groupUrl}`);
          const updateResponse = await makePostRequest(groupUrl, updateGroup, {
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
                text: `Successfully updated HA group "${name}" in organization ${organization}.`
              },
              {
                type: 'text',
                text: `Updated group: ${JSON.stringify(updateGroup, null, 2)}`
              }
            ]
          };
          
        case 'delete':
          console.log(`Deleting HA group at: ${groupUrl}`);
          const deleteResponse = await makeDeleteRequest(groupUrl, {
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
                text: `Successfully deleted HA group "${name}" from organization ${organization}.`
              }
            ]
          };
          
        default:
          return getErrorMessage(`Invalid operation: ${operation}. Must be one of: get, create, update, delete`);
      }
    } catch (error) {
      console.error(`Error managing HA group: ${error}`);
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