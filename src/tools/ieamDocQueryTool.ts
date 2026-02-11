import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ToolResponse } from '../models/model';
import { z } from 'zod';
import { makePostRequest, getExchangeParams  } from '../services/common';

/**
 * Interface for IEAM query tool parameters
 */
interface IeamQueryParams {
  query: string;
  topK?: number;
}

/**
 * MCP Tool for querying IEAM documentation using RAG
 */
export function registerIeamDocQueryTool(server: McpServer) {
  // Make sure the tool name matches exactly what BobShell is trying to use
  const toolName = 'ieam-doc-query';
  const toolDescription = `
    Query IBM Edge Application Manager (IEAM) official documentation for conceptual information,
    explanations, installation guides, architecture details, and best practices.
    
    This tool uses Retrieval-Augmented Generation (RAG) to search through comprehensive IEAM
    documentation and provide detailed, context-aware answers from official IBM sources.
    
    BEST FOR THESE TYPES OF QUESTIONS:
    - "What is IBM Edge Application Manager?" or "What is IEAM?"
    - "Explain IEAM architecture" or "What are IEAM components?"
    - "How to install IEAM?" or "What are prerequisites for installing IEAM?"
    - "What features does IEAM provide?" or "What capabilities does IEAM have?"
    - "Explain IEAM deployment patterns" or "What is an IEAM pattern?"
    - "What is an edge node in IEAM?" or "What is the management hub?"
    - "IEAM best practices" or "How to secure IEAM?"
    - "Troubleshooting IEAM" or "IEAM system requirements"
    - "Does IEAM support Kubernetes?" or "Can IEAM run containers?"
    
    NOT FOR:
    - Specific API endpoint details (use api-query-tool for REST API technical details)
    - API parameters, request/response formats, or curl examples
    
    Use this tool when you need to understand IEAM concepts, learn about features,
    or get guidance from the official documentation.
  `;
  const toolSchema = {
    query: z.string().describe('Your question about IBM Edge Application Manager (IEAM)'),
    topK: z.number().optional().describe('Number of relevant documents to retrieve (default: 5)')
  };
  
  console.log(`Registering IEAM documentation query tool with name: ${toolName}`);
  
  // Register the tool with the server - using the callback directly without wrapping
  server.tool(
    toolName,
    toolDescription,
    toolSchema,
    toolCallback
  );
  
  console.log(`IEAM documentation query tool registered successfully`);

  /**
   * Main handler function for IEAM documentation queries
   * @param params - The parameters passed to the tool
   * @param context - Additional context information
   * @returns A formatted tool response
   */
  async function toolCallback(params: any, context: any): Promise<any> {
    console.log(`IEAM doc query tool callback called with params:`, JSON.stringify(params));
    console.log(`Context:`, JSON.stringify(context));
    
    // Access headers from the shared context
    const {url, credential, organization} = getExchangeParams(params, context);

    try {
      const { query, topK = 5 } = params;
      
      if (!query) {
        console.log(`No query provided, returning default message`);
        return createTextResponse("Please provide a query about IBM Edge Application Manager. For example: 'How do I install IEAM?'");
      }

      console.log(`Processing IEAM documentation query: "${query}"`);
      console.log(`Using IEAM_RAG_API_URL: ${process.env.IEAM_RAG_API_URL}`);
      
      // Query the IEAM-RAG system directly without fallbacks
      const answer = await queryIeamRag(query, topK);
      
      return createTextResponse(answer);
    } catch (error) {
      console.error('Error in ieamDocQueryTool:', error);
      return createTextResponse(`Error processing IEAM documentation query: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create a text response object
   * @param text - The text content
   * @returns A formatted tool response
   */
  function createTextResponse(text: string): ToolResponse {
    console.log(`Creating text response: ${text.substring(0, 100)}...`);
    return {
      content: [{ type: "text", text }]
    };
  }

  /**
   * Query the IEAM-RAG system
   * @param query - The user's query
   * @param topK - Number of documents to retrieve
   * @returns The answer to the query
   */
  async function queryIeamRag(query: string, topK: number): Promise<string> {
    console.log(`Querying IEAM-RAG API at ${process.env.IEAM_RAG_API_URL} for: "${query}"`);
    
    try {
      // Prepare the request body
      const requestBody = {
        query,
        topK
      };
      
      console.log(`Sending request to IEAM-RAG API with body:`, JSON.stringify(requestBody));
      
      // Prepare headers - include OpenAI API key if available
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      // Forward OpenAI API key from environment variable as X-OpenAI-Key header
      if (process.env.OPENAI_API_KEY) {
        headers['X-OpenAI-Key'] = process.env.OPENAI_API_KEY;
        console.log(`Including OpenAI API key in request headers`);
      }
      
      // Make the request to the IEAM-RAG API
      console.log(`About to make POST request to ${process.env.IEAM_RAG_API_URL}`);
      const response = await makePostRequest(
        process.env.IEAM_RAG_API_URL || 'http://localhost:3000/api/query',
        requestBody,
        headers
      );
      
      console.log(`IEAM-RAG API response received:`, JSON.stringify(response));
      
      // Check if the response is valid
      if (!response) {
        const errorMsg = 'Empty response from IEAM-RAG API';
        console.error(errorMsg);
        throw new Error(errorMsg);
      }
      
      // Check if the response is a ToolResponse (error)
      if ('content' in response) {
        console.error('Error response from IEAM-RAG API:', JSON.stringify(response));
        // Return the error response directly instead of converting to string
        return formatIeamResponse(query, "I couldn't find specific information about your query in the IEAM documentation. Please try rephrasing your question.");
      }
      
      // Check if we have an answer or result
      if (!response.answer && !response.result) {
        const errorMsg = 'Invalid response format from IEAM-RAG API';
        console.error(errorMsg, JSON.stringify(response));
        throw new Error(errorMsg);
      }
      
      // If we got a successful response
      return formatIeamResponse(query, response.answer || response.result || JSON.stringify(response));
      
    } catch (error) {
      console.error('Error querying IEAM-RAG API:', error);
      return `Error processing IEAM documentation query: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again later.`;
    }
  }
  
  /**
   * Format the IEAM response for better readability
   * @param query - The original query
   * @param answer - The raw answer from the RAG system
   * @returns Formatted response
   */
  function formatIeamResponse(query: string, answer: string): string {
    // Clean up the response
    let cleanAnswer = answer.trim();
    
    // Add markdown formatting
    let formattedResponse = `# IBM Edge Application Manager (IEAM) Information\n\n`;
    formattedResponse += `## Query\n${query}\n\n`;
    formattedResponse += `## Answer\n${cleanAnswer}\n\n`;
    formattedResponse += `---\n*This information is sourced from the official IBM Edge Application Manager documentation.*`;
    
    return formattedResponse;
  }
  
}

// Made with Bob