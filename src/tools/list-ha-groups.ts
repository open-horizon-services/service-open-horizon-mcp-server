/**
 * list-ha-groups.ts
 * 
 * MCP tool for listing all high availability groups in the Open Horizon Exchange
 */

import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { makeHttpRequest, getErrorMessage, getExchangeParams } from '../services/common';

/**
 * Register the list-ha-groups tool with the MCP server
 */
export function registerListHaGroups(server: McpServer) {
  const toolName = 'list-ha-groups';
  const toolDescription = `
    Use this tool to list all high availability (HA) groups in the Open Horizon Exchange.
    You can filter by organization if needed.
    
    HA groups allow you to group nodes together for high availability purposes.
    Nodes in the same HA group will coordinate to ensure service availability.
  `;
  const toolSchema = {
    org: z.string().optional().describe('Organization ID. If not provided, uses the default organization.'),
  };
  
  const toolCallback = async (params: any, context: any): Promise<any> => {
    try {
      // Access headers from the shared context
      const {url, credential, organization} = getExchangeParams(params, context);
      const exchangeUrl = `${url}/orgs/${organization}/hagroups`;
      
      console.log(`Fetching HA groups from Exchange at ${exchangeUrl}`);
      const response = await makeHttpRequest(exchangeUrl, {
        Authorization: `Basic ${credential}`
      });
      
      // If response has content property, it's already formatted as ToolResponse (error case)
      if (response && typeof response === 'object' && 'content' in response) {
        return response;
      }
      
      // Format the response in a user-friendly way
      let formattedResponse = `# High Availability Groups in Organization: ${organization}\n\n`;
      
      if (typeof response === 'object' && response !== null) {
        const groupCount = Object.keys(response).length;
        formattedResponse += `Found ${groupCount} HA groups.\n\n`;
        
        if (groupCount > 0) {
          formattedResponse += `## HA Group List\n\n`;
          
          for (const [groupId, groupData] of Object.entries(response)) {
            const group = groupData as Record<string, any>;
            const description = group.description || 'No Description';
            
            formattedResponse += `### ${groupId}\n`;
            formattedResponse += `- **Description**: ${description}\n`;
            
            // Add creation and modification times if available
            if (group.created) {
              formattedResponse += `- **Created**: ${new Date(group.created).toLocaleString()}\n`;
            }
            if (group.lastUpdated) {
              formattedResponse += `- **Last Updated**: ${new Date(group.lastUpdated).toLocaleString()}\n`;
            }
            
            // Add node count if available
            if (group.members && typeof group.members === 'object' && group.members !== null) {
              const nodeCount = Object.keys(group.members).length;
              formattedResponse += `- **Node Count**: ${nodeCount}\n`;
              
              if (nodeCount > 0) {
                formattedResponse += `- **Nodes**:\n`;
                for (const nodeId of Object.keys(group.members)) {
                  formattedResponse += `  - ${nodeId}\n`;
                }
              }
            }
            
            formattedResponse += '\n';
          }
        } else {
          formattedResponse += `No HA groups found in organization ${organization}.\n`;
        }
      } else {
        // If response is not an object, just return it as is
        formattedResponse += JSON.stringify(response, null, 2);
      }
      
      return {
        content: [
          {
            type: 'text',
            text: formattedResponse
          }
        ]
      };
    } catch (error) {
      console.error(`Error listing HA groups: ${error}`);
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