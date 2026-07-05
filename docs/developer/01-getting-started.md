# Steward Foundation v1.0: Getting Started

This guide gives a new developer the minimum context needed to understand and
run the certified Steward Foundation v1.0 baseline.

## 1. What Steward Is

Steward is a constitutionally governed conversational reasoning system. It
helps learners examine questions, experiences, decisions, uncertainty, and
other concerns while preserving human dignity, freedom, and responsibility.

The language model is not Steward's authority. A model produces a candidate
response inside a constrained provider boundary. The constitutional engine
selects the governing strategies, plans the required behavior, reviews the
candidate, permits at most one revision, and chooses an approved fallback when
the response cannot be delivered safely.

The highest authority is [CA-001](../foundation/anchors/CA-001.md), followed by
the Foundation documents, [ST-001](../roles/steward/ST-001.md), specifications,
and then software.

---

## 2. Core Philosophy

Four principles shape every Steward response:

- **Human Dignity:** Do not shame, diminish, define, or manipulate the learner.
- **Human Freedom:** Preserve voluntary judgment and do not pressure the learner
  toward Steward's preferred conclusion.
- **Human Responsibility:** Support decisions and examination without taking
  ownership of choices that remain human.
- **Intellectual Honesty:** Distinguish knowledge, uncertainty, evidence,
  inference, and limitation without fabricating confidence.

These are behavioral constraints, not decorative values. Strategy selection,
behavior planning, generation, review, revision, and fallback must all preserve
them.

---

## 3. High-Level Architecture

```text
Learner
   ↓
EN-001 Strategy Selection
   ↓
EN-002 Behavior Planning
   ↓
Provider Boundary
   ↓
Provider Validation
   ↓
EN-003 Constitutional Review
   ↓
EN-004 Revision (if required)
   ↓
EN-005 Approved Fallback (if required)
   ↓
Learner
```

- **EN-001 Strategy Selection** deterministically selects exactly one primary
  Conversation Strategy and any compatible secondary strategies.
- **EN-002 Behavior Planning** converts the selected strategies into closed,
  typed behavior components. Providers do not invent this plan.
- **Provider Boundary** sends only the approved generation request to the
  configured model provider.
- **Provider Validation** rejects malformed, unsafe, oversized, unexpected, or
  otherwise invalid structured provider output.
- **EN-003 Constitutional Review** checks the candidate against the selected
  strategies, behavior plan, safety requirements, and behavioral principles.
- **EN-004 Revision** permits one correction when review returns
  `REVISION_REQUIRED`. The revision must preserve the learner's request,
  strategies, and behavior objective.
- **EN-005 Approved Fallback** returns pre-approved learner-safe text when
  generation, review, or revision cannot produce a deliverable response.

Rejected candidates, review details, revision records, internal prompts, and
raw errors never belong in learner-facing output.

---

## 4. Main Components

### Constitution

The Constitution defines Steward's purpose and authority limits. Begin with
[CA-001](../foundation/anchors/CA-001.md) and the
[Foundation index](../foundation/LS-000.md).

### Conversation Strategies

CS-001 through CS-012 describe constitutionally approved approaches to common
conversation domains. They form a closed registry and feed behavior planning.

### Engine

EN-001 through EN-005 implement the constitutional conversation path. The
engine owns strategy selection, planning, review, revision control, and
fallback selection.

### Provider Boundary

The provider boundary defines the only information a generation provider may
receive, the required structured output, validation rules, and stable provider
failure categories.

### Evaluation

[EVAL-000](../evaluation/EVAL-000.md) defines behavioral evaluation.
[EVAL-001](../evaluation/EVAL-001-certification.md) records the Foundation v1.0
certification: 12/12 evaluation sets and 72/72 benchmark conversations passed.

### OpenAI Adapter

The OpenAI adapter implements the provider-neutral generation interface. It
reads credentials from the environment, maps Responses API output into the
existing provider result contract, and does not possess constitutional
authority.

---

## 5. Repository Layout

The important paths are:

```text
docs/
  foundation/             Constitutional anchors and Foundation documents
  conversation/           Conversation Strategy specifications
  engine/                 EN-001 through EN-005 specifications
  provider-boundary/      Provider contracts and boundary specifications
  evaluation/             EVAL framework, certification, and EW benchmarks
  developer/              Developer documentation

platform/steward-app/
  src/                    Steward engine, provider adapters, server, and client
  src/provider/           Provider-neutral contracts and provider adapters
  tests/                  Unit, behavioral, and engine-path tests
```

The software lives under `platform/steward-app`. Repository-level
constitutional and technical documentation lives under `docs`.

---

## 6. Running Steward

Run application commands from `platform/steward-app`.

### Install

```powershell
npm install
```

### Run locally

```powershell
npm run dev
```

The development command loads `.env.local` and starts the local server. The
fake provider remains the default unless OpenAI is explicitly enabled. Use
`.env.example` as the configuration reference and never commit API keys.

### Typecheck and tests

```powershell
npm run typecheck
npm test
```

The test suite includes unit, behavioral, provider-boundary, and full
engine-path coverage.

### Evaluation

There is currently no dedicated npm command for the constitutional evaluation
suite. Follow [EVAL-000](../evaluation/EVAL-000.md), execute the six
conversations in each EW-001 through EW-012 set through the complete engine,
apply the documented scoring and transient-provider policy, and compare the
result with [EVAL-001](../evaluation/EVAL-001-certification.md).

Automated tests do not replace evaluation, and evaluation does not replace
automated verification.

---

## 7. Before Changing Behavior

Before changing learner-visible behavior:

1. Understand CA-001, the relevant Foundation documents, ST-001, and the
   governing specification.
2. Identify the constitutional source and learner need for the change.
3. Preserve existing constitutional behavior and the learner-safe boundary.
4. Add focused regression tests for the demonstrated issue.
5. Run typecheck and the complete test suite.
6. Rerun the full EVAL-001 evaluation suite before the behavioral change is
   accepted or represented as certified.

Do not repair one benchmark by adding behavior that lacks constitutional
support or weakens another strategy.

---

## 8. Design Philosophy

Steward does not optimize for persuasive answers. It optimizes for
constitutional reasoning.

Responses should:

- preserve learner judgment;
- avoid false certainty;
- avoid hidden authority;
- encourage examination;
- remain useful without becoming controlling;
- state limitations honestly.

Fluency, confidence, or provider capability never outrank the Constitution.

No lies. No shortcuts. Think for yourself.
