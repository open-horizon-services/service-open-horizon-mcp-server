/**
 * list-management-policies.ts
 * 
 * MCP tool for listing all management policies in the Open Horizon Exchange
 */

import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { makeHttpRequest, getErrorMessage, getExchangeParams } from '../services/common';

/**
 * Register the list-management-policies tool with the MCP server
 */
export function registerListManagementPolicies(server: McpServer) {
  const toolName = 'list-management-policies';
  const toolDescription = `
    Use this tool to list all management policies in the Open Horizon Exchange.
    You can filter by organization if needed.
    
    Management policies define how nodes are managed in the Open Horizon Exchange.
    They can be used to control node configuration, software updates, and other management tasks.
  `;
  const toolSchema = {
    org: z.string().optional().describe('Organization ID. If not provided, uses the default organization.'),
  };
  
  const toolCallback = async (params: any, context: any): Promise<any> => {
    try {
      // Access headers from the shared context
      const {url, credential, organization} = getExchangeParams(params, context);
      const exchangeUrl = `${url}/${organization}/managementpolicies`;
      
      console.log(`Fetching management policies from Exchange at ${exchangeUrl}`);
      const response = await makeHttpRequest(exchangeUrl, {
        Authorization: `Basic ${credential}`
      });
      
      // If response has content property, it's already formatted as ToolResponse (error case)
      if (response && typeof response === 'object' && 'content' in response) {
        return response;
      }
      
      // Format the response in a user-friendly way
      let formattedResponse = `# Management Policies in Organization: ${organization}\n\n`;
      
      if (typeof response === 'object' && response !== null) {
        const policyCount = Object.keys(response).length;
        formattedResponse += `Found ${policyCount} management policies.\n\n`;
        
        if (policyCount > 0) {
          formattedResponse += `## Policy List\n\n`;
          
          for (const [policyId, policyData] of Object.entries(response)) {
            const policy = policyData as Record<string, any>;
            const label = policy.label || 'No Label';
            const description = policy.description || 'No Description';
            
            formattedResponse += `### ${policyId}\n`;
            formattedResponse += `- **Label**: ${label}\n`;
            formattedResponse += `- **Description**: ${description}\n`;
            
            // Add creation and modification times if available
            if (policy.created) {
              formattedResponse += `- **Created**: ${new Date(policy.created).toLocaleString()}\n`;
            }
            if (policy.lastUpdated) {
              formattedResponse += `- **Last Updated**: ${new Date(policy.lastUpdated).toLocaleString()}\n`;
            }
            
            // Add constraints if available
            if (policy.constraints && Array.isArray(policy.constraints) && policy.constraints.length > 0) {
              formattedResponse += `- **Constraints**:\n`;
              for (const constraint of policy.constraints) {
                formattedResponse += `  - ${constraint}\n`;
              }
            }
            
            // Add properties if available
            if (policy.properties && Array.isArray(policy.properties) && policy.properties.length > 0) {
              formattedResponse += `- **Properties**:\n`;
              for (const prop of policy.properties) {
                formattedResponse += `  - ${prop.name}: ${prop.value}\n`;
              }
            }
            
            formattedResponse += '\n';
          }
        } else {
          formattedResponse += `No management policies found in organization ${organization}.\n`;
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
      console.error(`Error listing management policies: ${error}`);
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