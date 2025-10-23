import { ToolResponse } from "../models/model";
import 'dotenv/config';
import * as crypto from 'crypto';
import * as fs from 'fs/promises';

const EXCHANGE_URL = process.env.EXCHANGE_URL || '';
const EXCHANGE_ORG = process.env.EXCHANGE_ORG || '';
const EXCHANGE_CREDENTIAL = process.env.EXCHANGE_CREDENTIAL || '';

// Handle base64-encoded private key & public key
// PRIVATE_KEY is already base64 encoded in .env
const PRIVATE_KEY_BASE64 = process.env.PRIVATE_KEY || '';
const PRIVATE_KEY = PRIVATE_KEY_BASE64
  ? Buffer.from(PRIVATE_KEY_BASE64, 'base64').toString()
  : '';
 
const PUBLIC_PEM_BASE64 = process.env.PUBLIC_PEM || '';
export const PUBLIC_PEM = PUBLIC_PEM_BASE64
  ? Buffer.from(PUBLIC_PEM_BASE64, 'base64').toString()
  : ''; 

console.log('Private key loaded:', PRIVATE_KEY ? 'Yes' : 'No');

export function getExchangeParams(params: any, context: any): {url: string, credential: string, organization: string} {
  // Access headers from the shared context
  const headers = context.requestInfo.headers || {};
  const organization = params.org || headers['exchange-org'] || EXCHANGE_ORG;
  const url = `${headers['exchange-url'] || EXCHANGE_URL}`;
  const credential = `${headers['exchange-credential'] || EXCHANGE_CREDENTIAL}`;
  return {organization, url, credential}
}
/**
 * Formats error messages into the expected ToolResponse format
 * @param err Error object or message
 * @returns Formatted ToolResponse with error message
 */
export function getErrorMessage(err: any): ToolResponse {
  console.log('Show error message:', err);
  if (err instanceof Error) {
    console.error("[ERROR]", err.message);
    return {
      content: [
        {
          type: "text",
          text: `Error fetching data: ${err.message}`,
        },
      ],
    };
  }

  console.error("[UNKNOWN ERROR]", err);
  return {
    content: [
      {
        type: "text",
        text: typeof err === 'string' ? err : "An unknown error occurred.",
      },
    ],
  };
}

/**
 * Makes an HTTP request to the specified URL with optional headers
 * @param url URL to make the request to
 * @param headers Optional headers to include in the request
 * @returns Promise resolving to the response data or an error ToolResponse
 */
export async function makeHttpRequest<T = any>(url: string, headers: Record<string, string> = {}): Promise<T | ToolResponse> {
  const finalHeaders = {
    "Accept": "application/json",
    ...headers
  };

  try {
    const response = await fetch(url, { headers: finalHeaders });

    if (!response.ok) {
      return getErrorMessage(`Error fetching data: ${response.status} ${response.statusText}`);
    }
    
    // Check the content type to determine how to parse the response
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      return (await response.json()) as T;
    } else {
      // Handle text response
      const textResponse = await response.text();
      return textResponse as unknown as T;
    }

  } catch (err: any) {
    console.log(`Error making request to ${url}:`, err);
    return getErrorMessage(`Error fetching data: ${err.message || "Unknown error"}`);
  }
}

/**
 * Makes an HTTP POST request with JSON data
 * @param url URL to make the request to
 * @param data Data to send in the request body
 * @param headers Optional headers to include in the request
 * @returns Promise resolving to the response data or an error ToolResponse
 */
export async function makePostRequest<T = any>(url: string, data: any, headers: Record<string, string> = {}, method = 'POST'): Promise<T | ToolResponse> {
  const finalHeaders = {
    "Accept": "application/json",
    "Content-Type": "application/json",
    ...headers
  };

  try {
    const response = await fetch(url, {
      method: method,
      headers: finalHeaders,
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      // Try to get more detailed error information
      let errorDetail = '';
      try {
        const errorBody = await response.text();
        console.log('Error response body:', errorBody);
        errorDetail = errorBody ? `: ${errorBody}` : '';
      } catch (textError) {
        console.log('Could not read error response body:', textError);
      }
      
      console.error(`Error response: ${response.status} ${response.statusText}${errorDetail}`);
      return getErrorMessage(`Error posting data: ${response.status} ${response.statusText}${errorDetail}`);
    }
    
    // Check the content type to determine how to parse the response
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      return (await response.json()) as T;
    } else {
      // Handle text response
      const textResponse = await response.text();
      return textResponse as unknown as T;
    }

  } catch (err: any) {
    console.log(`Error making POST request to ${url}:`, err);
    return getErrorMessage(`Error posting data: ${err.message || "Unknown error"}`);
  }
}

/**
 * Makes an HTTP DELETE request
 * @param url URL to make the request to
 * @param headers Optional headers to include in the request
 * @returns Promise resolving to the response data or an error ToolResponse
 */
export async function makeDeleteRequest<T = any>(url: string, headers: Record<string, string> = {}): Promise<T | ToolResponse> {
  const finalHeaders = {
    "Accept": "application/json",
    ...headers
  };

  try {
    const response = await fetch(url, {
      method: 'DELETE',
      headers: finalHeaders
    });

    if (!response.ok) {
      return getErrorMessage(`Error deleting resource: ${response.status} ${response.statusText}`);
    }
    
    // Some DELETE operations might not return content
    if (response.status === 204) {
      return { success: true } as unknown as T;
    }
    
    // Check the content type to determine how to parse the response
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      return (await response.json()) as T;
    } else {
      // Handle text response
      const textResponse = await response.text();
      return textResponse as unknown as T;
    }

  } catch (err: any) {
    console.log(`Error making DELETE request to ${url}:`, err);
    return getErrorMessage(`Error deleting resource: ${err.message || "Unknown error"}`);
  }
}

/**
 * Adds a deployment signature to a service definition
 * This is used when publishing a service to the Open Horizon Exchange
 *
 * @param serviceDefinition The service definition object
 * @param privateKeyPath Path to the private key file
 * @returns Promise resolving to the service definition with signature added
 */
export async function addDeploymentSignature(
  serviceDefinition: any,
  privateKeyPath: string
): Promise<any> {
  try {
    // Make a copy of the service definition
    const signedServiceDefinition = { ...serviceDefinition };
    
    // Extract the deployment field
    let deployment = signedServiceDefinition.deployment;
    
    // If deployment is a string, parse it to an object
    if (typeof deployment === 'string') {
      deployment = JSON.parse(deployment);
    }
    
    // Generate the signature for the deployment
    const signature = await generateDeploymentSignature(deployment, privateKeyPath);
    
    // Add the signature to the service definition
    signedServiceDefinition.deploymentSignature = signature;
    
    return signedServiceDefinition;
  } catch (error) {
    console.error('Error adding deployment signature:', error);
    throw error;
  }
}

/**
 * Adds a deployment signature to a service definition using a private key string
 *
 * @param serviceDefinition The service definition object
 * @param privateKey The private key as a string
 * @returns The service definition with signature added
 */
export function addDeploymentSignatureFromKey(
  serviceDefinition: any,
  privateKey: string
): any {
  try {
    // Make a copy of the service definition
    const signedServiceDefinition = { ...serviceDefinition };
    
    // Extract the deployment field
    let deployment = signedServiceDefinition.deployment;
    
    // If deployment is a string, parse it to an object
    if (typeof deployment === 'string') {
      deployment = JSON.parse(deployment);
    }
    
    // Generate the signature for the deployment
    const signature = generateDeploymentSignatureFromKey(deployment, privateKey);
    
    // Add the signature to the service definition
    signedServiceDefinition.deploymentSignature = signature;
    
    return signedServiceDefinition;
  } catch (error) {
    console.error('Error adding deployment signature from key:', error);
    throw error;
  }
}

/**
 * Generates a deployment signature for an Open Horizon service definition
 * This mimics the functionality of the `hzn util sign` command
 *
 * @param deployment The deployment object or string to sign
 * @param privateKeyPath Path to the private key file
 * @returns Promise resolving to the signature
 */
export async function generateDeploymentSignature(
  deployment: object | string,
  privateKeyPath: string
): Promise<string> {
  try {
    // If deployment is an object, convert it to a string
    const deploymentStr = typeof deployment === 'object'
      ? JSON.stringify(deployment)
      : deployment;
    
    // Read the private key
    const privateKey = await fs.readFile(privateKeyPath, 'utf8');
    
    // Create a sign object
    const sign = crypto.createSign('SHA256');
    
    // Update with the deployment string
    sign.update(deploymentStr);
    
    // Sign the data
    const signature = sign.sign(privateKey, 'base64');
    
    return signature;
  } catch (error) {
    console.error('Error generating deployment signature:', error);
    throw error;
  }
}

/**
 * Verifies a deployment signature
 *
 * @param deployment The deployment object or string that was signed
 * @param signature The signature to verify
 * @param publicKeyPath Path to the public key file
 * @returns Promise resolving to a boolean indicating if the signature is valid
 */
export async function verifyDeploymentSignature(
  deployment: object | string,
  signature: string,
  publicKeyPath: string
): Promise<boolean> {
  try {
    // If deployment is an object, convert it to a string
    const deploymentStr = typeof deployment === 'object'
      ? JSON.stringify(deployment)
      : deployment;
    
    // Read the public key
    const publicKey = await fs.readFile(publicKeyPath, 'utf8');
    
    // Create a verify object
    const verify = crypto.createVerify('SHA256');
    
    // Update with the deployment string
    verify.update(deploymentStr);
    
    // Verify the signature
    return verify.verify(publicKey, signature, 'base64');
  } catch (error) {
    console.error('Error verifying deployment signature:', error);
    throw error;
  }
}

/**
 * Generates a deployment signature using a private key string instead of a file path
 *
 * @param deployment The deployment object or string to sign
 * @param privateKey The private key as a string
 * @returns The signature
 */
export function generateDeploymentSignatureFromKey(
  deployment: object | string,
  privateKey: string
): string {
  try {
    // If deployment is an object, convert it to a string
    const deploymentStr = typeof deployment === 'object'
      ? JSON.stringify(deployment)
      : deployment;
    
    // Create a sign object
    const sign = crypto.createSign('SHA256');
    
    // Update with the deployment string
    sign.update(deploymentStr);
    
    // Sign the data
    const signature = sign.sign(privateKey, 'base64');
    
    return signature;
  } catch (error) {
    console.error('Error generating deployment signature from key:', error);
    throw error;
  }
}

/**
 * Verifies a deployment signature using a public key string instead of a file path
 *
 * @param deployment The deployment object or string that was signed
 * @param signature The signature to verify
 * @param publicKey The public key as a string
 * @returns Boolean indicating if the signature is valid
 */
export function verifyDeploymentSignatureFromKey(
  deployment: object | string,
  signature: string,
  publicKey: string
): boolean {
  try {
    // If deployment is an object, convert it to a string
    const deploymentStr = typeof deployment === 'object'
      ? JSON.stringify(deployment)
      : deployment;
    
    // Create a verify object
    const verify = crypto.createVerify('SHA256');
    
    // Update with the deployment string
    verify.update(deploymentStr);
    
    // Verify the signature
    return verify.verify(publicKey, signature, 'base64');
  } catch (error) {
    console.error('Error verifying deployment signature from key:', error);
    throw error;
  }
}

/**
 * Signs a service definition using the private key from environment variable
 * This is the recommended method for CodeEngine deployments
 *
 * @param serviceDefinition The service definition object
 * @returns The service definition with signature added
 */
export function signServiceDefinition(serviceDefinition: any): any {
  try {
    // Make a copy of the service definition
    const signedServiceDefinition = { ...serviceDefinition };
    
    // Extract the deployment field
    let deployment = signedServiceDefinition.deployment;
    
    // If deployment is a string, parse it to an object for signing
    const deploymentObj = typeof deployment === 'string'
      ? JSON.parse(deployment)
      : deployment;
    
    // Check if we have a private key in the environment
    if (!PRIVATE_KEY) {
      console.warn('No PRIVATE_KEY environment variable found. Skipping deployment signature.');
      return signedServiceDefinition;
    }
    
    try {
      // Generate the signature
      const sign = crypto.createSign('SHA256');
      sign.update(JSON.stringify(deploymentObj));
      
      // Try to sign with the private key
      const signature = sign.sign(PRIVATE_KEY, 'base64');
      
      // Add the signature to the service definition
      signedServiceDefinition.deploymentSignature = signature;
      console.log('Service definition successfully signed');
    } catch (signError) {
      console.error('Error during signing operation:', signError);
      console.log('Private key format may be incorrect. Skipping signature generation.');
      // Return without signature if signing fails
      return signedServiceDefinition;
    }
    
    return signedServiceDefinition;
  } catch (error) {
    console.error('Error signing service definition:', error);
    // Return the original service definition if signing fails
    return serviceDefinition;
  }
}

/**
 * Get admin version information
 * @param url Base Exchange URL
 * @param credential Base64 encoded credential
 * @returns Promise resolving to the version information
 */
export async function getAdminVersion(url: string, credential: string): Promise<any> {
  const versionUrl = `${url.replace(/\/v1$/, '')}/v1/admin/version`;
  return makeHttpRequest(versionUrl, {
    Authorization: `Basic ${credential}`
  });
}

/**
 * Get admin status information
 * @param url Base Exchange URL
 * @param credential Base64 encoded credential
 * @returns Promise resolving to the status information
 */
export async function getAdminStatus(url: string, credential: string): Promise<any> {
  const statusUrl = `${url.replace(/\/v1$/, '')}/v1/admin/status`;
  return makeHttpRequest(statusUrl, {
    Authorization: `Basic ${credential}`
  });
}

/**
 * Get organization status information
 * @param url Base Exchange URL
 * @param organization Organization ID
 * @param credential Base64 encoded credential
 * @returns Promise resolving to the organization status information
 */
export async function getOrgStatus(url: string, organization: string, credential: string): Promise<any> {
  const orgStatusUrl = `${url}/${organization}/status`;
  return makeHttpRequest(orgStatusUrl, {
    Authorization: `Basic ${credential}`
    });
  }
  
  /**
   * Store a public key for a service
   * @param url Base Exchange URL
   * @param organization Organization ID
   * @param serviceId Service ID (in the format name_version_arch)
   * @param publicKey Public key content (PEM format)
   * @param credential Base64 encoded credential
   * @returns Promise resolving to the response
   */
  export async function storeServicePublicKey(
    url: string,
    organization: string,
    serviceId: string,
    publicKey: string,
    credential: string
  ): Promise<any> {
    const keyUrl = `${url}/${organization}/services/${serviceId}/keys/service.public.pem`;
    console.log(`Storing public key for service ${serviceId} at ${keyUrl}`);
    
    // The API expects the public key as plain text in the request body
    return makePostRequest(keyUrl, publicKey, {
      Authorization: `Basic ${credential}`,
      'Content-Type': 'text/plain' // Override the default application/json
    }, 'PUT');
  }
  
  // Made with Bob

