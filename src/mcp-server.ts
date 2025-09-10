import express from 'express';
import { Request, Response } from 'express';
import { IncomingHttpHeaders } from 'http';
import { SessionEntry } from './models/model';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

// Import all tool registration functions
import { registerListServicesTool } from './tools/list-services';
import { registerListNodesTool } from './tools/list-nodes';
import { registerListDeploymentPolicies } from './tools/list-deployment-policies';
import { registerGetPolicyDetailsTool } from './tools/get-policy-details';
import { registerGetServiceDetailsTool } from './tools/get-service-details';
import { registerGetNodePolicyTool } from './tools/get-node-policy';
import { registerCheckPolicyDeploymentsTool } from './tools/check-policy-deployments';
import { registerCheckPolicyCompatibilityTool } from './tools/check-policy-compatibility';
import { registerPublishServiceTool } from './tools/publish-service';
import { registerDeleteServiceTool } from './tools/delete-service';
import { registerDeletePolicyTool } from './tools/delete-policy';
import { registerUnregisterNodeTool } from './tools/unregister-node';
import { registerNodePolicyTool } from './tools/register-node-policy';
import { registerGenerateServiceDefinitionTool } from './tools/generate-service-definition';

/**
 * Factory to create and configure a new McpServer (tools/resources/prompts)
 * Note: We explicitly pass `capabilities` so that the client knows we support tools.
 */
export function createMcpServer(initialHeaders: IncomingHttpHeaders): McpServer {
  const server = new McpServer({
    name: 'open-horizon-mcp-server-v2',
    version: '1.0.0',

    // Declare that this server supports tools, resources, and prompts
    capabilities: {
      tools:     { listChanged: true },
      resources: { listChanged: true },
      prompts:   { listChanged: true }
    },
    instructions: `
      You are an Open Horizon assistant with access to Open Horizon Exchange API's using the following tools.
      
      You can help users with tasks such as:
      - Listing services, nodes, and deployment policies in the Exchange
      - Getting details about specific services, nodes, and policies
      - Checking which workloads are deployed with a specific policy
      - Checking which services are compatible with a policy
      - Publishing services to the Exchange
      - Deleting services and policies
      - Unregistering nodes
      - Registering nodes with policies
      - Generating service definition files
      
      Always provide clear and concise information about Open Horizon resources.
    `
  });
  
  // Register tools
  registerListServicesTool(server);
  registerListNodesTool(server);
  registerListDeploymentPolicies(server);
  registerGetPolicyDetailsTool(server);
  registerGetServiceDetailsTool(server);
  registerGetNodePolicyTool(server);
  registerCheckPolicyDeploymentsTool(server);
  registerCheckPolicyCompatibilityTool(server);
  registerPublishServiceTool(server);
  registerDeleteServiceTool(server);
  registerDeletePolicyTool(server);
  registerUnregisterNodeTool(server);
  registerNodePolicyTool(server);
  registerGenerateServiceDefinitionTool(server);

  // Add a simple status resource
  server.resource('status', 'status', async () => {
    const exchangeUrl = process.env.EXCHANGE_URL || 'Not configured';
    const organization = process.env.EXCHANGE_ORG || 'Not configured';
    
    return {
      contents: [
        {
          text: `Open Horizon Exchange Status:
- Exchange URL: ${exchangeUrl}
- Organization: ${organization}
- Connection: ${exchangeUrl !== 'Not configured' ? 'Configured' : 'Not configured'}`,
          uri: 'status',
          mimeType: 'text/plain'
        }
      ]
    };
  });

  return server;
}

// Made with Bob
