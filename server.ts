import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { createHash, createHmac, randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runKaviV2 } from './lib/agent-v2/orchestrator.js';
import type { AgentState } from './lib/agent-v2/types.js';
import { createOpenRouterCall } from './lib/agent-v2/openRouter.js';

const root = fileURLToPath(new URL('.', import.meta.url));
const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? '127.0.0.1';
const cookieSecret = process.env.KAVI_SESSION_SECRET;
const apiKey = process.env.OPENROUTER_API_KEY;
const model = process.env.KAVI_LLM_MODEL;
if (!cookieSecret || cookieSecret.length < 32) throw new Error('KAVI_SESSION_SECRET must be at least 32 characters.');

type Session = { userId: string; expiresAt: number; state?: AgentState };
const sessions = new Map<string, Session>();
const rate = new Map<string, { window: number; count: number }>();
const WINDOW_MS = 60_000;
const MAX_REQUESTS = Number(process.env.RATE_LIMIT_PER_MINUTE ?? 20);
const SESSION_TTL = 24 * 60 * 60 * 1000;

function sign(value: string) { return createHmac('sha256', cookieSecret!).update(value).digest('hex'); }
function createSession() { const id = randomBytes(24).toString('base64url'); const userId = `anon_${createHash('sha256').update(id).digest('hex').slice(0, 24)}`; sessions.set(id, { userId, expiresAt: Date.now() + SESSION_TTL }); return { id, userId }; }
function getSession(req: IncomingMessage) {
  const raw = req.headers.cookie?.match(/(?:^|; )kavi_session=([^;]+)/)?.[1];
  if (!raw) return null;
  const [id, signature] = decodeURIComponent(raw).split('.');
  if (!id || !signature || sign(id) !== signature) return null;
  const session = sessions.get(id);
  if (!session || session.expiresAt < Date.now()) { sessions.delete(id); return null; }
  return { id, ...session };
}
function setSession(res: ServerResponse, id: string) { res.setHeader('Set-Cookie', `kavi_session=${encodeURIComponent(`${id}.${sign(id)}`)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_TTL / 1000}${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`); }
function json(res: ServerResponse, status: number, body: unknown) { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(body)); }
function securityHeaders(res: ServerResponse) { res.setHeader('X-Content-Type-Options', 'nosniff'); res.setHeader('X-Frame-Options', 'DENY'); res.setHeader('Referrer-Policy', 'no-referrer'); res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()'); res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"); }
function allowed(key: string) { const now = Date.now(); const current = rate.get(key); if (!current || now - current.window >= WINDOW_MS) { rate.set(key, { window: now, count: 1 }); return true; } current.count += 1; return current.count <= MAX_REQUESTS; }
async function body(req: IncomingMessage) { let data = ''; for await (const chunk of req) { data += chunk; if (data.length > 64_000) throw new Error('Request body too large.'); } return JSON.parse(data || '{}') as Record<string, unknown>; }
function safePath(urlPath: string) { const requested = urlPath === '/' ? '/index.html' : urlPath; const normalized = normalize(requested).replace(/^([.][.][/\\])+/, ''); return join(root, 'ui', normalized); }
async function serveStatic(req: IncomingMessage, res: ServerResponse) { const path = safePath(new URL(req.url ?? '/', `http://${host}`).pathname); if (!path.startsWith(join(root, 'ui'))) return json(res, 400, { error: 'Invalid path.' }); try { const data = await readFile(path); const types: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml' }; res.writeHead(200, { 'Content-Type': types[extname(path)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(data); } catch { json(res, 404, { error: 'Not found.' }); } }

const server = createServer(async (req, res) => {
  securityHeaders(res);
  try {
    const url = new URL(req.url ?? '/', `http://${host}`);
    if (req.method === 'GET' && url.pathname === '/api/health') return json(res, 200, { ok: true, agent: 'kavi-v2', llmConfigured: Boolean(apiKey && model) });
    if (url.pathname === '/api/session' && (req.method === 'GET' || req.method === 'POST')) {
      const existing = getSession(req); if (existing) return json(res, 200, { userId: existing.userId, active: Boolean(existing.state) });
      const session = createSession(); setSession(res, session.id); return json(res, 201, { userId: session.userId, active: false });
    }
    const session = getSession(req);
    if (url.pathname.startsWith('/api/')) {
      if (!session) return json(res, 401, { error: 'Session required.' });
      if (!allowed(session.userId)) return json(res, 429, { error: 'Rate limit exceeded. Try again shortly.' });
    }
    if (req.method === 'POST' && url.pathname === '/api/chat') {
      if (!apiKey || !model) return json(res, 503, { error: 'Kavi LLM provider is not configured.' });
      const input = await body(req); const message = typeof input.message === 'string' ? input.message.trim() : '';
      if (!message || message.length > 4000) return json(res, 400, { error: 'Message must contain 1–4000 characters.' });
      const llm = createOpenRouterCall({ apiKey, model, siteUrl: process.env.PUBLIC_URL, siteName: 'Kavi AI V2' });
      const result = await runKaviV2(message, { userId: session!.userId, llm, previousState: session!.state });
      session!.state = result.state; session!.expiresAt = Date.now() + SESSION_TTL;
      return json(res, 200, { state: result.state, language: result.language, responsePolicy: result.responsePolicy });
    }
    if (req.method === 'GET') return serveStatic(req, res);
    return json(res, 405, { error: 'Method not allowed.' });
  } catch (error) { console.error('[kavi]', error); json(res, 500, { error: 'Internal server error.' }); }
});

server.listen(port, host, () => console.log(`Kavi V2 listening on http://${host}:${port}`));
