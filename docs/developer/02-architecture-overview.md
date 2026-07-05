# Steward Architecture Overview

Steward Foundation v1.0 is a constitutionally governed reasoning pipeline. It
is not a direct language-model chat application.

A language model may draft a candidate response, but it does not select
constitutional behavior, approve its own output, or possess authority over the
learner. Steward separates strategy, planning, generation, validation, review,
revision, and fallback into explicit stages with independently testable
responsibilities.

---

## Design Goals

The architecture is designed to:

- preserve human freedom by keeping learner judgment voluntary;
- preserve human responsibility by supporting rather than replacing human
  decisions;
- preserve human dignity by preventing degrading, manipulative, or identity-
  defining behavior;
- maintain intellectual honesty by distinguishing evidence, uncertainty,
  inference, and limitation;
- separate constitutional reasoning from language generation;
- make every stage independently testable and inspectable through privileged
  interfaces;
- keep learner-facing output separate from internal review and diagnostic
  information;
- remain provider-independent at the engine boundary.

These goals constrain the architecture. Provider capability, fluency, or
convenience cannot override them.

---

## High-Level Architecture

```text
Learner
   ↓
EN-001 Strategy Selection
   ↓
EN-002 Behavior Planning
   ↓
Provider Boundary
   ↓
Language Model
   ↓
Provider Validation
   ↓
EN-003 Constitutional Review
   ↓
EN-004 Revision (when required)
   ↓
EN-005 Approved Fallback (when required)
   ↓
Learner
```

### Learner input

**Responsibility:** Supply the current message and any permitted current-session
conversation context.

**Must never:** Implicitly provide an account profile, stored personal history,
analytics record, or hidden personalization state.

### EN-001 Strategy Selection

**Responsibility:** Select exactly one primary Conversation Strategy and zero or
more compatible secondary strategies. Resolve competing strategies according
to the constitutional priority order.

**Must never:** Invent an unregistered strategy, delegate constitutional
selection to a model provider, or expose the selection as learner-facing
authority.

### EN-002 Behavior Planning

**Responsibility:** Convert the selected strategies into closed, typed behavior
components with traceable strategy sources. Resolve behavior conflicts before
generation.

**Must never:** Accept free-form provider-created behavior, bypass strategy
selection, or disclose the privileged plan to the learner.

### Provider Boundary

**Responsibility:** Construct the approved generation request and isolate the
engine from provider-specific APIs. The request carries only the learner
message, current conversation, strategy selection, behavior plan,
constitutional constraints, and contract versions.

**Must never:** Send review records, rejected candidates, internal prompts,
revision details, privileged inspection data, accounts, or persistent learner
state to a provider.

### Language Model

**Responsibility:** Render a candidate learner-facing response from the
strategy, behavior plan, and constitutional constraints supplied by the
engine.

**Must never:** Select constitutional behavior, claim final authority, alter
the behavior plan, approve its own output, or return hidden reasoning.

### Provider Validation

**Responsibility:** Validate structured output before constitutional review.
Reject malformed output, unexpected or missing fields, invalid versions,
prohibited internal content, oversized responses, and provider refusals.

**Must never:** Treat invalid output as a candidate, disclose raw provider
errors to the learner, or silently weaken the provider contract.

### EN-003 Constitutional Review

**Responsibility:** Evaluate the candidate against the selected strategies,
behavior plan, harm and safety requirements, and all required behavioral
principles. Produce an explicit `APPROVED`, `REVISION_REQUIRED`, or `REJECTED`
outcome.

**Must never:** Create a replacement response, invent constitutional
requirements, approve a failed candidate, or expose review details through the
learner-safe boundary.

### EN-004 Revision

**Responsibility:** Permit at most one correction when review determines that a
candidate is revisable. Verify that the revision preserves the learner's
request, selected strategies, and behavior-plan objective, then send it through
constitutional review again.

**Must never:** revise more than once, change the learner's topic or decision,
introduce new authority or claims, or deliver an unreviewed revision.

### EN-005 Approved Fallback

**Responsibility:** Select a typed, constitutionally pre-approved learner-safe
response when generation, review, or revision cannot produce a deliverable
answer. Selection accounts for strategies and the relevant failure outcome.

**Must never:** Reveal rejected text, review or revision details, internal
prompts, raw errors, or privileged inspection data. It must not improvise
unapproved fallback authority.

### Learner output

**Responsibility:** Return only an approved response, an approved revision, or a
pre-approved fallback through the learner-safe interface.

**Must never:** Contain rejected candidates, internal reasoning, inspection
records, raw errors, or provider metadata.

---

## Major Architectural Components

### Constitution

The Constitution defines Steward's purpose, protections, limits, and order of
authority. It governs every lower architectural layer. Software implements
constitutional behavior; it does not create constitutional authority.

### Conversation Strategies

Conversation Strategies define approved approaches to recurring conversation
domains such as self-worth, uncertainty, learning, safety, and human authority.
They provide the structured input from which behavior plans are derived.

### Engine

The engine coordinates EN-001 through EN-005. It owns constitutional selection,
planning, review outcomes, the one-revision limit, and fallback routing while
maintaining the learner-safe boundary.

### Provider Boundary

The provider boundary defines provider-neutral input and output contracts,
validation requirements, versioning, and stable failure categories. It prevents
provider-specific behavior from becoming engine authority.

### OpenAI Adapter

The OpenAI adapter translates the provider-neutral contract to and from the
OpenAI API. It manages provider configuration, timeout behavior, response
mapping, and error classification. It does not define constitutional behavior.

### Evaluation Framework

The evaluation framework measures observed learner-facing behavior against
constitutional and strategy expectations. It defines scoring, critical
failures, benchmark procedure, and certification requirements independently of
provider fluency.

### Regression Suite

The regression suite verifies deterministic contracts, routing, behavior
planning, provider boundaries, review, revision, fallback, and learner-safe
output. It protects implementation guarantees but does not replace semantic
evaluation.

---

## Separation of Responsibilities

The architecture depends on strict separation:

- **Conversation Strategies do not generate language.** They define the
  constitutionally appropriate approach and remain inspectable independently
  of wording.
- **The provider does not decide constitutional behavior.** It receives the
  already selected strategies and behavior plan and renders a candidate.
- **Constitutional Review does not create new responses.** It evaluates and
  classifies a candidate. EN-004 owns the single permitted correction.
- **Fallbacks are pre-approved.** They remain useful and learner-safe without
  improvising authority during a failure.
- **Evaluation is independent of implementation.** Passing automated tests
  cannot substitute for observing and scoring complete conversations, and
  evaluation cannot invent new constitutional rules.

This separation makes failures attributable. A routing defect, invalid provider
response, review finding, failed revision, and fallback decision remain
distinguishable rather than collapsing into one opaque model call.

---

## Why Steward Uses Multiple Stages

A single language-model call cannot provide the required architectural
guarantees. The same system would otherwise interpret the learner, select
behavior, generate language, judge its own output, and decide what to disclose.
That combines authority with generation and makes failures difficult to detect.

The staged design provides:

- **Review:** Candidates are checked against requirements chosen before
  generation.
- **Revision:** A correctable failure receives one bounded correction rather
  than being silently delivered or repeatedly rewritten.
- **Validation:** Provider output must satisfy a strict technical contract
  before its meaning is reviewed.
- **Fallbacks:** A failed path returns known, pre-approved text instead of raw
  errors or unsafe candidates.
- **Provider abstraction:** Models and vendors can change without redefining
  the constitutional engine.
- **Testability:** Each stage has explicit inputs, outputs, failure modes, and
  independently verifiable boundaries.

Multiple stages do not make Steward infallible. They make authority,
responsibility, and failure handling explicit.

---

## Extension Points

Future work belongs at the boundary responsible for it:

- **Additional providers** belong behind the provider-neutral interface and
  must satisfy the existing contracts, validation, failure handling, and full
  evaluation suite.
- **New Conversation Strategies** require constitutional derivation, compatible
  combination rules, engine coverage, and evaluation evidence. They are not
  ordinary classifier additions.
- **New evaluation suites** belong under the evaluation framework and may
  measure demonstrated gaps without inventing constitutional behavior.
- **New constitutional articles** require the approved human constitutional
  process. Technology may assist examination but cannot authorize the change.
- **New user interfaces** consume only learner-safe APIs and must not expose
  privileged inspection, create hidden authority, or introduce behavioral
  pressure.

Every extension must preserve the Foundation v1.0 constitutional baseline. A
behavior-affecting extension requires regression testing and complete
evaluation before it can be represented as certified.

---

## Foundation Certification

Steward Foundation v1.0 is certified by
[EVAL-001](../evaluation/EVAL-001-certification.md).

The certified checkpoint records:

- 12/12 evaluation sets passed;
- 72/72 benchmark conversations passed;
- 390 automated tests passed at the Foundation v1.0 freeze checkpoint;
- no routing, constitutional, provider-boundary, or implementation regression
  in the certification run.

Certification applies to the architecture as a whole, not merely to fluent
generated responses. It covers the coordinated strategy, planning, provider,
validation, review, revision, fallback, and learner-safe delivery path under
the evaluated configuration.

Certification remains bounded by the evaluated version, provider, benchmark
suite, and known limitations. Behavior-affecting changes require
recertification.

---

## Architecture Principles

- Small responsibilities.
- Explicit boundaries.
- Closed constitutional inputs.
- Deterministic review rules.
- One bounded revision.
- Pre-approved failure behavior.
- Learner-safe output by construction.
- Provider independence.
- Regression before release.
- Constitution before convenience.

No lies. No shortcuts. Think for yourself.
