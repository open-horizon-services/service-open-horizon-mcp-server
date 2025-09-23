/**
 * unregister-node.ts
 * 
 * MCP tool for unregistering a node from the Open Horizon Exchange
 */

import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { makeDeleteRequest, getErrorMessage, getExchangeParams } from '../services/common';

/**
 * Register the unregister-node tool with the MCP server
 */
export function registerUnregisterNodeTool(server: McpServer) {
  const toolName = 'unregister-node';
  const toolDescription = `
    Use this tool to unregister a node from the Open Horizon Exchange.
    This will remove the node from the Exchange, but will not affect the node itself.
    To completely remove the node, you would need to run 'hzn unregister' on the node itself.
  `;
  const toolSchema = {
    name: z.string().describe('The name of the node to unregister'),
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
      
      const exchangeUrl = `${url}/${organization}/nodes/${name}`;
      
      console.log(`Unregistering node from Exchange at ${exchangeUrl}`);
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
            text: `Successfully unregistered node "${name}" from organization ${organization}.`
          }
        ]
      };
    } catch (error) {
      console.error(`Error unregistering node: ${error}`);
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
