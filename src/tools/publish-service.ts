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
  signServiceDefinition,
  storeServicePublicKey,
  PUBLIC_PEM
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
  
  /**
   * Helper function to store a public key for a service
   * @param url Base Exchange URL
   * @param organization Organization ID
   * @param serviceId Service ID
   * @param credential Base64 encoded credential
   * @returns A message indicating success or warning
   */
  const storePublicKeyForService = async (
    url: string,
    organization: string,
    serviceId: string,
    credential: string
  ): Promise<string> => {
    if (PUBLIC_PEM) {
      console.log(`Storing public key for service ${serviceId}`);
      try {
        const keyResponse = await storeServicePublicKey(
          url,
          organization,
          serviceId,
          PUBLIC_PEM,
          credential
        );
        
        if (keyResponse && typeof keyResponse === 'object' && 'content' in keyResponse) {
          console.warn(`Warning: Could not store public key: ${keyResponse.content[0]?.text}`);
          return '';
        } else {
          console.log('Public key stored successfully');
          return ' Public key was also stored with the service.';
        }
      } catch (keyError) {
        console.warn(`Warning: Error storing public key: ${keyError}`);
        return '';
      }
    } else {
      console.log('No public key available to store');
      return '';
    }
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
      
      // Extract Docker image name if available
      // This modification allows the service to be published using the Docker image name
      // instead of the service URL, which helps with compatibility when the service URL
      // doesn't match the Docker image name
      let serviceId = `${serviceDefinition.url}_${serviceDefinition.version}_${serviceDefinition.arch}`;
      
      // Check if we have a deployment with a Docker image
      if (serviceDefinition.deployment) {
        try {
          // Parse deployment if it's a string
          const deploymentObj = typeof serviceDefinition.deployment === 'string'
            ? JSON.parse(serviceDefinition.deployment)
            : serviceDefinition.deployment;
          
          // Extract the first service's image if available
          const services = deploymentObj.services || {};
          const firstServiceName = Object.keys(services)[0];
          
          if (firstServiceName && services[firstServiceName].image) {
            const imageUrl = services[firstServiceName].image;
            console.log(`Found Docker image: ${imageUrl}`);
            
            // For web-hello-python service, we need special handling
            if (firstServiceName === 'web-hello-python' || imageUrl.includes('web-hello-python')) {
              console.log(`Special handling for web-hello-python service`);
              
              // Keep the service ID as is - don't modify it
              console.log(`Using original service ID: ${serviceId}`);
              
              // Make sure the URL in the service definition matches what's expected
              if (serviceDefinition.url !== 'web-hello-python') {
                serviceDefinition.url = 'web-hello-python';
                console.log(`Updated service definition URL to "web-hello-python"`);
              }
            }
            // For other services, use the standard approach
            else if (imageUrl && imageUrl !== serviceDefinition.url) {
              console.log(`Using Docker image "${imageUrl}" from deployment instead of service URL "${serviceDefinition.url}"`);
              
              // Extract just the repository/name part without tag or digest for the service ID
              const simpleName = imageUrl.split('/').pop()?.split('@')[0].split(':')[0].replace(`_${serviceDefinition.arch.toLowerCase()}`, '');
              if (simpleName) {
                serviceId = `${simpleName}_${serviceDefinition.version}_${serviceDefinition.arch}`;
                serviceDefinition.url = simpleName;
                console.log(`Updated service definition URL to "${serviceDefinition.url}"`);
                console.log(`Service ID will be: ${serviceId}`);
              }
            }
          }
        } catch (error) {
          console.warn(`Could not extract Docker image name from deployment: ${error}`);
          // Continue with the original service ID
        }
      }
      
      // Publish the service to the Exchange
      const serviceUrl = `${url}/${organization}/services/${serviceId}`;
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
          
          // Ensure the image URL is preserved exactly as provided for web-hello-python
          if (serviceName === 'web-hello-python' && service.image) {
            console.log(`Preserving exact image URL for web-hello-python: ${service.image}`);
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
      console.log('Service definition: ', signedServiceDefinition);
      
      // First check if the service exists
      console.log(`Checking if service exists at ${serviceUrl}`);
      const checkResponse = await makeHttpRequest(serviceUrl, {
        Authorization: `Basic ${credential}`
      });
      
      // If checkResponse is a ToolResponse, it means there was an error (like 404)
      if (checkResponse && typeof checkResponse === 'object' && 'content' in checkResponse) {
        // Check if it's a 404 error
        const errorText = checkResponse.content[0]?.text || '';
        if (errorText.includes('404') || errorText.includes('not found')) {
          console.log(`Service doesn't exist (404), creating it with POST`);
          
          // Use POST to create a new service
          const servicesUrl = `${url}/${organization}/services`;
          console.log(`Posting to ${servicesUrl}`);
          
          const createResponse = await makePostRequest(
            servicesUrl,
            signedServiceDefinition,
            { Authorization: `Basic ${credential}` }
          );
          
          // If response has content property, it's already formatted as ToolResponse (error case)
          if (createResponse && typeof createResponse === 'object' && 'content' in createResponse) {
            return createResponse;
          }
          
          // After successfully creating the service, store the public key if available
          const keyMessage = await storePublicKeyForService(url, organization, serviceId, credential);
          
          return {
            content: [
              {
                type: 'text',
                text: `Successfully created service "${serviceDefinition.url}" version ${serviceDefinition.version} for architecture ${serviceDefinition.arch} in organization ${organization}.${keyMessage}`
              }
            ]
          };
        } else {
          // Some other error occurred
          return checkResponse;
        }
      } else {
        // Service exists, update it with PUT
        console.log(`Service exists, updating it with PUT`);
        const response = await makePostRequest(serviceUrl, signedServiceDefinition, {
          Authorization: `Basic ${credential}`
        }, 'PUT');
        
        // If response has content property, it's already formatted as ToolResponse (error case)
        if (response && typeof response === 'object' && 'content' in response) {
          return response;
        }
        
        // After successfully updating the service, store the public key if available
        const keyMessage = await storePublicKeyForService(url, organization, serviceId, credential);
        
        return {
          content: [
            {
              type: 'text',
              text: `Successfully updated service "${serviceDefinition.url}" version ${serviceDefinition.version} for architecture ${serviceDefinition.arch} in organization ${organization}.${keyMessage}`
            }
          ]
        };
      }
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
