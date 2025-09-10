/**
 * list-services.ts
 * 
 * MCP tool for listing all services in the Open Horizon Exchange
 */

import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { makeHttpRequest, getErrorMessage } from '../services/common';
import 'dotenv/config';

const EXCHANGE_URL = process.env.EXCHANGE_URL;
const ORG = process.env.EXCHANGE_ORG;

/**
 * Register the list-services tool with the MCP server
 */
export function registerListServicesTool(server: McpServer) {
  const toolName = 'list-services';
  const toolDescription = `
    Use this tool to list all services in the Open Horizon Exchange.
    You can filter by organization if needed.
    
    IMPORTANT: Service names are displayed in full and should never be truncated or simplified.
    Service names often include organization, name, version and architecture like "playground/liquid-prep-express_1.0.10_arm64".
  `;
  const toolSchema = {
    org: z.string().optional().describe('Organization ID. If not provided, uses the default organization.'),
  };
  
  const toolCallback = async (params: any): Promise<any> => {
    try {
      const organization = params.org || ORG;
      const exchangeUrl = `${EXCHANGE_URL}/${organization}/services`;
      
      console.log(`Fetching services from Exchange at ${exchangeUrl}`);
      const response = await makeHttpRequest(exchangeUrl, {
        Authorization: `Basic ${process.env.EXCHANGE_CREDENTIAL}`
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
      console.error(`Error listing services: ${error}`);
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
