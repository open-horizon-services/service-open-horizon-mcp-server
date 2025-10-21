/**
 * org-status.ts
 * 
 * MCP tool for getting the status information of an organization in the Open Horizon Exchange
 */

import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { makeHttpRequest, getErrorMessage, getExchangeParams } from '../services/common';

/**
 * Register the org-status tool with the MCP server
 */
export function registerOrgStatusTool(server: McpServer) {
  const toolName = 'org-status';
  const toolDescription = `
    Use this tool to get the status information of an organization in the Open Horizon Exchange.
    
    This tool returns details about the organization status, including:
    - Number of nodes
    - Number of services
    - Number of patterns
    - Number of policies
    - Resource usage statistics
    
    You can specify an organization ID, or the default organization will be used.
  `;
  const toolSchema = {
    org: z.string().optional().describe('Organization ID. If not provided, uses the default organization.'),
  };
  
  const toolCallback = async (params: any, context: any): Promise<any> => {
    try {
      // Access headers from the shared context
      const {url, credential, organization} = getExchangeParams(params, context);
      const statusUrl = `${url.replace('/orgs', '')}/admin/orgstatus`;
      
      console.log(`Fetching organization status from: ${statusUrl}`);
      const response = await makeHttpRequest(statusUrl, {
        Authorization: `Basic ${credential}`
      });
      
      // If response has content property, it's already formatted as ToolResponse (error case)
      if (response && typeof response === 'object' && 'content' in response) {
        return response;
      }
      
      // Format the response in a user-friendly way
      let formattedResponse = `# Organization Status: ${organization}\n\n`;
      
      if (typeof response === 'object' && response !== null) {
        // Extract key information
        const nodeCount = response.nodes || response.nodeCount || 'Unknown';
        const serviceCount = response.services || response.serviceCount || 'Unknown';
        const patternCount = response.patterns || response.patternCount || 'Unknown';
        const policyCount = response.policies || response.policyCount || 'Unknown';
        
        formattedResponse += `## Resource Counts\n\n`;
        formattedResponse += `- **Nodes**: ${nodeCount}\n`;
        formattedResponse += `- **Services**: ${serviceCount}\n`;
        formattedResponse += `- **Patterns**: ${patternCount}\n`;
        formattedResponse += `- **Policies**: ${policyCount}\n\n`;
        
        // Add all other properties
        formattedResponse += "## Additional Details\n\n";
        for (const [key, value] of Object.entries(response)) {
          if (!['nodes', 'services', 'patterns', 'policies', 'nodeCount', 'serviceCount', 'patternCount', 'policyCount'].includes(key)) {
            if (typeof value === 'object' && value !== null) {
              formattedResponse += `### ${key}\n`;
              for (const [subKey, subValue] of Object.entries(value as Record<string, any>)) {
                formattedResponse += `- **${subKey}**: ${subValue}\n`;
              }
              formattedResponse += '\n';
            } else {
              formattedResponse += `- **${key}**: ${value}\n`;
            }
          }
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
      console.error(`Error getting organization status: ${error}`);
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