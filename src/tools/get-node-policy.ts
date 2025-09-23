/**
 * get-node-policy.ts
 * 
 * MCP tool for showing the policy for a specific node in the Open Horizon Exchange
 */

import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { makeHttpRequest, getErrorMessage, getExchangeParams } from '../services/common';

/**
 * Register the get-node-policy tool with the MCP server
 */
export function registerGetNodePolicyTool(server: McpServer) {
  const toolName = 'get-node-policy';
  const toolDescription = `
    Use this tool to get the policy for a specific node in the Open Horizon Exchange.
    You need to provide the node name.
    
    IMPORTANT: Node names must be provided in full and should never be truncated or simplified.
    Node names often include complex identifiers like "edge-device-001" or "witty-anoa".
    
    Do NOT:
    - Truncate or simplify long names
    - Assume only the last word is the name
    - Omit names even if they look complex
  `;
  const toolSchema = {
    name: z.string().describe('The name of the node'),
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
      
      const exchangeUrl = `${url}/${organization}/nodes/${name}/policy`;
      
      console.log(`Fetching node policy from Exchange at ${exchangeUrl}`);
      const response = await makeHttpRequest(exchangeUrl, {
        Authorization: `Basic ${credential}`
      });
      
      // If response has content property, it's already formatted as ToolResponse (error case)
      if (response && typeof response === 'object' && 'content' in response) {
        return response;
      }
      
      // Otherwise, wrap the successful response in proper MCP format
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(response, null, 2)
          }
        ]
      };
    } catch (error) {
      console.error(`Error getting node policy: ${error}`);
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
