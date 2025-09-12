/**
 * check-policy-compatibility.ts
 * 
 * MCP tool for checking which services are compatible with a specific deployment policy
 */

import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { makeHttpRequest, getErrorMessage, getExchangeParams } from '../services/common';

/**
 * Register the check-policy-compatibility tool with the MCP server
 */
export function registerCheckPolicyCompatibilityTool(server: McpServer) {
  const toolName = 'check-policy-compatibility';
  const toolDescription = `
    Use this tool to check which services are compatible with a specific deployment policy.
    You need to provide the policy name.
  `;
  const toolSchema = {
    policyName: z.string().describe('The name of the deployment policy'),
    org: z.string().optional().describe('Organization ID. If not provided, uses the default organization.'),
  };
  
  const toolCallback = async (params: any, context: any): Promise<any> => {
    try {
      const { policyName } = params;
      // Access headers from the shared context
      const {url, credential, organization} = getExchangeParams(params, context);
      
      if (!policyName) {
        return getErrorMessage("Policy name is required");
      }
      
      // First, get the policy details to verify it exists and get its constraints
      const policyUrl = `${url}/${organization}/business/policies/${policyName}`;
      console.log(`Fetching policy details from Exchange at ${policyUrl}`);
      const response = await makeHttpRequest(policyUrl, {
        Authorization: `Basic ${credential}`
      });
      
      // If policy response has content property, it's already formatted as ToolResponse (error case)
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
      console.error(`Error checking policy compatibility: ${error}`);
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
