/**
 * get-service-details.ts
 * 
 * MCP tool for showing details of a specific service in the Open Horizon Exchange
 */

import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { makeHttpRequest, getErrorMessage, getExchangeParams } from '../services/common';

/**
 * Register the get-service-details tool with the MCP server
 */
export function registerGetServiceDetailsTool(server: McpServer) {
  const toolName = 'get-service-details';
  const toolDescription = `
    Use this tool to get detailed information about a specific service in the Open Horizon Exchange.
    You need to provide the service name.
    
    IMPORTANT: Service names must be provided in full and should never be truncated or simplified.
    Service names often include organization, name, version and architecture like "playground/liquid-prep-express_1.0.10_arm64".
    
    Do NOT:
    - Truncate or simplify long names
    - Assume only the last word is the name
    - Omit names even if they look complex
  `;
  const toolSchema = {
    name: z.string().describe('The name of the service'),
    org: z.string().optional().describe('Organization ID. If not provided, uses the default organization.'),
  };
  
  const toolCallback = async (params: any, context: any): Promise<any> => {
    try {
      const { name } = params;
      // Access headers from the shared context
      const {url, credential, organization} = getExchangeParams(params, context);
      
      if (!name) {
        return getErrorMessage("Service name is required");
      }
      
      const exchangeUrl = `${url}/${organization}/services/${name}`;
      
      console.log(`Fetching service details from Exchange at ${exchangeUrl}`);
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
      console.error(`Error getting service details: ${error}`);
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
