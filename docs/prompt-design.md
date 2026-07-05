# Orchestrator system prompt — design decisions

The system prompt lives in `packages/backend/src/index.ts` (`SYSTEM_PROMPT`) and is sent
with every evaluation request to the Claude API, alongside the MCP policy-check server.
Each decision below maps to a section of the prompt.

## 1. Role + audience defined in the first paragraph

> "You are Procura's AI governance evaluator… Your reader is a senior procurement officer…"

**Why:** Tone instructions work best when tied to a concrete reader, not an abstract
style ("be professional"). Naming the audience up front shapes every downstream sentence
the model writes — vocabulary, level of hedging, what it considers worth saying — without
needing per-section style rules. "Lead with the finding" mirrors how procurement
officers actually read evaluations: verdict first, justification second.

## 2. Tools first, numbered, gated on the profile ("Step 1")

> "Before writing any analysis, call every tool that corresponds to a requirement in
> the policy profile, in the order the requirements appear…"

**Why:** This is the core architectural principle of Procura made operational:
deterministic checks are performed by real code, not by Claude reading the document and
deciding for itself. Three specific choices:

- **"Before writing any analysis"** — ordering the tool calls ahead of reasoning stops
  the model from forming a conclusion first and then rationalising the tool results to
  fit it (anchoring). The evidence exists before the narrative.
- **Conditional invocation ("if the profile specifies…")** — Claude's orchestration role
  is exactly this: deciding *which* checks apply given the profile. Requirements absent
  from the profile must not generate checks, or the report implies policies the
  organisation never set.
- **"In the order the requirements appear in the profile"** — makes the tool-call
  sequence deterministic and reproducible for a given profile, which matters for
  audit: two evaluations against the same profile follow the same procedure.

The explicit "do not attempt to perform these checks yourself" line closes the loophole
where the model skips the tool and pattern-matches the document — the failure mode the
whole architecture exists to prevent.

## 3. Mechanical mapping from tool results to statuses ("Step 2")

> "compliant=true → pass, compliant=false → fail, ambiguous/contradicted → needs-review"

**Why:** The mapping from tool output to report status is a lookup table, not a
judgement call — so it's written as one. `needs-review` is deliberately narrow: it's for
genuine ambiguity the deterministic (keyword-based) checker can't resolve, like
"certification in progress", not an escape hatch for the model to soften a `fail`.
"Never change a tool's verdict because the documentation *sounds* compliant" pins that
down explicitly, because the V1 checkers are regex-based and the model could otherwise
be tempted to "correct" them.

## 4. Closed rubric — exactly three dimensions, sub-dimensions enumerated ("Step 3")

> "Write exactly three analysis sections. Do not add, merge, or rename dimensions."

**Why:** A fixed rubric is what makes reports comparable across vendors and across
time — an evaluator (human or automated) can put two reports side by side and compare
like with like. The sub-dimensions are enumerated (risk = data / vendor / compliance;
value = cost justification / alternatives) because "risk" unqualified drifts toward
whatever the document emphasises; naming the classes forces coverage even when the
documentation is silent on one of them. Fields the rubric feeds on (cost banding,
lock-in tolerance) are referenced explicitly so the analysis is anchored to the
profile, not generic.

## 5. Anti-fabrication rules as a separate section that "overrides everything else"

> "Never assert that a vendor holds a certification… unless the tool results support it.
> Absence of evidence is not evidence of compliance."

**Why:** This is the highest-stakes failure mode for a governance tool: a hallucinated
"SOC 2 certified" in a procurement report is worse than no report. Four design choices:

- It gets its own section with an explicit priority statement, because instructions
  buried mid-list get traded off against other instructions; this one must not be.
- **"Absence of evidence is not evidence of compliance"** targets the specific LLM bias
  toward agreeable completion — vendor docs are marketing material and read as compliant
  by default.
- **"State that it is silent"** turns a gap in the documentation into a first-class
  finding rather than something to paper over — silence about data residency *is*
  procurement-relevant information.
- **"Bring in no outside knowledge of the vendor"** keeps the evaluation a function of
  its inputs (profile + documentation + tool results). If the model supplements from
  training data, the report is no longer auditable against the submitted evidence, and
  it can leak stale facts about well-known vendors.

## 6. Output as exact JSON, mirroring the shared type

The JSON shape in the prompt is field-for-field the model-supplied subset of
`EvaluationReport` from `packages/shared` (`vendorName`, `policyChecks[]` with
`checkId`/`checkName`/`status`/`detail`, `fitAnalysis`, `riskAnalysis`,
`valueAnalysis`). Server-generated fields (`id`, `requestId`, `createdAt`) are
deliberately absent — the model should never mint identifiers or timestamps.

**Why:** The backend does `JSON.parse` on the response and the frontend renders the
result through shared TypeScript types, so the prompt's contract and the type system's
contract are the same shape — one source of truth, drift is a compile error on one side
and a parse error on the other. "ONLY a valid JSON object — no markdown fences" is
belt-and-braces with the backend's fence-stripping fallback: the prompt makes fences
rare, the parser tolerates them anyway. Example values inside the shape (e.g.
`'data-residency'`, `'Data Residency (UK)'`) cheaply standardise ids and names across
evaluations without a separate vocabulary section.

*(Known upgrade path: the API's structured outputs feature — `output_config.format`
with a JSON schema — would guarantee the shape instead of requesting it. V1 keeps the
prompt-based contract because the response must interleave with MCP tool use, and the
parse failure mode is already handled with a 502 + raw payload for debugging.)*

## 7. Static prompt, dynamic data in the user message

The system prompt contains no per-request data — the policy profile, vendor name, and
documentation all arrive in the user message.

**Why:** Two reasons. Architecturally, the prompt is the fixed *procedure* and the user
message is the *case file* — keeping them separate means the procedure is versionable
and reviewable on its own. Practically, a byte-stable system prompt is the prefix the
Claude API's prompt caching keys on; interpolating anything per-request into it would
invalidate the cache on every call.
