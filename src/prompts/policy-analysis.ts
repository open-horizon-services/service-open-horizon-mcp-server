/**
 * policy-analysis.ts
 * 
 * MCP prompts for policy analysis and optimization in Open Horizon
 */

import { z } from 'zod';

/**
 * Register policy analysis prompts with the MCP server
 */
export function registerPolicyAnalysisPrompts(server: any) {
  // Prompt: analyze-policy-coverage
  server.prompt(
    'analyze-policy-coverage',
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
              text: `Please analyze the policy coverage across the Open Horizon infrastructure.

Step 1: List all deployment policies using 'list-deployment-policies'${org ? ` with org "${org}"` : ''}.

Step 2: List all nodes using 'list-nodes'.

Step 3: For each deployment policy, check deployments using 'check-policy-deployments'.

Step 4: Analyze and provide:
1. **Policy Coverage**:
   - Total number of deployment policies
   - Policies with active deployments
   - Policies without any deployments (unused)
   - Coverage percentage (nodes with policies vs. total nodes)
2. **Service Distribution**:
   - Services covered by policies
   - Services without policy coverage
   - Most deployed services
3. **Node Coverage**:
   - Nodes with active deployments
   - Nodes without deployments
   - Nodes matching multiple policies
4. **Policy Effectiveness**:
   - Policies with high deployment success rates
   - Policies with deployment failures
   - Constraint effectiveness analysis
5. **Recommendations**:
   - Unused policies to remove
   - Gaps in service coverage
   - Policy consolidation opportunities
   - Optimization suggestions`
            }
          }
        ]
      };
    }
  );

  // Prompt: optimize-policy-constraints
  server.prompt(
    'optimize-policy-constraints',
    {
      policyName: z.string().optional(),
      org: z.string().optional(),
    },
    ({ policyName, org }: { policyName?: string; org?: string }) => {
      const policyFilter = policyName ? ` for policy "${policyName}"` : ' for all policies';
      
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Please analyze and optimize policy constraints${policyFilter}.

Step 1: List deployment policies using 'list-deployment-policies'${org ? ` with org "${org}"` : ''}.

${policyName ? `Step 2: Get details for policy "${policyName}" using 'manage-deployment-policy'.

Step 3: Check which nodes match this policy using 'check-policy-compatibility'.

Step 4: Check current deployments using 'check-policy-deployments'.` : `Step 2: For each policy, analyze its constraints and deployment patterns.`}

Step 5: Analyze constraint effectiveness:
1. **Current Constraints**:
   - List all constraints in the policy
   - Constraint complexity analysis
   - Constraint specificity
2. **Matching Analysis**:
   - Number of nodes matching constraints
   - Nodes excluded by constraints
   - Over-constrained vs. under-constrained
3. **Deployment Patterns**:
   - Successful deployments
   - Failed deployments due to constraints
   - Constraint conflicts
4. **Optimization Opportunities**:
   - Redundant constraints to remove
   - Missing constraints to add
   - Constraint simplification options
   - Alternative constraint formulations
5. **Recommendations**:
   - Optimized constraint set
   - Expected impact on deployments
   - Testing strategy for changes
   - Rollback considerations`
            }
          }
        ]
      };
    }
  );

  // Prompt: analyze-policy-conflicts
  server.prompt(
    'analyze-policy-conflicts',
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
              text: `Please identify and analyze policy conflicts in the Open Horizon infrastructure.

Step 1: List all deployment policies using 'list-deployment-policies'${org ? ` with org "${org}"` : ''}.

Step 2: List all nodes using 'list-nodes'.

Step 3: For each node, get its policy using 'get-node-policy'.

Step 4: Analyze for conflicts:
1. **Constraint Conflicts**:
   - Deployment policies with conflicting constraints
   - Node policies conflicting with deployment policies
   - Mutually exclusive constraint combinations
2. **Service Conflicts**:
   - Multiple policies deploying same service
   - Version conflicts between policies
   - Resource contention issues
3. **Priority Conflicts**:
   - Policies with conflicting priority settings
   - Agreement negotiation conflicts
   - Service upgrade conflicts
4. **Property Conflicts**:
   - Incompatible property requirements
   - Property value mismatches
   - Missing required properties
5. **Resolution Strategies**:
   - Recommended fixes for each conflict
   - Policy consolidation opportunities
   - Node policy adjustments needed
   - Service version alignment

Provide:
- Conflict severity ratings (critical, warning, info)
- Impact assessment for each conflict
- Step-by-step resolution plans
- Prevention recommendations`
            }
          }
        ]
      };
    }
  );

  // Prompt: generate-policy-report
  server.prompt(
    'generate-policy-report',
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
              text: `Please generate a comprehensive report for deployment policy "${policyName}".

Step 1: Get policy details using 'manage-deployment-policy':
{
  "name": "${policyName}",
  "operation": "get"${org ? `,\n  "org": "${org}"` : ''}
}

Step 2: Check policy compatibility using 'check-policy-compatibility'.

Step 3: Check current deployments using 'check-policy-deployments'.

Step 4: List all nodes to analyze potential deployment targets.

Step 5: Generate comprehensive report:
1. **Policy Overview**:
   - Policy name and description
   - Creation and last update dates
   - Service configuration
   - Architecture and version details
2. **Constraints Analysis**:
   - All constraints defined
   - Constraint logic explanation
   - Nodes matching constraints
   - Nodes excluded by constraints
3. **Properties Analysis**:
   - All properties defined
   - Property usage and purpose
   - Property value distribution
4. **Deployment Status**:
   - Total deployments (active, pending, failed)
   - Node distribution
   - Agreement states
   - Success rate
5. **Service Details**:
   - Service name and version
   - Container configuration
   - Resource requirements
   - Dependencies
6. **User Inputs**:
   - Required inputs
   - Optional inputs
   - Default values
   - Input validation
7. **Performance Metrics**:
   - Deployment success rate
   - Average deployment time
   - Failure patterns
8. **Recommendations**:
   - Policy optimization suggestions
   - Constraint improvements
   - Deployment strategy recommendations
   - Monitoring and alerting setup`
            }
          }
        ]
      };
    }
  );

  // Prompt: recommend-policy-improvements
  server.prompt(
    'recommend-policy-improvements',
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
              text: `Please analyze all policies and recommend improvements.

Step 1: List all deployment policies using 'list-deployment-policies'${org ? ` with org "${org}"` : ''}.

Step 2: For each policy:
- Get policy details using 'manage-deployment-policy'
- Check deployments using 'check-policy-deployments'
- Check compatibility using 'check-policy-compatibility'

Step 3: List all nodes and analyze their policies.

Step 4: Analyze and recommend improvements:
1. **Policy Structure**:
   - Policies with unclear naming
   - Missing descriptions
   - Incomplete configurations
   - Documentation needs
2. **Constraint Optimization**:
   - Over-constrained policies (too restrictive)
   - Under-constrained policies (too permissive)
   - Redundant constraints
   - Missing important constraints
3. **Service Configuration**:
   - Outdated service versions
   - Missing service dependencies
   - Suboptimal priority settings
   - Resource allocation issues
4. **Deployment Efficiency**:
   - Policies with low deployment success
   - Policies causing frequent failures
   - Policies with long deployment times
   - Policies needing retry configuration
5. **Best Practices**:
   - Alignment with Open Horizon best practices
   - Security considerations
   - High availability setup
   - Disaster recovery readiness
6. **Consolidation Opportunities**:
   - Similar policies that could be merged
   - Duplicate functionality
   - Policy hierarchy optimization
7. **Action Plan**:
   - Prioritized list of improvements
   - Implementation steps for each
   - Expected benefits
   - Risk assessment`
            }
          }
        ]
      };
    }
  );

  // Prompt: analyze-deployment-patterns
  server.prompt(
    'analyze-deployment-patterns',
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
              text: `Please analyze deployment patterns across the Open Horizon infrastructure.

Step 1: List all deployment policies using 'list-deployment-policies'${org ? ` with org "${org}"` : ''}.

Step 2: List all nodes using 'list-nodes'.

Step 3: For each policy, check deployments using 'check-policy-deployments'.

Step 4: Analyze patterns:
1. **Deployment Distribution**:
   - Services most frequently deployed
   - Services rarely deployed
   - Deployment density by node type
   - Geographic or logical distribution patterns
2. **Temporal Patterns**:
   - Deployment timing patterns
   - Update frequency
   - Peak deployment periods
   - Deployment lifecycle patterns
3. **Success Patterns**:
   - Policies with consistent success
   - Policies with intermittent failures
   - Common failure scenarios
   - Recovery patterns
4. **Architecture Patterns**:
   - Deployment by architecture (amd64, arm64, arm)
   - Multi-architecture deployment strategies
   - Architecture-specific issues
5. **Constraint Patterns**:
   - Most common constraint types
   - Effective constraint patterns
   - Problematic constraint patterns
   - Constraint evolution over time
6. **Node Patterns**:
   - Nodes with multiple services
   - Nodes with single services
   - Node specialization patterns
   - Node utilization patterns
7. **Insights and Recommendations**:
   - Emerging patterns to leverage
   - Anti-patterns to avoid
   - Optimization opportunities
   - Capacity planning insights
   - Best practices derived from patterns`
            }
          }
        ]
      };
    }
  );

  // Prompt: validate-policy-compliance
  server.prompt(
    'validate-policy-compliance',
    {
      policyName: z.string().optional(),
      org: z.string().optional(),
    },
    ({ policyName, org }: { policyName?: string; org?: string }) => {
      const policyFilter = policyName ? ` for policy "${policyName}"` : ' for all policies';
      
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Please validate policy compliance with Open Horizon best practices${policyFilter}.

Step 1: List deployment policies using 'list-deployment-policies'${org ? ` with org "${org}"` : ''}.

${policyName ? `Step 2: Get details for policy "${policyName}" using 'manage-deployment-policy'.` : `Step 2: For each policy, get its details.`}

Step 3: Validate against best practices:
1. **Naming Conventions**:
   - Policy name follows conventions
   - Descriptive and meaningful names
   - Consistent naming patterns
2. **Documentation**:
   - Label is descriptive
   - Description is comprehensive
   - Purpose is clear
3. **Service Configuration**:
   - Service version is specified
   - Architecture is appropriate
   - Priority settings are reasonable
   - Retry configuration is present
4. **Constraints**:
   - Constraints are well-formed
   - Constraints are necessary
   - Constraints are not overly restrictive
   - Constraints use proper syntax
5. **Properties**:
   - Properties are documented
   - Property values are appropriate
   - Properties serve clear purposes
6. **Security**:
   - Deployment signatures present
   - Service verification enabled
   - Secure configuration practices
7. **High Availability**:
   - HA considerations addressed
   - Redundancy where appropriate
   - Failover capabilities
8. **Compliance Score**:
   - Overall compliance rating
   - Critical issues
   - Warnings
   - Recommendations

Provide:
- Detailed compliance report
- Non-compliant items with severity
- Remediation steps
- Best practice guidelines`
            }
          }
        ]
      };
    }
  );
}

// Made with Bob