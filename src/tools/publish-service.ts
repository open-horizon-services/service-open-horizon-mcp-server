/**
 * publish-service.ts
 * 
 * MCP tool for publishing a service to the Open Horizon Exchange
 */

import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { makeHttpRequest, makePostRequest, getErrorMessage } from '../services/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import 'dotenv/config';

const EXCHANGE_URL = process.env.EXCHANGE_URL;
const ORG = process.env.EXCHANGE_ORG;

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
    serviceDefinition: z.any().optional().describe('Complete service definition as JSON'),
    templateType: z.enum(['basic', 'with-inputs']).optional().describe('Type of template to use: "basic" or "with-inputs"'),
    serviceName: z.string().optional().describe('The name of the service'),
    serviceVersion: z.string().optional().describe('The version of the service'),
    serviceContainer: z.string().optional().describe('The container image for the service'),
    arch: z.string().optional().describe('The architecture (default: "amd64")'),
    volumeMount: z.string().optional().describe('The volume mount path (default: "/mms-shared")'),
    exposePort: z.string().optional().describe('The port to expose (default: "3000")'),
    appPort: z.string().optional().describe('The application port (default: "3000")'),
    mmsObjectType: z.string().optional().describe('The MMS object type (for with-inputs template)'),
    mmsVolume: z.string().optional().describe('The MMS volume (for with-inputs template)'),
    updateFileName: z.string().optional().describe('The update file name (for with-inputs template)'),
    org: z.string().optional().describe('Organization ID. If not provided, uses the default organization.'),
  };
  
  const toolCallback = async (params: any): Promise<any> => {
    try {
      const organization = params.org || ORG;
      let serviceDefinition = params.serviceDefinition;
      
      // If a complete service definition is not provided, build one from template
      if (!serviceDefinition) {
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
          templatePath = path.join(process.cwd(), 'open-horizon-mcp-v2', 'templates', 'service-definition.json');
        } else {
          templatePath = path.join(process.cwd(), 'open-horizon-mcp-v2', 'templates', 'service-definition-with-inputs.json');
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
          .replace(/\\$HZN_ORG_ID/g, organization)
          .replace(/\\$SERVICE_NAME/g, params.serviceName)
          .replace(/\\$SERVICE_VERSION/g, params.serviceVersion)
          .replace(/\\$SERVICE_CONTAINER/g, params.serviceContainer)
          .replace(/\\$ARCH/g, arch)
          .replace(/\\$VOLUME_MOUNT/g, volumeMount)
          .replace(/\\$MMS_SHARED_VOLUME/g, params.mmsVolume || 'mms_shared_volume')
          .replace(/\\$EXPOSE_PORT/g, exposePort)
          .replace(/\\$APP_PORT/g, appPort);
        
        // Additional replacements for with-inputs template
        if (params.templateType === 'with-inputs') {
          templateContent = templateContent
            .replace(/\\$MMS_SERVICE_NAME/g, params.serviceName)
            .replace(/\\$MMS_SERVICE_VERSION/g, params.serviceVersion)
            .replace(/\\$MMS_CONTAINER/g, params.serviceContainer)
            .replace(/\\$MMS_OBJECT_TYPE/g, params.mmsObjectType || 'mms_agent_config')
            .replace(/\\$UPDATE_FILE_NAME/g, params.updateFileName || 'mms-agent-config.json');
        }
        
        // Parse the template into a JSON object
        try {
          serviceDefinition = JSON.parse(templateContent);
        } catch (error) {
          return getErrorMessage(`Error parsing template: ${error}`);
        }
      }
      
      // Publish the service to the Exchange
      const serviceUrl = `${EXCHANGE_URL}/${organization}/services/${serviceDefinition.url}_${serviceDefinition.version}_${serviceDefinition.arch}`;
      console.log(`Publishing service to Exchange at ${serviceUrl}`);
      
      const response = await makePostRequest(serviceUrl, serviceDefinition, {
        Authorization: `Basic ${process.env.EXCHANGE_CREDENTIAL}`
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
