# Procura

**AI governance evaluation for public sector procurement — with the receipts to prove it.**

Buying an AI tool for a government body means answering awkward questions: Where does the
data live? Which certifications does the vendor actually hold? Is the price defensible?
Today those answers come from someone skim-reading a vendor PDF. Procura turns that into a
structured, repeatable evaluation: upload the vendor's documentation, pick your policy
profile, and get back a report where every compliance claim is backed by a deterministic
check — not a language model's optimistic reading of marketing copy.

## The core idea: don't let the AI grade its own homework

Most "AI compliance checker" tools ask an LLM *"is this vendor SOC 2 certified?"* and trust
the answer. Procura doesn't. The architecture splits the work by what each part is good at:

| Question | Answered by |
|---|---|
| "Does the documentation state UK data residency?" | **Real code** — deterministic checks in an MCP server |
| "Which checks should run for this policy profile?" | **Claude** — orchestration |
| "Is this a good fit? What are the risks? Is it worth the money?" | **Claude** — reasoning inside a fixed rubric |

Claude decides *which* policy-check tools to call based on your profile, calls them over
[MCP](https://modelcontextprotocol.io/), and then reasons about fit, risk, and value — but
it is explicitly forbidden from asserting a certification or residency claim the tool
results don't support. That separation is what makes the output auditable: every pass/fail
in the report traces back to a check you can read the source code of.

## How an evaluation flows

```
Frontend (React)                                          eu-west-2
   │
   │  POST /evaluations { profileId, vendorName, documentation }
   ▼
Backend Lambda ──── loads policy profile ──── DynamoDB
   │
   │  Claude API call (system prompt = fixed evaluation procedure,
   │  MCP server attached via mcp_servers)
   ▼
Claude ──── check_data_residency ─────────┐
       ──── check_security_certification ──┤──► MCP server Lambda
   │                                       │    (regex/keyword checks — real code)
   │  ◄── deterministic results ───────────┘
   │
   │  fit / risk / value analysis within the fixed rubric
   ▼
Structured JSON report ──► stored in DynamoDB ──► rendered as
                           pass / fail / needs-review cards + analysis
```

## What's in the box

- **Policy profiles** — data residency region (UK/EU/US), required certifications
  (SOC 2, ISO 27001, Cyber Essentials), cost banding, vendor lock-in tolerance.
- **Evaluations** — paste vendor documentation, pick a profile, get a report:
  one card per policy check (pass / fail / needs-review with evidence), then
  fit, risk, and value analysis written for a procurement officer, not a chatbot fan.
- **History** — every evaluation is stored in DynamoDB, keyed by profile.

## Monorepo layout

```
packages/
├── frontend/        Vite + React + TypeScript, plain CSS, no UI libraries
├── backend/         Lambda: /profiles + /evaluations routes, Claude orchestration
├── mcp-server/      Lambda: deterministic policy-check tools over MCP
├── shared/          One set of TypeScript types shared by all of the above
└── infrastructure/  AWS CDK — one stack, eu-west-2
docs/
└── prompt-design.md Why the system prompt is written the way it is
```

The `shared` package is load-bearing: the frontend's request shapes, the backend's
response shapes, and the prompt's JSON contract are all the same TypeScript types.
If they drift, something fails to compile.

## Getting started

**Prerequisites:** Node 20+, an AWS account bootstrapped for CDK in `eu-west-2`,
and an Anthropic API key.

```sh
npm install

# Run everything's tests
npm run test --workspace @procura/backend --workspace @procura/mcp-server

# Frontend dev server (needs VITE_API_URL — see below)
npm run dev --workspace @procura/frontend
```

### Deploy

```sh
$env:ANTHROPIC_API_KEY = "sk-ant-..."   # picked up by the stack at synth time
npm run deploy --workspace @procura/infrastructure
```

The stack outputs `BackendApiUrl`. Point the frontend at it:

```sh
# packages/frontend/.env.local
VITE_API_URL=https://<your-api-id>.execute-api.eu-west-2.amazonaws.com
```

Without `ANTHROPIC_API_KEY`, profile management still works; `POST /evaluations`
returns a clear 503 telling you what's missing.

### API

| Route | Does |
|---|---|
| `POST /profiles` | Create a policy profile |
| `GET /profiles` | List saved profiles |
| `POST /evaluations` | Run an evaluation (`policyProfileId`, `vendorName`, `vendorDocumentation`) |

## Honest limitations (V1)

- Policy checks are keyword/regex based — they verify what the documentation *says*,
  not what is *true*. A vendor claiming "ISO 27001" passes the check; verifying the
  certificate register is future work.
- Documentation is pasted as text; PDF parsing is on the roadmap (S3 upload path
  already exists in the API).
- The prompt instructs Claude to run checks before analysing; the backend does not
  yet verify tool-use blocks server-side. That hardening step is documented in
  `docs/prompt-design.md`.

## Tech stack

Vite + React + TypeScript · AWS Lambda + API Gateway (HTTP API) · DynamoDB · S3 ·
AWS CDK · Anthropic Claude API with the MCP connector (`mcp_servers`) · Vitest
