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
import { registerUpdateNodePolicyTool } from './tools/update-node-policy';
import { registerGenerateServiceDefinitionTool } from './tools/generate-service-definition';
import { registerApiQueryTool } from './tools/api-query-tool';
import { registerApiQueryToolNlp } from './tools/api-query-tool-nlp';
import { registerAdminVersionTool } from './tools/admin-version';
import { registerAdminStatusTool } from './tools/admin-status';
import { registerOrgStatusTool } from './tools/org-status';
import { registerListManagementPolicies } from './tools/list-management-policies';
import { registerManageManagementPolicy } from './tools/manage-management-policy';
import { registerListHaGroups } from './tools/list-ha-groups';
import { registerManageHaGroup } from './tools/manage-ha-group';
import { registerManageHaGroupNode } from './tools/manage-ha-group-node';
import { registerManageDeploymentPolicy } from './tools/manage-deployment-policy';
import { registerIeamDocQueryTool } from './tools/ieamDocQueryTool';

// Import all prompt registration functions
import { registerDeploymentManagementPrompts } from './prompts/deployment-management';
import { registerServiceManagementPrompts } from './prompts/service-management';
import { registerNodeManagementPrompts } from './prompts/node-management';
import { registerPolicyAnalysisPrompts } from './prompts/policy-analysis';

/**
 * Factory to create and configure a new McpServer (tools/resources/prompts)
 * Note: We explicitly pass `capabilities` so that the client knows we support tools.
 */
export function createMcpServer(requestContext: any): McpServer {
  const server = new McpServer({
    name: 'open-horizon-mcp-server-v2',
    version: '1.0.0',
    context: requestContext,
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
      - Getting admin status and version information
      - Managing organization status
      - Working with management policies
      - Creating and managing high availability groups
      - Creating, updating, and managing deployment policies
      - Answering questions about the Open Horizon API endpoints and usage
      
      Always provide clear and concise information about Open Horizon resources.
      
      When users ask questions about the API, you have two tools available:
      - api-query-tool: The standard tool that uses pattern matching to search the OpenAPI specification
      - api-query-tool-nlp: An enhanced tool that uses natural language processing for more contextual understanding
      
      IMPORTANT: Always use api-query-tool-nlp for the following types of queries:
      - Questions about updating node policies (e.g., "how to update node policy?")
      - Complex or conversational API queries
      - Questions that don't match exact API endpoint patterns
      - When users ask "how to" questions about API usage
      
      Use api-query-tool only for simple, direct keyword searches when the query exactly matches API endpoint patterns.
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
  registerUpdateNodePolicyTool(server);
  registerGenerateServiceDefinitionTool(server);
  registerApiQueryTool(server);
  registerApiQueryToolNlp(server);
  registerAdminVersionTool(server);
  registerAdminStatusTool(server);
  registerOrgStatusTool(server);
  registerListManagementPolicies(server);
  registerManageManagementPolicy(server);
  registerListHaGroups(server);
  registerManageHaGroup(server);
  registerManageHaGroupNode(server);
  registerManageDeploymentPolicy(server);
  registerIeamDocQueryTool(server);

  // Register prompts
  registerDeploymentManagementPrompts(server);
  registerServiceManagementPrompts(server);
  registerNodeManagementPrompts(server);
  registerPolicyAnalysisPrompts(server);

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
