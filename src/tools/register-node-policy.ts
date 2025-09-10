/**
 * register-node-policy.ts
 * 
 * MCP tool for registering a node with a policy in the Open Horizon Exchange
 */

import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { makePostRequest, getErrorMessage } from '../services/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import 'dotenv/config';

const EXCHANGE_URL = process.env.EXCHANGE_URL;
const ORG = process.env.EXCHANGE_ORG;

/**
 * Register the register-node-policy tool with the MCP server
 */
export function registerNodePolicyTool(server: McpServer) {
  const toolName = 'register-node-policy';
  const toolDescription = `
    Use this tool to register a node with a policy in the Open Horizon Exchange.
    
    You can either:
    1. Provide a complete node policy as JSON
    2. Use the template and provide the necessary parameters
    
    For option 2, you need to specify:
    - allowPrivileged: Whether to allow privileged containers (default: true)
    - properties: Additional properties to include in the policy
  `;
  const toolSchema = {
    nodeName: z.string().describe('The name of the node'),
    policy: z.any().optional().describe('Complete node policy as JSON'),
    allowPrivileged: z.boolean().optional().describe('Whether to allow privileged containers (default: true)'),
    properties: z.array(z.object({
      name: z.string(),
      value: z.any()
    })).optional().describe('Additional properties to include in the policy'),
    org: z.string().optional().describe('Organization ID. If not provided, uses the default organization.'),
  };
  
  const toolCallback = async (params: any): Promise<any> => {
    try {
      const { nodeName } = params;
      const organization = params.org || ORG;
      let policy = params.policy;
      
      if (!nodeName) {
        return getErrorMessage("Node name is required");
      }
      
      // If a complete policy is not provided, build one from template
      if (!policy) {
        // Load the node policy template
        const templatePath = path.join(process.cwd(), 'open-horizon-mcp-v2', 'templates', 'node.policy.json');
        
        console.log(`Loading template from ${templatePath}`);
        let templateContent;
        try {
          templateContent = await fs.readFile(templatePath, 'utf8');
        } catch (error) {
          return getErrorMessage(`Error reading template file: ${error}`);
        }
        
        // Parse the template into a JSON object
        try {
          policy = JSON.parse(templateContent);
        } catch (error) {
          return getErrorMessage(`Error parsing template: ${error}`);
        }
        
        // Update the policy with the provided parameters
        if (params.allowPrivileged !== undefined) {
          // Find the allowPrivileged property or create it if it doesn't exist
          const allowPrivilegedProp = policy.properties.find((p: any) => p.name === 'openhorizon.allowPrivileged');
          if (allowPrivilegedProp) {
            allowPrivilegedProp.value = params.allowPrivileged;
          } else {
            policy.properties.push({
              name: 'openhorizon.allowPrivileged',
              value: params.allowPrivileged
            });
          }
        }
        
        // Add additional properties if provided
        if (params.properties && Array.isArray(params.properties)) {
          for (const prop of params.properties) {
            // Check if the property already exists
            const existingProp = policy.properties.find((p: any) => p.name === prop.name);
            if (existingProp) {
              existingProp.value = prop.value;
            } else {
              policy.properties.push({
                name: prop.name,
                value: prop.value
              });
            }
          }
        }
      }
      
      // Register the node policy
      const exchangeUrl = `${EXCHANGE_URL}/${organization}/nodes/${nodeName}/policy`;
      console.log(`Registering node policy at ${exchangeUrl}`);
      
      const response = await makePostRequest(exchangeUrl, policy, {
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
            text: `Successfully registered policy for node "${nodeName}" in organization ${organization}.`
          }
        ]
      };
    } catch (error) {
      console.error(`Error registering node policy: ${error}`);
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
