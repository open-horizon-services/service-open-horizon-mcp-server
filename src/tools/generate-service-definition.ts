/**
 * generate-service-definition.ts
 * 
 * MCP tool for generating a service definition file for Open Horizon
 */

import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getErrorMessage } from '../services/common';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Register the generate-service-definition tool with the MCP server
 */
export function registerGenerateServiceDefinitionTool(server: McpServer) {
  const toolName = 'generate-service-definition';
  const toolDescription = `
    Use this tool to generate a service definition file for Open Horizon.
    
    You can generate either:
    1. A basic service definition
    2. A service definition with user inputs
    
    You can provide parameters in three ways:
    1. Directly as parameters
    2. By providing a config file path (.env-config.json or .env-config-with-inputs.json)
    3. By providing the config as a JSON object
    
    Required parameters (if not using config file or config object):
    - type: "basic" or "with-inputs"
    - serviceName: The name of the service
    - serviceVersion: The version of the service
    - serviceContainer: The container image for the service
    
    Optional parameters:
    - org: Organization ID (default: from environment)
    - arch: Architecture (default: "amd64")
    - volumeMount: Volume mount path (default: "/mms-shared")
    - exposePort: Port to expose (default: "3000")
    - appPort: Application port (default: "3000")
    - mmsObjectType: MMS object type (for with-inputs template)
    - mmsVolume: MMS volume (for with-inputs template)
    - updateFileName: Update file name (for with-inputs template)
    - outputPath: Path to save the generated file (default: current directory)
    
    Config file options:
    - configPath: Path to a .env-config.json or .env-config-with-inputs.json file
    
    Config object option:
    - config: JSON object with configuration parameters
  `;
  const toolSchema = {
    type: z.enum(['basic', 'with-inputs']).optional().describe('Type of service definition to generate: "basic" or "with-inputs"'),
    serviceName: z.string().optional().describe('The name of the service'),
    serviceVersion: z.string().optional().describe('The version of the service'),
    serviceContainer: z.string().optional().describe('The container image for the service'),
    org: z.string().optional().describe('Organization ID. If not provided, uses the default organization.'),
    arch: z.string().optional().describe('The architecture (default: "amd64")'),
    volumeMount: z.string().optional().describe('The volume mount path (default: "/mms-shared")'),
    exposePort: z.string().optional().describe('The port to expose (default: "3000")'),
    appPort: z.string().optional().describe('The application port (default: "3000")'),
    mmsObjectType: z.string().optional().describe('The MMS object type (for with-inputs template)'),
    mmsVolume: z.string().optional().describe('The MMS volume (for with-inputs template)'),
    updateFileName: z.string().optional().describe('The update file name (for with-inputs template)'),
    outputPath: z.string().optional().describe('Path to save the generated file (default: current directory)'),
    configPath: z.string().optional().describe('Path to a .env-config.json or .env-config-with-inputs.json file'),
    config: z.any().optional().describe('JSON object with configuration parameters'),
  };
  
  const toolCallback = async (params: any, context: any): Promise<any> => {
    try {
      let configData: any = {};
      let serviceType = params.type;
      
      // Load configuration from file if provided
      if (params.configPath) {
        try {
          const configContent = await fs.readFile(params.configPath, 'utf8');
          configData = JSON.parse(configContent);
          
          // Determine the type based on the config file name
          if (params.configPath.includes('with-inputs')) {
            serviceType = 'with-inputs';
          } else {
            serviceType = 'basic';
          }
        } catch (error) {
          return getErrorMessage(`Error reading config file: ${error}`);
        }
      } 
      // Use provided config object if available
      else if (params.config) {
        configData = params.config;
        
        // Determine the type based on whether MMS-specific fields are present
        if (configData.MMS_OBJECT_TYPE || configData.MMS_SERVICE_NAME) {
          serviceType = 'with-inputs';
        } else {
          serviceType = 'basic';
        }
      } 
      // Otherwise use individual parameters
      else {
        if (!serviceType) {
          return getErrorMessage("Type is required (basic or with-inputs) when not using config file or object");
        }
        
        if (!params.serviceName) {
          return getErrorMessage("Service name is required when not using config file or object");
        }
        
        if (!params.serviceVersion) {
          return getErrorMessage("Service version is required when not using config file or object");
        }
        
        if (!params.serviceContainer) {
          return getErrorMessage("Service container image is required when not using config file or object");
        }
        
        // Map parameters to config data
        configData = {
          ARCH: params.arch || 'amd64',
          HZN_ORG_ID: params.org || process.env.EXCHANGE_ORG || 'myorg',
          SERVICE_NAME: params.serviceName,
          SERVICE_VERSION: params.serviceVersion,
          SERVICE_CONTAINER: params.serviceContainer,
          VOLUME_MOUNT: params.volumeMount || '/mms-shared',
          SHARED_VOLUME: params.mmsVolume || 'mms_shared_volume',
          EXPOSE_PORT: params.exposePort || '3000',
          APP_PORT: params.appPort || '3000',
          PRIVILEGED: true
        };
        
        // Add MMS-specific fields for with-inputs type
        if (serviceType === 'with-inputs') {
          configData = {
            ...configData,
            MMS_OBJECT_TYPE: params.mmsObjectType || 'mms_agent_config',
            MMS_OBJECT_ID: 'mms_agent_config_json',
            MMS_OBJECT_FILE: 'config/config.json',
            MMS_SERVICE_NAME: params.serviceName,
            MMS_CONTAINER: params.serviceContainer,
            MMS_SERVICE_VERSION: params.serviceVersion,
            MMS_SERVICE_FALLBACK_VERSION: params.serviceVersion,
            MMS_UPDATE_FILE_NAME: params.updateFileName || 'mms-agent-config.json'
          };
        }
      }
      
      // Load the appropriate template
      let templatePath;
      if (serviceType === 'basic') {
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
      templateContent = templateContent
        .replace(/\\$HZN_ORG_ID/g, configData.HZN_ORG_ID)
        .replace(/\\$SERVICE_NAME/g, configData.SERVICE_NAME)
        .replace(/\\$SERVICE_VERSION/g, configData.SERVICE_VERSION)
        .replace(/\\$SERVICE_CONTAINER/g, configData.SERVICE_CONTAINER)
        .replace(/\\$ARCH/g, configData.ARCH)
        .replace(/\\$VOLUME_MOUNT/g, configData.VOLUME_MOUNT)
        .replace(/\\$SHARED_VOLUME/g, configData.SHARED_VOLUME)
        .replace(/\\$EXPOSE_PORT/g, configData.EXPOSE_PORT)
        .replace(/\\$APP_PORT/g, configData.APP_PORT);
      
      // Additional replacements for with-inputs template
      if (serviceType === 'with-inputs') {
        templateContent = templateContent
          .replace(/\\$MMS_SERVICE_NAME/g, configData.MMS_SERVICE_NAME || configData.SERVICE_NAME)
          .replace(/\\$MMS_SERVICE_VERSION/g, configData.MMS_SERVICE_VERSION || configData.SERVICE_VERSION)
          .replace(/\\$MMS_CONTAINER/g, configData.MMS_CONTAINER || configData.SERVICE_CONTAINER)
          .replace(/\\$MMS_OBJECT_TYPE/g, configData.MMS_OBJECT_TYPE)
          .replace(/\\$UPDATE_FILE_NAME/g, configData.MMS_UPDATE_FILE_NAME || configData.UPDATE_FILE_NAME);
      }
      
      // Parse the template to validate it's valid JSON
      let serviceDefinition;
      try {
        serviceDefinition = JSON.parse(templateContent);
      } catch (error) {
        return getErrorMessage(`Error parsing template: ${error}`);
      }
      
      // Generate the output file name
      const serviceName = configData.SERVICE_NAME;
      const serviceVersion = configData.SERVICE_VERSION;
      const architecture = configData.ARCH;
      const fileName = `${serviceName}_${serviceVersion}_${architecture}.json`;
      const outputDirectory = params.outputPath || '.';
      const outputFilePath = path.join(outputDirectory, fileName);
      
      // Write the service definition to a file
      try {
        await fs.writeFile(outputFilePath, JSON.stringify(serviceDefinition, null, 2), 'utf8');
      } catch (error) {
        return getErrorMessage(`Error writing service definition file: ${error}`);
      }
      
      return {
        content: [
          {
            type: 'text',
            text: `Successfully generated service definition file: ${outputFilePath}\n\n` +
                  `Service Definition:\n${JSON.stringify(serviceDefinition, null, 2)}`
          }
        ]
      };
    } catch (error) {
      console.error(`Error generating service definition: ${error}`);
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
