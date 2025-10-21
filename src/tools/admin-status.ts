/**
 * admin-status.ts
 * 
 * MCP tool for getting the status information of the Open Horizon Exchange
 */

import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { makeHttpRequest, getErrorMessage, getExchangeParams } from '../services/common';

/**
 * Register the admin-status tool with the MCP server
 */
export function registerAdminStatusTool(server: McpServer) {
  const toolName = 'admin-status';
  const toolDescription = `
    Use this tool to get the status information of the Open Horizon Exchange.
    
    This tool returns details about the Exchange server status, including:
    - API status
    - Database connection status
    - Message queue status
    - Overall system health
    
    No parameters are required for this tool.
  `;
  const toolSchema = {
    // No parameters needed
  };
  
  const toolCallback = async (params: any, context: any): Promise<any> => {
    try {
      // Access headers from the shared context
      const {url, credential} = getExchangeParams(params, context);
      const statusUrl = `${url.replace('/orgs', '')}/admin/status`;
      
      console.log(`Fetching Exchange status from: ${statusUrl}`);
      const response = await makeHttpRequest(statusUrl, {
        Authorization: `Basic ${credential}`
      });
      
      // If response has content property, it's already formatted as ToolResponse (error case)
      if (response && typeof response === 'object' && 'content' in response) {
        return response;
      }
      
      // Format the response in a user-friendly way
      let formattedResponse = "# Exchange Status Information\n\n";
      
      if (typeof response === 'object' && response !== null) {
        // Check for overall status
        const overallStatus = response.status || response.general?.status || 'Unknown';
        const statusEmoji = overallStatus === 'OK' ? '✅' : '⚠️';
        
        formattedResponse += `## Overall Status: ${statusEmoji} ${overallStatus}\n\n`;
        
        // Format DB status if available
        if (response.dbStatus || response.db) {
          const dbStatus = response.dbStatus || response.db?.status || 'Unknown';
          const dbEmoji = dbStatus === 'OK' ? '✅' : '⚠️';
          formattedResponse += `### Database Status: ${dbEmoji} ${dbStatus}\n`;
          
          // Add DB details if available
          const dbDetails = response.db || {};
          for (const [key, value] of Object.entries(dbDetails)) {
            if (key !== 'status') {
              formattedResponse += `- **${key}**: ${value}\n`;
            }
          }
          formattedResponse += '\n';
        }
        
        // Format message queue status if available
        if (response.msgQueStatus || response.msgQueue) {
          const mqStatus = response.msgQueStatus || response.msgQueue?.status || 'Unknown';
          const mqEmoji = mqStatus === 'OK' ? '✅' : '⚠️';
          formattedResponse += `### Message Queue Status: ${mqEmoji} ${mqStatus}\n`;
          
          // Add message queue details if available
          const mqDetails = response.msgQueue || {};
          for (const [key, value] of Object.entries(mqDetails)) {
            if (key !== 'status') {
              formattedResponse += `- **${key}**: ${value}\n`;
            }
          }
          formattedResponse += '\n';
        }
        
        // Add all other properties
        formattedResponse += "### Additional Details\n\n";
        for (const [key, value] of Object.entries(response)) {
          if (!['status', 'dbStatus', 'msgQueStatus', 'db', 'msgQueue'].includes(key)) {
            if (typeof value === 'object' && value !== null) {
              formattedResponse += `#### ${key}\n`;
              for (const [subKey, subValue] of Object.entries(value as Record<string, any>)) {
                formattedResponse += `- **${subKey}**: ${subValue}\n`;
              }
            } else {
              formattedResponse += `- **${key}**: ${value}\n`;
            }
          }
        }
      } else if (typeof response === 'string') {
        // If response is a string, display it as status
        formattedResponse += `## Status: ${response}\n`;
      } else {
        // If response is not an object or string, just return it as is
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
      console.error(`Error getting admin status: ${error}`);
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