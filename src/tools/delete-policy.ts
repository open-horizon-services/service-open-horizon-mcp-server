/**
 * delete-policy.ts
 * 
 * MCP tool for deleting a deployment policy from the Open Horizon Exchange
 */

import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { makeDeleteRequest, getErrorMessage, getExchangeParams } from '../services/common';

/**
 * Register the delete-policy tool with the MCP server
 */
export function registerDeletePolicyTool(server: McpServer) {
  const toolName = 'delete-policy';
  const toolDescription = `
    Use this tool to delete a deployment policy from the Open Horizon Exchange.
    You need to provide the policy name.
  `;
  const toolSchema = {
    name: z.string().describe('The name of the policy to delete'),
    org: z.string().optional().describe('Organization ID. If not provided, uses the default organization.'),
  };
  
  const toolCallback = async (params: any, context: any): Promise<any> => {
    try {
      const { name } = params;
      // Access headers from the shared context
      const {url, credential, organization} = getExchangeParams(params, context);
      
      if (!name) {
        return getErrorMessage("Policy name is required");
      }
      
      const exchangeUrl = `${url}/${organization}/business/policies/${name}`;
      
      console.log(`Deleting policy from Exchange at ${exchangeUrl}`);
      const response = await makeDeleteRequest(exchangeUrl, {
        Authorization: `Basic ${credential}`
      });
      
      // If response has content property, it's already formatted as ToolResponse (error case)
      if (response && typeof response === 'object' && 'content' in response) {
        return response;
      }
      
      return {
        content: [
          {
            type: 'text',
            text: `Successfully deleted policy "${name}" from organization ${organization}.`
          }
        ]
      };
    } catch (error) {
      console.error(`Error deleting policy: ${error}`);
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
