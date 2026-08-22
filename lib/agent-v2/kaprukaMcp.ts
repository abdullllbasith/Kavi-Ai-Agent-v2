import type { AgentState, ToolDefinition } from './types';
import type { ToolRegistry } from './toolRegistry';

export const KAPRUKA_MCP_URL = process.env.KAPRUKA_MCP_URL ?? 'https://mcp.kapruka.com/mcp';
const PROTOCOL_VERSION = process.env.KAPRUKA_MCP_PROTOCOL_VERSION ?? '2025-06-18';
const REQUEST_TIMEOUT_MS = 20_000;
const MAX_RESPONSE_BYTES = 2_000_000;

type JsonRpcResponse = { jsonrpc: '2.0'; id?: number; result?: any; error?: { code: number; message: string; data?: unknown } };
type McpTool = { name: string; description?: string; inputSchema?: unknown };

function withTimeout(signal?: AbortSignal): AbortSignal {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  if (signal) signal.addEventListener('abort', () => controller.abort(), { once: true });
  controller.signal.addEventListener('abort', () => clearTimeout(timer), { once: true });
  return controller.signal;
}

async function readMcpResponse(response: Response): Promise<JsonRpcResponse> {
  const contentType = response.headers.get('content-type') ?? '';
  const raw = await response.text();
  if (Buffer.byteLength(raw, 'utf8') > MAX_RESPONSE_BYTES) throw new Error('Kapruka MCP response exceeded the safety limit.');
  if (contentType.includes('application/json')) return JSON.parse(raw) as JsonRpcResponse;
  const messages = raw.split(/\r?\n/).filter((line) => line.startsWith('data:')).map((line) => line.slice(5).trim()).filter(Boolean);
  if (!messages.length) throw new Error('Kapruka MCP returned an unsupported response.');
  return JSON.parse(messages.at(-1)!) as JsonRpcResponse;
}

export class KaprukaMcpClient {
  private nextId = 1;
  private sessionId?: string;
  private initialized = false;
  constructor(private readonly endpoint = KAPRUKA_MCP_URL) {}

  private async request(method: string, params?: Record<string, unknown>, notification = false): Promise<JsonRpcResponse | null> {
    const id = this.nextId++;
    const body: Record<string, unknown> = { jsonrpc: '2.0', method };
    if (!notification) body.id = id;
    if (params !== undefined) body.params = params;
    const headers: Record<string, string> = { 'content-type': 'application/json', accept: 'application/json, text/event-stream' };
    if (this.sessionId) headers['Mcp-Session-Id'] = this.sessionId;
    const response = await fetch(this.endpoint, { method: 'POST', headers, body: JSON.stringify(body), signal: withTimeout() });
    if (!response.ok) throw new Error(`Kapruka MCP HTTP ${response.status}.`);
    const returnedSession = response.headers.get('Mcp-Session-Id');
    if (returnedSession) this.sessionId = returnedSession;
    if (notification) return null;
    const message = await readMcpResponse(response);
    if (message.error) throw new Error(`Kapruka MCP ${message.error.message}`);
    return message;
  }

  private async ensureInitialized(): Promise<void> {
    if (this.initialized) return;
    await this.request('initialize', { protocolVersion: PROTOCOL_VERSION, capabilities: {}, clientInfo: { name: 'kavi-ai-agent-v2', version: '0.2.0-alpha.1' } });
    await this.request('notifications/initialized', undefined, true);
    this.initialized = true;
  }

  async listTools(): Promise<McpTool[]> {
    await this.ensureInitialized();
    const response = await this.request('tools/list');
    const tools = response?.result?.tools;
    if (!Array.isArray(tools)) throw new Error('Kapruka MCP did not return a tool list.');
    return tools.filter((tool): tool is McpTool => typeof tool?.name === 'string');
  }

  async callTool(name: string, arguments_: unknown): Promise<unknown> {
    await this.ensureInitialized();
    const response = await this.request('tools/call', { name, arguments: arguments_ && typeof arguments_ === 'object' ? arguments_ : {} });
    return response?.result ?? null;
  }

  async healthcheck(): Promise<{ ok: boolean; tools: string[] }> {
    try { return { ok: true, tools: (await this.listTools()).map((tool) => tool.name) }; }
    catch { return { ok: false, tools: [] }; }
  }
}

function safeToolName(name: string): string { return name.replace(/[^a-zA-Z0-9_-]/g, '_'); }

export async function registerKaprukaMcpTools(registry: ToolRegistry, client = new KaprukaMcpClient()): Promise<string[]> {
  const tools = await client.listTools();
  for (const remote of tools) {
    const localName = safeToolName(remote.name);
    const requiresConfirmation = remote.name === 'kapruka_create_order';
    const schemaText = remote.inputSchema ? `\nInput schema: ${JSON.stringify(remote.inputSchema)}` : '';
    const definition: ToolDefinition = { name: localName, description: `${remote.description ?? `Kapruka MCP tool: ${remote.name}`}${schemaText}`, execute: async (input: unknown, _state: AgentState) => client.callTool(remote.name, input) };
    registry.register(definition, { requiresConfirmation, authorize: requiresConfirmation ? (_input, state) => Boolean(state.security?.userId) : undefined });
  }
  return tools.map((tool) => safeToolName(tool.name));
}
