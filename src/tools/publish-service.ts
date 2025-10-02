/**
 * publish-service.ts
 * 
 * MCP tool for publishing a service to the Open Horizon Exchange
 */

import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  makeHttpRequest,
  makePostRequest,
  getErrorMessage,
  getExchangeParams,
  addDeploymentSignatureFromKey,
  generateDeploymentSignatureFromKey,
  signServiceDefinition
} from '../services/common';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Register the publish-service tool with the MCP server
 */
export function registerPublishServiceTool(server: McpServer) {
  const toolName = 'publish-service';
  const toolDescription = `
    Use this tool to publish a service to the Open Horizon Exchange.
    
    You can either:
    1. Provide a complete service definition as JSON
    2. Use a template and provide the necessary parameters
    
    For option 2, you need to specify:
    - templateType: "basic" or "with-inputs"
    - serviceName: The name of the service
    - serviceVersion: The version of the service
    - serviceContainer: The container image for the service
    - arch: The architecture (default: "amd64")
    - Additional parameters as needed
  `;
  const toolSchema = {
    serviceDefinition: z.union([
      z.string().describe('Service definition as JSON string'),
      z.record(z.any()).describe('Service definition as JSON object')
    ]).describe('Complete service definition as JSON string or object'),
    org: z.string().optional().describe('Organization ID. If not provided, uses the default organization.'),
    // Keep template parameters as fallback
    templateType: z.enum(['basic', 'with-inputs']).optional().describe('Type of template to use: "basic" or "with-inputs"'),
    serviceName: z.string().optional().describe('The name of the service (only needed if not using complete serviceDefinition)'),
    serviceVersion: z.string().optional().describe('The version of the service (only needed if not using complete serviceDefinition)'),
    serviceContainer: z.string().optional().describe('The container image for the service (only needed if not using complete serviceDefinition)'),
    arch: z.string().optional().describe('The architecture (default: "amd64")'),
    volumeMount: z.string().optional().describe('The volume mount path (default: "/mms-shared")'),
    exposePort: z.string().optional().describe('The port to expose (default: "3000")'),
    appPort: z.string().optional().describe('The application port (default: "3000")'),
    mmsObjectType: z.string().optional().describe('The MMS object type (for with-inputs template)'),
    mmsVolume: z.string().optional().describe('The MMS volume (for with-inputs template)'),
    updateFileName: z.string().optional().describe('The update file name (for with-inputs template)'),
  };
  
  const toolCallback = async (params: any, context: any): Promise<any> => {
    try {
      // Access headers from the shared context
      const {url, credential, organization} = getExchangeParams(params, context);
      let serviceDefinition;
      
      // Process the serviceDefinition parameter
      if (params.serviceDefinition) {
        console.log('Original serviceDefinition:', typeof params.serviceDefinition);
        
        // Check if serviceDefinition is a string (JSON string) or an object
        if (typeof params.serviceDefinition === 'string') {
          try {
            serviceDefinition = JSON.parse(params.serviceDefinition);
            console.log('Parsed from JSON string');
          } catch (parseError) {
            console.log('Parsing error:', parseError);
            
            // Try handling escaped JSON strings
            try {
              const unescapedString = params.serviceDefinition.replace(/\\"/g, '"');
              serviceDefinition = JSON.parse(unescapedString);
              console.log('Parsed after unescaping quotes');
            } catch (unescapeError) {
              console.log('Unescaping quotes failed:', unescapeError);
              
              // If that also fails, try removing outer quotes and then parsing
              const trimmedString = params.serviceDefinition.trim();
              
              if (
                (trimmedString.startsWith('"') && trimmedString.endsWith('"')) ||
                (trimmedString.startsWith("'") && trimmedString.endsWith("'")) ||
                (trimmedString.startsWith('`') && trimmedString.endsWith('`'))
              ) {
                const innerString = trimmedString.substring(1, trimmedString.length - 1);
                
                try {
                  serviceDefinition = JSON.parse(innerString);
                  console.log('Parsed after removing outer quotes');
                } catch (innerParseError) {
                  console.log('Parsing after removing outer quotes failed:', innerParseError);
                  return getErrorMessage(`Invalid serviceDefinition: Not a valid JSON string`);
                }
              } else {
                return getErrorMessage(`Invalid serviceDefinition: Not a valid JSON string`);
              }
            }
          }
        } else {
          // It's already an object
          serviceDefinition = params.serviceDefinition;
          console.log('Using object directly');
        }
      }
      // If a complete service definition is not provided, build one from template
      else {
        if (!params.templateType) {
          return getErrorMessage("Either serviceDefinition or templateType must be provided");
        }
        
        if (!params.serviceName) {
          return getErrorMessage("Service name is required when using a template");
        }
        
        if (!params.serviceVersion) {
          return getErrorMessage("Service version is required when using a template");
        }
        
        if (!params.serviceContainer) {
          return getErrorMessage("Service container image is required when using a template");
        }
        
        // Load the appropriate template
        let templatePath;
        if (params.templateType === 'basic') {
          templatePath = path.join(process.cwd(), 'templates', 'service-definition.json');
        } else {
          templatePath = path.join(process.cwd(), 'templates', 'service-definition-with-inputs.json');
        }
        
        console.log(`Loading template from ${templatePath}`);
        let templateContent;
        try {
          templateContent = await fs.readFile(templatePath, 'utf8');
        } catch (error) {
          return getErrorMessage(`Error reading template file: ${error}`);
        }
        
        // Replace variables in the template
        const arch = params.arch || 'amd64';
        const volumeMount = params.volumeMount || '/mms-shared';
        const exposePort = params.exposePort || '3000';
        const appPort = params.appPort || '3000';
        
        templateContent = templateContent
          .replace(/\$HZN_ORG_ID/g, organization)
          .replace(/\$SERVICE_NAME/g, params.serviceName)
          .replace(/\$SERVICE_VERSION/g, params.serviceVersion)
          .replace(/\$SERVICE_CONTAINER/g, params.serviceContainer)
          .replace(/\$ARCH/g, arch)
          .replace(/\$VOLUME_MOUNT/g, volumeMount)
          .replace(/\$MMS_SHARED_VOLUME/g, params.mmsVolume || 'mms_shared_volume')
          .replace(/\$EXPOSE_PORT/g, exposePort)
          .replace(/\$APP_PORT/g, appPort);
        
        // Additional replacements for with-inputs template
        if (params.templateType === 'with-inputs') {
          templateContent = templateContent
            .replace(/\$MMS_SERVICE_NAME/g, params.serviceName)
            .replace(/\$MMS_SERVICE_VERSION/g, params.serviceVersion)
            .replace(/\$MMS_CONTAINER/g, params.serviceContainer)
            .replace(/\$MMS_OBJECT_TYPE/g, params.mmsObjectType || 'mms_agent_config')
            .replace(/\$UPDATE_FILE_NAME/g, params.updateFileName || 'mms-agent-config.json');
        }
        
        // Parse the template into a JSON object
        try {
          serviceDefinition = JSON.parse(templateContent);
        } catch (error) {
          return getErrorMessage(`Error parsing template: ${error}`);
        }
      }
      
      // Publish the service to the Exchange
      const serviceUrl = `${url}/${organization}/services/${serviceDefinition.url}_${serviceDefinition.version}_${serviceDefinition.arch}`;
      console.log(`Publishing service to Exchange at ${serviceUrl}`);
      console.log('Service definition:', JSON.stringify(serviceDefinition, null, 2));
      
      // Fix Docker image URL format if needed
      // Docker Hub images should not include "hub.docker.com/" prefix
      if (serviceDefinition.deployment && typeof serviceDefinition.deployment === 'object') {
        const services = serviceDefinition.deployment.services || {};
        for (const serviceName in services) {
          const service = services[serviceName];
          if (service.image && service.image.startsWith('hub.docker.com/')) {
            service.image = service.image.replace('hub.docker.com/', '');
            console.log(`Fixed Docker image URL: ${service.image}`);
          }
        }
      }
      
      // Convert deployment field to a string if it's an object
      // This is required by the Open Horizon Exchange API
      if (serviceDefinition.deployment && typeof serviceDefinition.deployment === 'object') {
        serviceDefinition.deployment = JSON.stringify(serviceDefinition.deployment);
        console.log('Converted deployment to string:', serviceDefinition.deployment);
      }
      
      // Remove the "org" field from the service definition
      // The API doesn't expect this field in the request body
      if ('org' in serviceDefinition) {
        console.log('Removing "org" field from service definition');
        delete serviceDefinition.org;
      }
      
      // Sign the service definition using the environment variable private key
      // This will work in CodeEngine and other environments where the PRIVATE_KEY env var is set
      const signedServiceDefinition = signServiceDefinition(serviceDefinition);
      console.log('Service definition signed:', signedServiceDefinition.deploymentSignature ? 'Yes' : 'No');
      
      const response = await makePostRequest(serviceUrl, signedServiceDefinition, {
        Authorization: `Basic ${credential}`
      }, 'PUT');
      
      // If response has content property, it's already formatted as ToolResponse (error case)
      if (response && typeof response === 'object' && 'content' in response) {
        return response;
      }
      
      return {
        content: [
          {
            type: 'text',
            text: `Successfully published service "${serviceDefinition.url}" version ${serviceDefinition.version} for architecture ${serviceDefinition.arch} to organization ${organization}.`
          }
        ]
      };
    } catch (error) {
      console.error(`Error publishing service: ${error}`);
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
