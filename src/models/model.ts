import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { IncomingHttpHeaders } from "http";

// Define content types matching MCP SDK
export type MCPTextContent = {
  type: "text";       // literal string enforced below with 'as const'
  text: string;
  _meta?: Record<string, unknown>;
};

export type MCPToolResponse = {
  content: MCPTextContent[];
  _meta?: Record<string, unknown>;
};

export type ToolContent = {
  type: "text" | "json";
  text?: string;
  tool_name?: string;
  tool_output?: Record<string, any>;
  _meta?: Record<string, unknown>;
};
export type ToolResponse = {
  content: ToolContent[];
  _meta?: Record<string, unknown>;
};
export type SessionEntry = {
  server: InstanceType<typeof McpServer>;
  transport: InstanceType<typeof StreamableHTTPServerTransport>;
  latestHeaders?: IncomingHttpHeaders;
};
