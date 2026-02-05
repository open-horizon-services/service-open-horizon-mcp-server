/**
 * service-management.ts
 * 
 * MCP prompts for service management in Open Horizon
 */

import { z } from 'zod';

/**
 * Register service management prompts with the MCP server
 */
export function registerServiceManagementPrompts(server: any) {
  // Prompt: publish-new-service
  server.prompt(
    'publish-new-service',
    {
      serviceName: z.string(),
      serviceVersion: z.string(),
      containerImage: z.string(),
      arch: z.string().optional(),
      org: z.string().optional(),
    },
    ({ serviceName, serviceVersion, containerImage, arch, org }: { 
      serviceName: string;
      serviceVersion: string;
      containerImage: string;
      arch?: string;
      org?: string;
    }) => {
      const architecture = arch || 'amd64';
      
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Please publish a new service "${serviceName}" version ${serviceVersion} to the Open Horizon Exchange.

Step 1: Generate the service definition using 'generate-service-definition':
{
  "serviceName": "${serviceName}",
  "serviceVersion": "${serviceVersion}",
  "containerImage": "${containerImage}",
  "arch": "${architecture}"${org ? `,\n  "org": "${org}"` : ''}
}

Step 2: Review the generated service definition and make any necessary adjustments.

Step 3: Publish the service using 'publish-service':
{
  "serviceDefinition": <generated_definition>${org ? `,\n  "org": "${org}"` : ''}
}

Step 4: Verify the service was published successfully using 'get-service-details':
{
  "serviceId": "${serviceName}_${serviceVersion}_${architecture}"${org ? `,\n  "org": "${org}"` : ''}
}

Provide:
1. Confirmation of successful publication
2. Service details summary
3. Next steps for creating a deployment policy
4. Recommendations for service configuration
5. Example deployment policy snippet`
            }
          }
        ]
      };
    }
  );

  // Prompt: analyze-service-catalog
  server.prompt(
    'analyze-service-catalog',
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
              text: `Please analyze the service catalog in the Open Horizon Exchange.

Step 1: List all services using 'list-services'${org ? ` with org "${org}"` : ''}.

Step 2: For each service, get detailed information using 'get-service-details'.

Step 3: Analyze and provide:
1. **Service Inventory**:
   - Total number of services
   - Services by architecture (amd64, arm64, arm)
   - Version distribution
2. **Service Categories**:
   - Group services by type or purpose
   - Identify core vs. application services
3. **Deployment Status**:
   - Which services are actively deployed
   - Which services are unused
4. **Version Management**:
   - Services with multiple versions
   - Latest versions for each service
   - Deprecated or outdated versions
5. **Recommendations**:
   - Services that need updates
   - Consolidation opportunities
   - Missing services or gaps in catalog
   - Best practices for service organization`
            }
          }
        ]
      };
    }
  );

  // Prompt: update-service-version
  server.prompt(
    'update-service-version',
    {
      serviceName: z.string(),
      currentVersion: z.string(),
      newVersion: z.string(),
      containerImage: z.string(),
      arch: z.string().optional(),
      org: z.string().optional(),
    },
    ({ serviceName, currentVersion, newVersion, containerImage, arch, org }: { 
      serviceName: string;
      currentVersion: string;
      newVersion: string;
      containerImage: string;
      arch?: string;
      org?: string;
    }) => {
      const architecture = arch || 'amd64';
      
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Please update service "${serviceName}" from version ${currentVersion} to ${newVersion}.

Step 1: Get current service details using 'get-service-details':
{
  "serviceId": "${serviceName}_${currentVersion}_${architecture}"${org ? `,\n  "org": "${org}"` : ''}
}

Step 2: Generate new service definition using 'generate-service-definition':
{
  "serviceName": "${serviceName}",
  "serviceVersion": "${newVersion}",
  "containerImage": "${containerImage}",
  "arch": "${architecture}"${org ? `,\n  "org": "${org}"` : ''}
}

Step 3: Publish the new version using 'publish-service'.

Step 4: Check which deployment policies reference the old version using 'list-deployment-policies'.

Step 5: Provide update plan including:
1. **Service Changes**: Differences between versions
2. **Deployment Impact**: Policies and nodes affected
3. **Update Strategy**: 
   - Recommended rollout approach
   - Testing requirements
   - Rollback plan
4. **Policy Updates**: Which policies need updating
5. **Migration Steps**: Detailed commands to execute
6. **Verification**: How to confirm successful update`
            }
          }
        ]
      };
    }
  );

  // Prompt: compare-service-versions
  server.prompt(
    'compare-service-versions',
    {
      serviceName: z.string(),
      version1: z.string(),
      version2: z.string(),
      arch: z.string().optional(),
      org: z.string().optional(),
    },
    ({ serviceName, version1, version2, arch, org }: { 
      serviceName: string;
      version1: string;
      version2: string;
      arch?: string;
      org?: string;
    }) => {
      const architecture = arch || 'amd64';
      
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Please compare versions ${version1} and ${version2} of service "${serviceName}".

Step 1: Get details for version ${version1} using 'get-service-details':
{
  "serviceId": "${serviceName}_${version1}_${architecture}"${org ? `,\n  "org": "${org}"` : ''}
}

Step 2: Get details for version ${version2} using 'get-service-details':
{
  "serviceId": "${serviceName}_${version2}_${architecture}"${org ? `,\n  "org": "${org}"` : ''}
}

Step 3: Compare and analyze:
1. **Container Images**:
   - Image differences
   - Size changes
   - Base image updates
2. **Configuration**:
   - Environment variables
   - Volume mounts
   - Port mappings
   - Resource requirements
3. **Dependencies**:
   - Required services
   - Dependency version changes
4. **User Inputs**:
   - New or removed inputs
   - Default value changes
5. **Deployment Signature**:
   - Signature verification status
   - Key changes
6. **Recommendations**:
   - Which version to use for new deployments
   - Migration considerations
   - Breaking changes to be aware of`
            }
          }
        ]
      };
    }
  );

  // Prompt: troubleshoot-service-issues
  server.prompt(
    'troubleshoot-service-issues',
    {
      serviceName: z.string().optional(),
      org: z.string().optional(),
    },
    ({ serviceName, org }: { serviceName?: string; org?: string }) => {
      const serviceFilter = serviceName ? ` for service "${serviceName}"` : '';
      
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Please troubleshoot service issues${serviceFilter}.

Step 1: List all services using 'list-services'${org ? ` with org "${org}"` : ''}.

${serviceName ? `Step 2: Get detailed information for "${serviceName}" using 'get-service-details'.

Step 3: Check deployment policies referencing this service using 'list-deployment-policies'.

Step 4: Check which nodes are running this service using 'list-nodes'.` : `Step 2: For each service, check its deployment status and configuration.`}

Step 5: Analyze and identify:
1. **Configuration Issues**:
   - Missing or invalid deployment signatures
   - Incorrect container image references
   - Invalid user input definitions
   - Resource constraint problems
2. **Deployment Issues**:
   - Services not being deployed to nodes
   - Agreement negotiation failures
   - Policy compatibility problems
3. **Version Issues**:
   - Multiple versions causing conflicts
   - Deprecated versions still in use
   - Version rollback needs
4. **Dependency Issues**:
   - Missing required services
   - Incompatible dependency versions
   - Circular dependencies

Provide:
1. **Issue Summary**: List of identified problems
2. **Root Cause Analysis**: Why each issue is occurring
3. **Resolution Steps**: Specific commands to fix each issue
4. **Prevention**: How to avoid similar issues
5. **Monitoring**: What to watch for ongoing health`
            }
          }
        ]
      };
    }
  );

  // Prompt: retire-service
  server.prompt(
    'retire-service',
    {
      serviceName: z.string(),
      serviceVersion: z.string(),
      arch: z.string().optional(),
      org: z.string().optional(),
    },
    ({ serviceName, serviceVersion, arch, org }: { 
      serviceName: string;
      serviceVersion: string;
      arch?: string;
      org?: string;
    }) => {
      const architecture = arch || 'amd64';
      
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Please create a retirement plan for service "${serviceName}" version ${serviceVersion}.

Step 1: Get service details using 'get-service-details':
{
  "serviceId": "${serviceName}_${serviceVersion}_${architecture}"${org ? `,\n  "org": "${org}"` : ''}
}

Step 2: Check deployment policies using this service with 'list-deployment-policies'.

Step 3: Check active deployments using 'list-nodes' to find nodes running this service.

Step 4: Create retirement plan including:
1. **Impact Assessment**:
   - Number of policies using this service
   - Number of nodes with active deployments
   - Dependent services or applications
2. **Migration Plan**:
   - Recommended replacement service/version
   - Policy updates required
   - Node migration strategy
3. **Retirement Steps**:
   - Update all deployment policies to use new version
   - Wait for nodes to upgrade
   - Verify no active deployments remain
   - Delete the service using 'delete-service'
4. **Timeline**:
   - Recommended phases and duration
   - Checkpoints for verification
5. **Rollback Plan**:
   - How to restore service if needed
   - Backup considerations
6. **Communication**:
   - Stakeholders to notify
   - Documentation updates needed`
            }
          }
        ]
      };
    }
  );

  // Prompt: validate-service-definition
  server.prompt(
    'validate-service-definition',
    {
      serviceDefinition: z.any(),
      org: z.string().optional(),
    },
    ({ serviceDefinition, org }: { serviceDefinition: any; org?: string }) => {
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Please validate the provided service definition before publishing.

Service Definition:
\`\`\`json
${JSON.stringify(serviceDefinition, null, 2)}
\`\`\`

Validation checks to perform:
1. **Required Fields**:
   - url (service name)
   - version
   - arch
   - deployment (with services configuration)
   - deploymentSignature (if required)
2. **Container Configuration**:
   - Valid container image reference
   - Proper port mappings
   - Volume mount configurations
   - Environment variables
3. **User Inputs**:
   - Proper input definitions
   - Valid default values
   - Required vs. optional inputs
4. **Dependencies**:
   - Valid service references
   - Version compatibility
   - Architecture matching
5. **Best Practices**:
   - Descriptive label and description
   - Appropriate resource limits
   - Security considerations
   - Logging configuration

Provide:
1. **Validation Results**: Pass/fail for each check
2. **Issues Found**: Detailed list of problems
3. **Recommendations**: How to fix each issue
4. **Warnings**: Non-critical issues to be aware of
5. **Approval**: Whether the service is ready to publish`
            }
          }
        ]
      };
    }
  );
}

// Made with Bob