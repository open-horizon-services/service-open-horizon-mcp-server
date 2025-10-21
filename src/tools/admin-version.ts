/**
 * admin-version.ts
 * 
 * MCP tool for getting the version information of the Open Horizon Exchange
 */

import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { makeHttpRequest, getErrorMessage, getExchangeParams } from '../services/common';

/**
 * Register the admin-version tool with the MCP server
 */
export function registerAdminVersionTool(server: McpServer) {
  const toolName = 'admin-version';
  const toolDescription = `
    Use this tool to get the version information of the Open Horizon Exchange.
    
    This tool returns details about the Exchange server version, including:
    - Version number
    - Build information
    - API compatibility information
    
    No parameters are required for this tool.
  `;
  const toolSchema = {
    // No parameters needed
  };
  
  const toolCallback = async (params: any, context: any): Promise<any> => {
    try {
      // Access headers from the shared context
      const {url, credential} = getExchangeParams(params, context);
      const versionUrl = `${url.replace('/orgs', '')}/admin/version`;
      
      console.log(`Fetching Exchange version from: ${versionUrl}`);
      const response = await makeHttpRequest(versionUrl, {
        Authorization: `Basic ${credential}`
      });
      
      // If response has content property, it's already formatted as ToolResponse (error case)
      if (response && typeof response === 'object' && 'content' in response) {
        return response;
      } else if(typeof response === 'string') {
        return {
          content: [
            {
              type: 'text',
              text: response
            }
          ]
        };
      }
    
      // Format the response in a user-friendly way
      let formattedResponse = "# Exchange Version Information\n\n";
      
      if (typeof response === 'object') {
        // Extract key information
        const version = response.version || 'Unknown';
        const build = response.build || 'Unknown';
        
        formattedResponse += `- **Version**: ${version}\n`;
        formattedResponse += `- **Build**: ${build}\n\n`;
        
        // Add all other properties
        formattedResponse += "## Additional Details\n\n";
        for (const [key, value] of Object.entries(response)) {
          if (key !== 'version' && key !== 'build') {
            formattedResponse += `- **${key}**: ${value}\n`;
          }
        }
      } else {
        // If response is a string (likely just the version number)
        formattedResponse += `- **Version**: ${response}\n`;
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
      console.error(`Error getting admin version: ${error}`);
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