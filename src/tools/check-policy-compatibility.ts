/**
 * check-policy-compatibility.ts
 * 
 * MCP tool for checking which services are compatible with a specific deployment policy
 */

import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { makeHttpRequest, getErrorMessage } from '../services/common';
import 'dotenv/config';

const EXCHANGE_URL = process.env.EXCHANGE_URL;
const ORG = process.env.EXCHANGE_ORG;

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
  
  const toolCallback = async (params: any): Promise<any> => {
    try {
      const { policyName } = params;
      const organization = params.org || ORG;
      
      if (!policyName) {
        return getErrorMessage("Policy name is required");
      }
      
      // First, get the policy details to verify it exists and get its constraints
      const policyUrl = `${EXCHANGE_URL}/${organization}/business/policies/${policyName}`;
      console.log(`Fetching policy details from Exchange at ${policyUrl}`);
      const response = await makeHttpRequest(policyUrl, {
        Authorization: `Basic ${process.env.EXCHANGE_CREDENTIAL}`
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
