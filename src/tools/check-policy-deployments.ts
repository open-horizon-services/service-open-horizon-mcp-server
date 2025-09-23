/**
 * check-policy-deployments.ts
 * 
 * MCP tool for checking if any workloads are currently deployed with a specific deployment policy
 */

import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { makeHttpRequest, getErrorMessage, getExchangeParams } from '../services/common';

/**
 * Register the check-policy-deployments tool with the MCP server
 */
export function registerCheckPolicyDeploymentsTool(server: McpServer) {
  const toolName = 'check-policy-deployments';
  const toolDescription = `
    Use this tool to check if any workloads are currently deployed with a specific deployment policy.
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
      
      // First, get the policy details to verify it exists
      const policyUrl = `${url}/${organization}/business/policies/${policyName}`;
      console.log(`Fetching policy details from Exchange at ${policyUrl}`);
      const policyResponse = await makeHttpRequest(policyUrl, {
        Authorization: `Basic ${credential}`
      });
      
      // If policy response has content property, it's already formatted as ToolResponse (error case)
      if (policyResponse && typeof policyResponse === 'object' && 'content' in policyResponse) {
        return policyResponse;
      }
      
      if (!policyResponse || Object.keys(policyResponse).length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: `No deployment policy found with name "${policyName}".`
            }
          ]
        };
      }
      
      // Now get all nodes to check which ones are using this policy
      const nodesUrl = `${url}/${organization}/nodes`;
      console.log(`Fetching nodes from Exchange at ${nodesUrl}`);
      const nodesResponse = await makeHttpRequest(nodesUrl, {
        Authorization: `Basic ${credential}`
      });
      
      // If nodes response has content property, it's already formatted as ToolResponse (error case)
      if (nodesResponse && typeof nodesResponse === 'object' && 'content' in nodesResponse) {
        return nodesResponse;
      }
      
      // Check each node to see if it's using the specified policy
      const deployedNodes = [];
      
      for (const [nodeId, nodeData] of Object.entries(nodesResponse)) {
        const node = nodeData as any;
        
        // Check if the node has agreements
        if (node.agreements) {
          for (const [agmtId, agmtData] of Object.entries(node.agreements)) {
            const agreement = agmtData as any;
            
            // Check if this agreement is using the specified policy
            if (agreement.policy && agreement.policy === policyName) {
              deployedNodes.push({
                nodeId,
                agreementId: agmtId,
                service: agreement.serviceUrl,
                state: agreement.state
              });
            }
          }
        }
      }
      
      // Format the results
      let formattedText = `Workload deployments for policy "${policyName}" in organization ${organization}:\n\n`;
      
      if (deployedNodes.length === 0) {
        formattedText += `No workloads are currently deployed with this policy.`;
      } else {
        formattedText += `Found ${deployedNodes.length} node(s) with workloads deployed using this policy:\n\n`;
        
        for (const deployment of deployedNodes) {
          formattedText += `Node: ${deployment.nodeId}\n`;
          formattedText += `  Agreement ID: ${deployment.agreementId}\n`;
          formattedText += `  Service: ${deployment.service}\n`;
          formattedText += `  State: ${deployment.state}\n\n`;
        }
      }
      
      return {
        content: [
          {
            type: 'text',
            text: formattedText
          }
        ]
      };
    } catch (error) {
      console.error(`Error checking policy deployments: ${error}`);
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
