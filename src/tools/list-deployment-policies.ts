/**
 * list-deployment-policies.ts
 * 
 * MCP tool for listing all deployment policies in the Open Horizon Exchange
 */

import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { makeHttpRequest, getErrorMessage, getExchangeParams } from '../services/common';

/**
 * Register the list-deployment-policies tool with the MCP server
 */
export function registerListDeploymentPolicies(server: McpServer) {
  const toolName = 'list-deployment-policies';
  const toolDescription = `
    Use this tool to list all deployment policies in the Open Horizon Exchange.
    Deployment policies define which services should be deployed to which nodes.
    You can filter by organization if needed.
    
    IMPORTANT: Policy names are displayed in full and should never be truncated or simplified.
    Policy names often include complex identifiers like "policy-chunk-saved-model-service_arm64".
  `;
  const toolSchema = {
    org: z.string().optional().describe('Organization ID. If not provided, uses the default organization.'),
  };
  
  const toolCallback = async (params: any, context: any): Promise<any> => {
    try {
      // Access headers from the shared context
      const {url, credential, organization} = getExchangeParams(params, context);
      const exchangeUrl = `${url}/${organization}/business/policies`;
      
      console.log(`Fetching deployment policies from Exchange at ${exchangeUrl}`);
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
      console.error(`Error listing deployment policies: ${error}`);
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
