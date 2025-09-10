/**
 * delete-service.ts
 * 
 * MCP tool for deleting a service from the Open Horizon Exchange
 */

import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { makeDeleteRequest, getErrorMessage } from '../services/common';
import 'dotenv/config';

const EXCHANGE_URL = process.env.EXCHANGE_URL;
const ORG = process.env.EXCHANGE_ORG;

/**
 * Register the delete-service tool with the MCP server
 */
export function registerDeleteServiceTool(server: McpServer) {
  const toolName = 'delete-service';
  const toolDescription = `
    Use this tool to delete a service from the Open Horizon Exchange.
    You need to provide the full service name including version and architecture.
    
    Format: <service-name>_<version>_<arch>
    Example: "my-service_1.0.0_amd64"
  `;
  const toolSchema = {
    name: z.string().describe('The full service name including version and architecture'),
    org: z.string().optional().describe('Organization ID. If not provided, uses the default organization.'),
  };
  
  const toolCallback = async (params: any): Promise<any> => {
    try {
      const { name } = params;
      const organization = params.org || ORG;
      
      if (!name) {
        return getErrorMessage("Service name is required");
      }
      
      const exchangeUrl = `${EXCHANGE_URL}/${organization}/services/${name}`;
      
      console.log(`Deleting service from Exchange at ${exchangeUrl}`);
      const response = await makeDeleteRequest(exchangeUrl, {
        Authorization: `Basic ${process.env.EXCHANGE_CREDENTIAL}`
      });
      
      // If response has content property, it's already formatted as ToolResponse (error case)
      if (response && typeof response === 'object' && 'content' in response) {
        return response;
      }
      
      return {
        content: [
          {
            type: 'text',
            text: `Successfully deleted service "${name}" from organization ${organization}.`
          }
        ]
      };
    } catch (error) {
      console.error(`Error deleting service: ${error}`);
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
