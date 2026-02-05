# Open Horizon MCP Prompts

This directory contains MCP prompts that provide guided workflows for managing Open Horizon infrastructure. Prompts are pre-configured conversation starters that help users accomplish complex tasks by providing step-by-step instructions to the AI assistant.

## How Prompts Work

When a user invokes a prompt, the MCP server sends a pre-formatted message to the AI assistant (like Claude) that includes:
1. Context about what needs to be done
2. Step-by-step instructions for using the available tools
3. Expected output format and analysis requirements

The AI assistant then follows these instructions to help the user complete the task.

## How to Use Prompts

### In Claude Desktop or MCP-Compatible Clients

Prompts appear in the client's prompt selector. Users can:

1. **Browse available prompts** - View all registered prompts in the prompt picker
2. **Select a prompt** - Choose the prompt that matches their task
3. **Provide parameters** - Fill in any required parameters (like service name, policy name, etc.)
4. **Execute** - The AI receives the prompt instructions and begins helping

### Example: Using the "validate-service-definition" Prompt

#### Scenario
You have a service definition JSON and want to validate it before publishing to Open Horizon.

#### Step 1: Select the Prompt
In your MCP client (e.g., Claude Desktop), open the prompt selector and choose:
```
validate-service-definition
```

#### Step 2: Provide Parameters
The prompt requires:
- `serviceDefinition`: Your service definition as a JSON object
- `org` (optional): Organization ID

Example input:
```json
{
  "serviceDefinition": {
    "url": "my-service",
    "version": "1.0.0",
    "arch": "amd64",
    "deployment": {
      "services": {
        "my-service": {
          "image": "myrepo/my-service:1.0.0"
        }
      }
    }
  },
  "org": "myorg"
}
```

#### Step 3: AI Assistant Takes Over
Once you invoke the prompt, the AI assistant receives these instructions:

```
Please validate the provided service definition before publishing.

Service Definition:
{
  "url": "my-service",
  "version": "1.0.0",
  ...
}

Validation checks to perform:
1. Required Fields:
   - url (service name)
   - version
   - arch
   - deployment (with services configuration)
   - deploymentSignature (if required)
2. Container Configuration:
   - Valid container image reference
   - Proper port mappings
   - Volume mount configurations
   - Environment variables
3. User Inputs:
   - Proper input definitions
   - Valid default values
   - Required vs. optional inputs
...
```

#### Step 4: AI Performs Validation
The AI assistant will:
1. Analyze your service definition
2. Check each validation criterion
3. Identify any issues or missing fields
4. Provide recommendations for fixes
5. Give you a compliance score

#### Step 5: You Receive Results
The AI responds with a comprehensive validation report:

```
# Service Definition Validation Report

## Validation Results

✅ Required Fields: PASS
- url: "my-service" ✓
- version: "1.0.0" ✓
- arch: "amd64" ✓
- deployment: Present ✓

⚠️ Deployment Signature: WARNING
- No deployment signature found
- Recommendation: Add signature for production deployments

✅ Container Configuration: PASS
- Image: "myrepo/my-service:1.0.0" ✓
- Valid image format ✓

## Issues Found

1. **Missing Description** (Warning)
   - The service definition lacks a description field
   - Recommendation: Add a description for better documentation

2. **No User Inputs Defined** (Info)
   - No user inputs are defined
   - If your service needs configuration, add userInput section

## Compliance Score: 85/100

## Recommendations
1. Add deployment signature before publishing to production
2. Add description field for documentation
3. Consider adding user inputs if service needs configuration

## Approval Status
✅ Ready to publish with warnings addressed
```

## Available Prompt Categories

### 1. Deployment Management (6 prompts)
- `create-deployment-policy` - Create new deployment policies
- `analyze-deployment-status` - Check policy deployment status
- `update-deployment-constraints` - Modify policy constraints
- `compare-deployment-policies` - Compare two policies
- `troubleshoot-deployment-failures` - Debug deployment issues
- `rollout-deployment-policy` - Plan service rollouts

### 2. Service Management (7 prompts)
- `publish-new-service` - Publish services to Exchange
- `analyze-service-catalog` - Review all services
- `update-service-version` - Update service versions
- `compare-service-versions` - Compare service versions
- `troubleshoot-service-issues` - Debug service problems
- `retire-service` - Plan service retirement
- `validate-service-definition` - Validate service configs

### 3. Node Management (7 prompts)
- `analyze-node-inventory` - Review all nodes
- `configure-node-policy` - Set node policies
- `troubleshoot-node-issues` - Debug node problems
- `manage-ha-group-membership` - Manage HA groups
- `unregister-inactive-nodes` - Clean up stale nodes
- `monitor-node-health` - Check node health
- `plan-node-migration` - Plan node migrations

### 4. Policy Analysis (7 prompts)
- `analyze-policy-coverage` - Review policy coverage
- `optimize-policy-constraints` - Improve constraints
- `analyze-policy-conflicts` - Find policy conflicts
- `generate-policy-report` - Create policy reports
- `recommend-policy-improvements` - Get optimization suggestions
- `analyze-deployment-patterns` - Identify patterns
- `validate-policy-compliance` - Check best practices

## Benefits of Using Prompts

1. **Guided Workflows** - Step-by-step instructions for complex tasks
2. **Consistency** - Standardized approach to common operations
3. **Best Practices** - Built-in recommendations and validations
4. **Time Saving** - Pre-configured instructions reduce back-and-forth
5. **Learning Tool** - Helps users understand Open Horizon concepts
6. **Error Prevention** - Validation and checks before making changes

## Prompt vs. Direct Tool Use

### Using Tools Directly
```
User: "Can you check if my service definition is valid?"
AI: "I'll need to see your service definition first..."
User: [provides JSON]
AI: "Let me check the fields..."
[Multiple back-and-forth exchanges]
```

### Using a Prompt
```
User: [Selects "validate-service-definition" prompt with JSON]
AI: [Immediately performs comprehensive validation with detailed report]
```

The prompt provides the AI with complete context and instructions upfront, resulting in faster, more comprehensive assistance.

## Creating Custom Prompts

If you need to create additional prompts for your specific workflows, follow the pattern in the existing prompt files:

```typescript
server.prompt(
  'my-custom-prompt',
  {
    // Define parameters with zod validation
    param1: z.string(),
    param2: z.string().optional(),
  },
  ({ param1, param2 }) => {
    return {
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Your detailed instructions here...
            
            Step 1: Do this...
            Step 2: Do that...
            
            Provide:
            1. Analysis
            2. Recommendations
            3. Next steps`
          }
        }
      ]
    };
  }
);
```

## Support

For issues or questions about prompts, refer to the main Open Horizon MCP server documentation or the individual prompt source files for implementation details.

---
Made with Bob