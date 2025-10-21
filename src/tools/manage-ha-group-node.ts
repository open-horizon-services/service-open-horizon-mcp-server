/**
 * manage-ha-group-node.ts
 * 
 * MCP tool for managing nodes in a high availability group in the Open Horizon Exchange
 */

import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { makePostRequest, makeDeleteRequest, getErrorMessage, getExchangeParams } from '../services/common';

/**
 * Register the manage-ha-group-node tool with the MCP server
 */
export function registerManageHaGroupNode(server: McpServer) {
  const toolName = 'manage-ha-group-node';
  const toolDescription = `
    Use this tool to add or remove nodes from a high availability (HA) group in the Open Horizon Exchange.
    
    You can:
    1. Add a node to an HA group
    2. Remove a node from an HA group
    
    Nodes in the same HA group will coordinate to ensure service availability.
  `;
  const toolSchema = {
    groupName: z.string().describe('The name of the HA group'),
    nodeName: z.string().describe('The name of the node to add or remove'),
    operation: z.enum(['add', 'remove']).describe('The operation to perform (add or remove)'),
    org: z.string().optional().describe('Organization ID. If not provided, uses the default organization.'),
  };
  
  const toolCallback = async (params: any, context: any): Promise<any> => {
    try {
      const { groupName, nodeName, operation } = params;
      // Access headers from the shared context
      const {url, credential, organization} = getExchangeParams(params, context);
      
      if (!groupName) {
        return getErrorMessage("HA group name is required");
      }
      
      if (!nodeName) {
        return getErrorMessage("Node name is required");
      }
      
      if (!operation) {
        return getErrorMessage("Operation is required (add or remove)");
      }
      
      const nodeUrl = `${url}/orgs/${organization}/hagroups/${groupName}/nodes/${nodeName}`;
      
      // Handle different operations
      switch (operation.toLowerCase()) {
        case 'add':
          console.log(`Adding node ${nodeName} to HA group ${groupName} at: ${nodeUrl}`);
          const addResponse = await makePostRequest(nodeUrl, {}, {
            Authorization: `Basic ${credential}`
          }, 'POST');
          
          // If response has content property, it's an error
          if (addResponse && typeof addResponse === 'object' && 'content' in addResponse) {
            return addResponse;
          }
          
          return {
            content: [
              {
                type: 'text',
                text: `Successfully added node "${nodeName}" to HA group "${groupName}" in organization ${organization}.`
              }
            ]
          };
          
        case 'remove':
          console.log(`Removing node ${nodeName} from HA group ${groupName} at: ${nodeUrl}`);
          const removeResponse = await makeDeleteRequest(nodeUrl, {
            Authorization: `Basic ${credential}`
          });
          
          // If response has content property, it's an error
          if (removeResponse && typeof removeResponse === 'object' && 'content' in removeResponse) {
            return removeResponse;
          }
          
          return {
            content: [
              {
                type: 'text',
                text: `Successfully removed node "${nodeName}" from HA group "${groupName}" in organization ${organization}.`
              }
            ]
          };
          
        default:
          return getErrorMessage(`Invalid operation: ${operation}. Must be one of: add, remove`);
      }
    } catch (error) {
      console.error(`Error managing node in HA group: ${error}`);
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