/**
 * node-management.ts
 * 
 * MCP prompts for node management in Open Horizon
 */

import { z } from 'zod';

/**
 * Register node management prompts with the MCP server
 */
export function registerNodeManagementPrompts(server: any) {
  // Prompt: analyze-node-inventory
  server.prompt(
    'analyze-node-inventory',
    {
      org: z.string().optional(),
    },
    ({ org }: { org?: string }) => {
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Please analyze the node inventory in the Open Horizon Exchange.

Step 1: List all nodes using 'list-nodes'${org ? ` with org "${org}"` : ''}.

Step 2: For each node, analyze its configuration and status.

Step 3: Provide comprehensive analysis:
1. **Node Statistics**:
   - Total number of registered nodes
   - Nodes by architecture (amd64, arm64, arm)
   - Nodes by type (device, cluster)
2. **Node Status**:
   - Active nodes (with recent heartbeat)
   - Inactive or stale nodes
   - Nodes with errors or issues
3. **Deployment Status**:
   - Nodes with active agreements
   - Nodes without deployments
   - Agreement states distribution
4. **Node Policies**:
   - Nodes with custom policies
   - Common property patterns
   - Constraint usage
5. **HA Groups**:
   - Nodes in HA groups
   - HA group distribution
6. **Recommendations**:
   - Nodes requiring attention
   - Cleanup opportunities (stale nodes)
   - Capacity planning insights
   - Policy optimization suggestions`
            }
          }
        ]
      };
    }
  );

  // Prompt: configure-node-policy
  server.prompt(
    'configure-node-policy',
    {
      nodeId: z.string(),
      properties: z.array(z.object({
        name: z.string(),
        value: z.any()
      })).optional(),
      constraints: z.array(z.string()).optional(),
      org: z.string().optional(),
    },
    ({ nodeId, properties, constraints, org }: { 
      nodeId: string;
      properties?: Array<{name: string; value: any}>;
      constraints?: string[];
      org?: string;
    }) => {
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Please configure the node policy for node "${nodeId}".

Step 1: Get current node policy using 'get-node-policy':
{
  "nodeId": "${nodeId}"${org ? `,\n  "org": "${org}"` : ''}
}

Step 2: Create or update the node policy using 'update-node-policy':
{
  "nodeId": "${nodeId}",${org ? `\n  "org": "${org}",` : ''}
  "policy": {
    "properties": ${properties ? JSON.stringify(properties, null, 2) : '[]'},
    "constraints": ${constraints ? JSON.stringify(constraints, null, 2) : '[]'}
  }
}

Step 3: Verify the policy update and check compatibility:
- Use 'get-node-policy' to confirm the changes
- Use 'check-policy-compatibility' to see which deployment policies match

Provide:
1. **Policy Summary**: Overview of configured properties and constraints
2. **Compatible Policies**: List of deployment policies that match
3. **Expected Deployments**: Services that should deploy to this node
4. **Recommendations**:
   - Additional properties to consider
   - Constraint optimization
   - Best practices for node policies`
            }
          }
        ]
      };
    }
  );

  // Prompt: troubleshoot-node-issues
  server.prompt(
    'troubleshoot-node-issues',
    {
      nodeId: z.string().optional(),
      org: z.string().optional(),
    },
    ({ nodeId, org }: { nodeId?: string; org?: string }) => {
      const nodeFilter = nodeId ? ` for node "${nodeId}"` : '';
      
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Please troubleshoot node issues${nodeFilter}.

Step 1: List all nodes using 'list-nodes'${org ? ` with org "${org}"` : ''}.

${nodeId ? `Step 2: Get detailed information for node "${nodeId}".

Step 3: Get node policy using 'get-node-policy'.

Step 4: Check deployment policies using 'list-deployment-policies' to find compatible policies.` : `Step 2: Analyze each node for common issues.`}

Step 5: Identify and analyze issues:
1. **Registration Issues**:
   - Nodes that failed to register
   - Authentication problems
   - Network connectivity issues
2. **Agreement Issues**:
   - Failed agreement negotiations
   - Agreements stuck in negotiating state
   - Agreement cancellations
3. **Policy Issues**:
   - Node policy conflicts with deployment policies
   - Missing required properties
   - Constraint mismatches
4. **Service Issues**:
   - Services not starting
   - Container failures
   - Resource constraints
5. **Communication Issues**:
   - Stale heartbeats
   - Exchange connectivity problems
   - Agbot communication failures

Provide:
1. **Issue Summary**: List of identified problems by severity
2. **Root Cause Analysis**: Why each issue is occurring
3. **Resolution Steps**: Specific commands and actions to fix issues
4. **Verification**: How to confirm issues are resolved
5. **Prevention**: How to avoid similar issues in the future`
            }
          }
        ]
      };
    }
  );

  // Prompt: manage-ha-group-membership
  server.prompt(
    'manage-ha-group-membership',
    {
      groupName: z.string(),
      operation: z.enum(['add', 'remove', 'list']),
      nodeId: z.string().optional(),
      org: z.string().optional(),
    },
    ({ groupName, operation, nodeId, org }: { 
      groupName: string;
      operation: 'add' | 'remove' | 'list';
      nodeId?: string;
      org?: string;
    }) => {
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Please ${operation} ${operation === 'list' ? 'members of' : nodeId ? `node "${nodeId}" ${operation === 'add' ? 'to' : 'from'}` : ''} HA group "${groupName}".

Step 1: Get current HA group details using 'manage-ha-group':
{
  "name": "${groupName}",
  "operation": "get"${org ? `,\n  "org": "${org}"` : ''}
}

${operation === 'add' && nodeId ? `Step 2: Add node to HA group using 'manage-ha-group-node':
{
  "groupName": "${groupName}",
  "nodeId": "${nodeId}",
  "operation": "add"${org ? `,\n  "org": "${org}"` : ''}
}` : ''}

${operation === 'remove' && nodeId ? `Step 2: Remove node from HA group using 'manage-ha-group-node':
{
  "groupName": "${groupName}",
  "nodeId": "${nodeId}",
  "operation": "remove"${org ? `,\n  "org": "${org}"` : ''}
}` : ''}

Step 3: Verify the operation and analyze the HA group:
1. **Current Members**: List all nodes in the group
2. **Member Status**: Health and deployment status of each member
3. **HA Configuration**: Group settings and policies
4. **Recommendations**:
   - Optimal group size
   - Load balancing considerations
   - Failover testing suggestions
   - Monitoring recommendations`
            }
          }
        ]
      };
    }
  );

  // Prompt: unregister-inactive-nodes
  server.prompt(
    'unregister-inactive-nodes',
    {
      inactiveDays: z.number().optional(),
      org: z.string().optional(),
    },
    ({ inactiveDays, org }: { inactiveDays?: number; org?: string }) => {
      const days = inactiveDays || 30;
      
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Please identify and create a plan to unregister nodes inactive for more than ${days} days.

Step 1: List all nodes using 'list-nodes'${org ? ` with org "${org}"` : ''}.

Step 2: Analyze each node's last heartbeat and activity.

Step 3: Identify inactive nodes (no heartbeat for ${days}+ days).

Step 4: For each inactive node, check:
- Active agreements
- HA group membership
- Node policy configuration
- Last known status

Step 5: Create cleanup plan:
1. **Inactive Nodes Summary**:
   - Total count of inactive nodes
   - Breakdown by architecture
   - Last activity dates
2. **Impact Assessment**:
   - Nodes with active agreements (need investigation)
   - Nodes in HA groups (need replacement)
   - Nodes with custom policies (may need preservation)
3. **Cleanup Strategy**:
   - Nodes safe to unregister immediately
   - Nodes requiring manual review
   - Nodes to keep for reference
4. **Unregistration Steps**:
   - Commands to unregister each node using 'unregister-node'
   - Order of operations
   - Verification steps
5. **Prevention**:
   - Monitoring recommendations
   - Automated cleanup policies
   - Node lifecycle management best practices

Note: Do not automatically unregister nodes without user confirmation.`
            }
          }
        ]
      };
    }
  );

  // Prompt: monitor-node-health
  server.prompt(
    'monitor-node-health',
    {
      nodeId: z.string().optional(),
      org: z.string().optional(),
    },
    ({ nodeId, org }: { nodeId?: string; org?: string }) => {
      const nodeFilter = nodeId ? ` for node "${nodeId}"` : ' for all nodes';
      
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Please provide a health monitoring report${nodeFilter}.

Step 1: List nodes using 'list-nodes'${org ? ` with org "${org}"` : ''}.

${nodeId ? `Step 2: Get detailed information for node "${nodeId}".` : 'Step 2: Analyze health metrics for all nodes.'}

Step 3: Check deployment status and agreements.

Step 4: Generate health report:
1. **Connectivity Health**:
   - Last heartbeat time
   - Heartbeat frequency
   - Communication status with Exchange
2. **Agreement Health**:
   - Active agreements count
   - Agreement states (formed, negotiating, failed)
   - Service deployment status
3. **Resource Health**:
   - Node architecture and capabilities
   - Resource utilization (if available)
   - Capacity indicators
4. **Policy Health**:
   - Node policy configuration
   - Policy compatibility with deployments
   - Constraint satisfaction
5. **HA Health** (if applicable):
   - HA group membership
   - Redundancy status
   - Failover readiness
6. **Health Score**:
   - Overall health rating (healthy, warning, critical)
   - Key issues affecting health
   - Recommended actions

Provide:
- Summary dashboard of health metrics
- Alerts for nodes requiring attention
- Trends and patterns
- Recommendations for improving node health`
            }
          }
        ]
      };
    }
  );

  // Prompt: plan-node-migration
  server.prompt(
    'plan-node-migration',
    {
      sourceNodeId: z.string(),
      targetNodeId: z.string().optional(),
      org: z.string().optional(),
    },
    ({ sourceNodeId, targetNodeId, org }: { 
      sourceNodeId: string;
      targetNodeId?: string;
      org?: string;
    }) => {
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Please create a migration plan for node "${sourceNodeId}"${targetNodeId ? ` to "${targetNodeId}"` : ''}.

Step 1: Get source node details using 'list-nodes' and filter for "${sourceNodeId}".

Step 2: Get source node policy using 'get-node-policy'.

${targetNodeId ? `Step 3: Get target node details and policy for "${targetNodeId}".` : 'Step 3: Identify requirements for target node.'}

Step 4: Analyze current deployments and agreements on source node.

Step 5: Create migration plan:
1. **Pre-Migration Assessment**:
   - Services running on source node
   - Node policy configuration
   - HA group membership
   - Dependencies and constraints
2. **Target Node Requirements**:
   - Required architecture
   - Required properties
   - Policy configuration needed
   ${targetNodeId ? '- Compatibility verification' : '- Specifications for new node'}
3. **Migration Strategy**:
   - Blue-green migration (run both nodes temporarily)
   - Rolling migration (gradual service transfer)
   - Direct cutover (immediate switch)
4. **Migration Steps**:
   - Configure target node policy
   - Verify service compatibility
   - Deploy services to target
   - Validate deployments
   - Decommission source node
5. **Rollback Plan**: Steps to revert if issues occur
6. **Verification**: How to confirm successful migration`
            }
          }
        ]
      };
    }
  );
}

// Made with Bob