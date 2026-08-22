# Kavi V2 production checklist

## Required before public launch

- Set `KAVI_SESSION_SECRET` to a unique random value of at least 32 characters.
- Set `OPENROUTER_API_KEY` and `KAVI_LLM_MODEL` through the deployment secret manager; never commit them.
- Run behind HTTPS. In production the session cookie is `Secure; HttpOnly; SameSite=Strict`.
- Put a reverse proxy/WAF in front of the Node server and apply provider/IP rate limits as well as the application limit.
- Replace the anonymous session identity with the application's real authenticated user identity before enabling account-level commerce or persistent memory.
- Provide real `CommerceExecutor`, `OrderExecutor`, and persistent `MemoryStore` implementations. The default server intentionally has no commerce/order side effects.
- Keep authorization server-side. UI buttons are never a security boundary.
- Run `npm run check` and `npm run build` on every release.
- Exercise prompt-injection, cross-user authorization, confirmation replay, malformed tool input, RAG poisoning, and retry-storm tests before release.
- Use centralized persistent session/state storage when deploying more than one Node instance. The included in-memory session map is single-instance by design.
- Configure structured log aggregation. Do not log prompts, secrets, tokens, payment data, or private memory contents.

## Runtime

```bash
cp .env.example .env
# fill the values
npm install
npm run check
npm run build
NODE_ENV=production npm start
```

The web UI and API are served from the same origin. The main API endpoints are:

- `GET /api/health`
- `GET /api/session`
- `POST /api/session`
- `POST /api/chat`

## Provider

Kavi uses the OpenRouter-compatible structured adapter in `lib/agent-v2/openRouter.ts`. Keep the model configurable through `KAVI_LLM_MODEL`; do not hard-code a provider key or model into source code.

## Commerce

A production deployment must inject authenticated commerce and order executors into `runKaviV2`. The repository's agent layer validates actions, confirmations and authorization, but it cannot manufacture real merchant credentials or payment/order APIs.
