import { ToolResponse } from "../models/model";
import 'dotenv/config';

const EXCHANGE_URL = process.env.EXCHANGE_URL || '';
const EXCHANGE_ORG = process.env.EXCHANGE_ORG || '';
const EXCHANGE_CREDENTIAL = process.env.EXCHANGE_CREDENTIAL || '';

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
    return (await response.json()) as T;

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
      return getErrorMessage(`Error posting data: ${response.status} ${response.statusText}`);
    }
    return (await response.json()) as T;

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
    
    return (await response.json()) as T;

  } catch (err: any) {
    console.log(`Error making DELETE request to ${url}:`, err);
    return getErrorMessage(`Error deleting resource: ${err.message || "Unknown error"}`);
  }
}

// Made with Bob
