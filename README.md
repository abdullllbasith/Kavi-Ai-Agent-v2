# Kavi AI Agent V2

Kavi V2 is a goal-driven autonomous agent foundation with a secure action boundary, persistent-memory adapter, validated RAG retrieval, commerce authorization, recovery policies, and a production-oriented web UI/API.

The original `Kavi-Ai-Agent` repository remains unchanged.

## Architecture

```text
User
  ↓
Goal Manager
  ↓
Planner
  ↓
Decision validation
  ↓
Guardrails + authorization + confirmation
  ↓
Tool execution
  ↓
Observation
  ↓
Evaluator + goal criteria
  ↓
Complete / Retry / Replan / Ask user / Fail
```

The agent owns decisions. Deterministic systems own execution, validation, permissions, identity and safety.

## Run locally

```bash
cp .env.example .env
# set KAVI_SESSION_SECRET, OPENROUTER_API_KEY and KAVI_LLM_MODEL
npm install
npm run check
npm run dev
```

Open `http://127.0.0.1:3000`.

For a production build:

```bash
npm run check
npm run build
NODE_ENV=production npm start
```

## UI

The `ui/` directory contains the Kavi V2 agent workspace: chat, goal progress, agent activity, recommendations, evidence, confirmation, memory, plans and orders. The UI talks to the same-origin API instead of using fake assistant responses.

## API

- `GET /api/health` — readiness/configuration status.
- `GET /api/session` — create or inspect the signed anonymous demo session.
- `POST /api/session` — create a signed session when no session exists.
- `POST /api/chat` — execute a Kavi V2 turn and persist the waiting state for multi-turn confirmation flows.

The included session identity is intentionally anonymous and single-instance. Replace it with your real authenticated identity before production commerce/account use.

## Provider

`lib/agent-v2/openRouter.ts` provides a configurable OpenRouter-compatible structured LLM adapter. Provider credentials and model selection are environment variables; no secrets are stored in source code.

## Production security

The server includes signed `HttpOnly`/`SameSite=Strict` sessions, rate limiting, request-size limits, security headers/CSP, strict same-origin API usage, input bounds and fail-closed provider configuration.

See [`docs/PRODUCTION.md`](docs/PRODUCTION.md) before deployment.

## Commerce integration

The agent layer defines commerce/order executor contracts and enforces authorization and confirmation. Real merchant/payment/order integrations must be injected by the deployment; the repository does not invent or expose fake payment credentials or production side effects.

## Verification

```bash
npm run check
npm run build
```

GitHub Actions runs both checks on pushes, pull requests and manual dispatches.

## Release status

**`0.2.0-alpha.1` — production-oriented alpha.**

The remaining production work is deployment-specific: connect real authenticated identity, persistent multi-instance session/state storage, real commerce/order executors, and complete end-to-end tests against those external systems.
