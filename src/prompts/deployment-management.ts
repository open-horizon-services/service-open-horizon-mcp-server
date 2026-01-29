/**
 * deployment-management.ts
 * 
 * MCP prompts for deployment policy management in Open Horizon
 */

import { z } from 'zod';

/**
 * Register deployment management prompts with the MCP server
 */
export function registerDeploymentManagementPrompts(server: any) {
  // Prompt: create-deployment-policy
  server.prompt(
    'create-deployment-policy',
    {
      policyName: z.string(),
      serviceName: z.string(),
      serviceVersion: z.string(),
      serviceOrg: z.string().optional(),
      arch: z.string().optional(),
      org: z.string().optional(),
    },
    ({ policyName, serviceName, serviceVersion, serviceOrg, arch, org }: { 
      policyName: string;
      serviceName: string;
      serviceVersion: string;
      serviceOrg?: string;
      arch?: string;
      org?: string;
    }) => {
      const architecture = arch || 'amd64';
      const serviceOrganization = serviceOrg || org || 'default';
      
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Please create a new deployment policy named "${policyName}" for service "${serviceName}" version ${serviceVersion}.

Use the 'manage-deployment-policy' tool with these parameters:
{
  "name": "${policyName}",
  "operation": "create",${org ? `\n  "org": "${org}",` : ''}
  "policy": {
    "label": "${policyName}",
    "description": "Deployment policy for ${serviceName} ${serviceVersion}",
    "service": {
      "name": "${serviceName}",
      "org": "${serviceOrganization}",
      "arch": "${architecture}",
      "serviceVersions": [
        {
          "version": "${serviceVersion}",
          "priority": {
            "priority_value": 5,
            "retries": 1,
            "retry_durations": 3600,
            "verified_durations": 52
          }
        }
      ]
    },
    "properties": [],
    "constraints": []
  }
}

After creating the policy, provide:
1. Confirmation of successful creation
2. Summary of the policy configuration
3. Next steps for deploying to nodes
4. Recommendations for adding constraints or properties if needed`
            }
          }
        ]
      };
    }
  );

  // Prompt: analyze-deployment-status
  server.prompt(
    'analyze-deployment-status',
    {
      policyName: z.string(),
      org: z.string().optional(),
    },
    ({ policyName, org }: { policyName: string; org?: string }) => {
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Please analyze the deployment status for policy "${policyName}".

Step 1: Get the policy details using 'manage-deployment-policy':
{
  "name": "${policyName}",
  "operation": "get"${org ? `,\n  "org": "${org}"` : ''}
}

Step 2: Check which nodes are using this policy with 'check-policy-deployments':
{
  "policyName": "${policyName}"${org ? `,\n  "org": "${org}"` : ''}
}

Step 3: Analyze and provide:
1. **Policy Configuration**: Service details, constraints, and properties
2. **Deployment Status**: Number of nodes with active deployments
3. **Node Distribution**: List of nodes running this policy
4. **Agreement States**: Status of agreements (active, negotiating, failed)
5. **Recommendations**: 
   - Any issues requiring attention
   - Optimization opportunities
   - Capacity planning insights`
            }
          }
        ]
      };
    }
  );

  // Prompt: update-deployment-constraints
  server.prompt(
    'update-deployment-constraints',
    {
      policyName: z.string(),
      constraints: z.array(z.string()),
      org: z.string().optional(),
    },
    ({ policyName, constraints, org }: { 
      policyName: string;
      constraints: string[];
      org?: string;
    }) => {
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Please update the constraints for deployment policy "${policyName}".

Step 1: Get the current policy configuration using 'manage-deployment-policy':
{
  "name": "${policyName}",
  "operation": "get"${org ? `,\n  "org": "${org}"` : ''}
}

Step 2: Update the policy with new constraints using 'manage-deployment-policy':
{
  "name": "${policyName}",
  "operation": "update",${org ? `\n  "org": "${org}",` : ''}
  "policy": {
    ... (keep existing policy fields),
    "constraints": ${JSON.stringify(constraints, null, 2)}
  }
}

Step 3: Verify the update and check compatibility:
- Use 'check-policy-compatibility' to see which services match the new constraints
- Use 'check-policy-deployments' to verify existing deployments are not affected

Provide:
1. Summary of constraint changes
2. Impact on existing deployments
3. List of compatible services
4. Recommendations for testing the updated policy`
            }
          }
        ]
      };
    }
  );

  // Prompt: compare-deployment-policies
  server.prompt(
    'compare-deployment-policies',
    {
      policy1: z.string(),
      policy2: z.string(),
      org: z.string().optional(),
    },
    ({ policy1, policy2, org }: { 
      policy1: string;
      policy2: string;
      org?: string;
    }) => {
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Please compare deployment policies "${policy1}" and "${policy2}".

Step 1: Get details for both policies using 'manage-deployment-policy':
- Policy 1: "${policy1}"
- Policy 2: "${policy2}"

Step 2: Check deployment status for both policies using 'check-policy-deployments'.

Step 3: Compare and analyze:
1. **Service Configuration**:
   - Service names and versions
   - Architecture differences
   - Priority settings
2. **Constraints**:
   - Constraint differences
   - Targeting specificity
3. **Properties**:
   - Property differences
   - Configuration variations
4. **Deployment Status**:
   - Number of nodes using each policy
   - Agreement states
   - Success rates
5. **Recommendations**:
   - Which policy is more suitable for specific use cases
   - Consolidation opportunities
   - Best practices alignment`
            }
          }
        ]
      };
    }
  );

  // Prompt: troubleshoot-deployment-failures
  server.prompt(
    'troubleshoot-deployment-failures',
    {
      policyName: z.string().optional(),
      org: z.string().optional(),
    },
    ({ policyName, org }: { policyName?: string; org?: string }) => {
      const policyFilter = policyName ? ` for policy "${policyName}"` : '';
      
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Please troubleshoot deployment failures${policyFilter}.

Step 1: List all deployment policies using 'list-deployment-policies'${org ? ` with org "${org}"` : ''}.

${policyName ? `Step 2: Get details for policy "${policyName}" using 'manage-deployment-policy'.

Step 3: Check deployment status using 'check-policy-deployments'.` : `Step 2: For each policy, check deployment status using 'check-policy-deployments'.`}

Step 4: List all nodes using 'list-nodes' to identify nodes without deployments.

Step 5: Analyze and provide:
1. **Failed Deployments**: Nodes with failed or missing agreements
2. **Common Issues**:
   - Constraint mismatches
   - Service availability problems
   - Node policy conflicts
   - Architecture incompatibilities
3. **Root Cause Analysis**: Identify patterns in failures
4. **Troubleshooting Steps**:
   - Specific actions to resolve each issue
   - Commands to verify fixes
5. **Prevention Recommendations**:
   - Policy improvements
   - Monitoring suggestions
   - Best practices to avoid future failures`
            }
          }
        ]
      };
    }
  );

  // Prompt: rollout-deployment-policy
  server.prompt(
    'rollout-deployment-policy',
    {
      policyName: z.string(),
      serviceVersion: z.string(),
      rolloutStrategy: z.enum(['immediate', 'canary', 'blue-green']).optional(),
      org: z.string().optional(),
    },
    ({ policyName, serviceVersion, rolloutStrategy, org }: { 
      policyName: string;
      serviceVersion: string;
      rolloutStrategy?: 'immediate' | 'canary' | 'blue-green';
      org?: string;
    }) => {
      const strategy = rolloutStrategy || 'immediate';
      
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Please plan a ${strategy} rollout for policy "${policyName}" to service version ${serviceVersion}.

Step 1: Get current policy configuration using 'manage-deployment-policy':
{
  "name": "${policyName}",
  "operation": "get"${org ? `,\n  "org": "${org}"` : ''}
}

Step 2: Check current deployments using 'check-policy-deployments'.

Step 3: Create rollout plan based on strategy:

${strategy === 'immediate' ? `**Immediate Rollout**:
- Update policy to version ${serviceVersion}
- All nodes will upgrade simultaneously
- Higher risk but faster deployment` : ''}

${strategy === 'canary' ? `**Canary Rollout**:
- Create new policy "${policyName}-canary" with version ${serviceVersion}
- Deploy to 10% of nodes first
- Monitor for issues
- Gradually increase to 100%
- Update original policy once validated` : ''}

${strategy === 'blue-green' ? `**Blue-Green Rollout**:
- Create new policy "${policyName}-green" with version ${serviceVersion}
- Deploy to separate set of nodes
- Test thoroughly
- Switch traffic to green deployment
- Retire blue deployment` : ''}

Step 4: Provide detailed rollout plan including:
1. **Pre-rollout Checklist**: Validation steps
2. **Rollout Steps**: Specific commands and timing
3. **Monitoring Plan**: What to watch during rollout
4. **Rollback Plan**: How to revert if issues occur
5. **Success Criteria**: How to verify successful rollout
6. **Post-rollout Tasks**: Cleanup and documentation`
            }
          }
        ]
      };
    }
  );
}

// Made with Bob