# Procura

## What this is
Procura is an AI governance evaluation tool. Organisations (initially targeting
UK public sector bodies) upload documentation about an AI vendor/tool they're
considering, configure a policy profile (data residency, security certifications,
cost thresholds, etc.), and get back a structured evaluation report combining
deterministic policy checks with AI-driven analysis of fit, risk, and value.

## Core architectural principle
Deterministic checks (does this tool meet certification X? is data hosted in
region Y?) are handled by real code in an MCP server — not by Claude reasoning
freely. Claude's role is orchestration (deciding which checks to run) and
constrained analysis (fit/risk/value reasoning within a fixed rubric) on top of
those results. This separation is what makes the output auditable.

## Tech stack
- Frontend: Vite + React + TypeScript
- Backend: AWS Lambda + API Gateway (TypeScript) — request orchestration
- MCP server: separate AWS Lambda + API Gateway, exposes policy-check tools
  over MCP, called by the Claude API via the mcp_servers parameter
- Storage: S3 (uploaded documents), DynamoDB (policy profiles, evaluation history)
- Infra: AWS CDK (TypeScript), one stack, region eu-west-2
- AI: Anthropic Claude API (model: claude-sonnet-4-6)

## Monorepo structure
- packages/frontend
- packages/backend
- packages/mcp-server
- packages/infrastructure
- packages/shared (shared TS types/interfaces)

## V1 scope
1. User configures a policy profile (data residency region, required security
   certifications, cost banding, vendor lock-in tolerance)
2. User uploads vendor documentation (text for now, PDF parsing comes later)
3. Backend calls Claude API with MCP server attached
4. Claude calls policy-check tools (deterministic), then produces a
   structured analysis within a fixed rubric
5. Output: a report showing each policy check as pass/fail/needs-review,
   plus reasoned fit/risk/value analysis
6. Evaluation is stored in DynamoDB for history

## Conventions
- TypeScript everywhere, strict mode on
- Shared types live in packages/shared, imported by frontend/backend/mcp-server
- Keep policy-check logic simple (regex/keyword-based) for V1 — accuracy
  improvements come later