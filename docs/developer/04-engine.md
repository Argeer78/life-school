# Steward Engine

The Steward Engine is responsible for constitutional orchestration. It
coordinates the complete path from a learner message to learner-safe output.

The Engine does not generate language itself. It selects constitutional
reasoning, derives required behavior, constructs the provider hand-off,
validates and reviews candidate output, permits at most one revision, and
selects an approved fallback when delivery is not possible.

EN-001 through EN-005 divide those responsibilities into explicit stages. No
stage possesses independent constitutional authority; every stage derives from
the Constitution, Foundation documents, ST-001, and its governing
specification.

---

## Overview

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
EN-004 Revision
   ↓
EN-005 Approved Fallback
   ↓
Learner
```

- **EN-001 Strategy Selection** identifies the constitutional reasoning
  strategy or compatible strategy combination for the current message.
- **EN-002 Behavior Planning** translates those strategies into explicit,
  typed behavior requirements.
- **Provider Boundary** gives a language provider only the approved generation
  request and receives a structured candidate result.
- **Provider Validation** rejects technically invalid or prohibited provider
  output before it can enter constitutional review.
- **EN-003 Constitutional Review** evaluates the candidate against strategies,
  planned behavior, safety, and all required behavioral principles.
- **EN-004 Revision** permits one bounded correction when review returns
  `REVISION_REQUIRED`.
- **EN-005 Approved Fallback** selects pre-approved learner-safe text when the
  normal path cannot deliver an approved response.

The diagram shows the constitutional stages. Foundation v1.0 also records typed
intent detection and a closed constitutional mapping during orchestration.
These support traceability and generation constraints; they do not replace
EN-001 selection or EN-002 planning.

Every successful delivery is one of:

1. an approved initial candidate;
2. an approved single revision;
3. a constitutionally pre-approved fallback.

Rejected candidates, failed revisions, internal prompts, review details, raw
errors, and privileged inspection data are never learner-facing output.

---

## EN-001 Strategy Selection

EN-001 determines which Conversation Strategies govern the current learner
message.

### Responsibilities

EN-001 must:

- identify exactly one primary strategy;
- identify zero or more compatible secondary strategies;
- assign a confidence value;
- record constitutional justification;
- apply the constitutional priority order;
- resolve strategy conflicts according to safety, dignity, freedom,
  responsibility, and truthful examination;
- produce at least one registered strategy for every learner message;
- remain deterministic and provider-independent.

The primary strategy expresses the highest-priority constitutional need.
Secondary strategies preserve relevant context without displacing or weakening
the primary responsibility.

### Never

EN-001 must never:

- generate learner-facing responses;
- replace learner judgment;
- interpret or approve provider output;
- select more than one primary strategy;
- invent unregistered strategies;
- accept provider-selected strategies;
- expose strategy selection through the learner-safe API.

### Inputs

Conceptually, EN-001 receives:

- the current learner message;
- permitted current-session conversation context;
- the closed Conversation Strategy registry.

No account profile, persistent memory, analytics state, or provider response is
part of strategy selection.

### Outputs

EN-001 produces a typed Strategy Selection containing:

- one primary strategy ID;
- compatible secondary strategy IDs;
- confidence;
- constitutional references and resolution priority;
- any applicable Steward human-authority boundary.

The selection is privileged pipeline data. It feeds EN-002 and the generation
request but is not delivered to the learner.

### Failure conditions

Strategy Selection is invalid when it:

- produces no strategy;
- produces multiple primary strategies;
- includes an ID outside the closed registry;
- combines incompatible strategies;
- violates constitutional priority;
- becomes dependent on a language provider;
- produces different results for identical permitted inputs.

Upstream orchestration must not continue as though an invalid selection were
valid.

### Regression expectations

Routing tests should verify:

- primary and secondary selection for demonstrated cases;
- priority overrides for safety and manipulation;
- compatibility rules;
- adjacent phrases that must not be reclassified;
- preservation of existing EW routing;
- the absence of a path that bypasses EN-001.

Any routing change that can alter learner behavior requires the complete
evaluation suite before certification.

---

## EN-002 Behavior Planning

EN-002 converts Strategy Selection into an explicit Behavior Plan.

### Behavior plans

A Behavior Plan is the constitutional contract for generation. It describes
what the candidate must accomplish without supplying the candidate's wording.
The plan is deterministic, typed, provider-independent, and privileged.

### Constitutional constraints

The plan operates with the constitutional priority order:

1. safety;
2. dignity;
3. freedom;
4. responsibility;
5. truthful examination.

The later Generation Request also includes closed constitutional references,
protections, and limits from the engine's constitutional mapping. These
constraints prevent provider rendering from becoming a source of behavior.

### Behavior components

Foundation behavior components support responsibilities such as:

- acknowledging experience;
- answering directly;
- explaining concepts;
- asking reflective questions;
- clarifying uncertainty;
- establishing ethical boundaries;
- encouraging learning;
- encouraging communication;
- encouraging examination;
- preserving responsibility;
- preserving freedom.

Every component identifies the Conversation Strategy or Strategies from which
it derives. Unsupported free-form behavior cannot enter the plan.

### Provider instructions

Provider instructions may tell a model how to express the supplied plan, obey
the output schema, remain concise, or avoid prohibited content. They do not
create constitutional behavior. The behavior already exists in the Strategy
Selection, Behavior Plan, and constitutional constraints before the prompt
builder runs.

### Why planning is separate from routing

Routing answers:

> Which constitutional reasoning patterns govern this message?

Planning answers:

> What observable behaviors must a response express for those strategies?

Keeping them separate allows developers to test strategy classification without
language generation and to test behavior derivation without provider
variability. It also prevents the same classification label from becoming an
unexamined response template.

### Inputs

EN-002 receives:

- the learner message;
- the primary strategy;
- secondary strategies;
- constitutional priorities.

### Outputs

EN-002 produces a typed Behavior Plan containing:

- the primary and secondary strategy IDs;
- closed behavior components;
- source strategy IDs for every component;
- constitutional priority for every component;
- explicit conflict-resolution results.

### Failure conditions

Behavior Planning is invalid when:

- strategy selection is missing;
- a component is free-form or outside the closed registry;
- a component lacks a source strategy;
- required strategy behavior is absent;
- incompatible behavior is left unresolved;
- provider output or provider declarations determine the plan;
- identical inputs produce different plans.

Generation must not proceed without an explicit valid Behavior Plan.

---

## Provider Boundary

The Provider Boundary is the hand-off between constitutional orchestration and
language generation.

The language model receives:

- the learner message;
- permitted current conversation;
- Strategy Selection;
- Behavior Plan;
- constitutional constraints;
- provider contract version;
- output schema version.

It does not receive an unrestricted prompt asking it to decide how Steward
should behave. Strategy, behavior, and limits are supplied as already resolved
engine inputs.

The provider-neutral contract prevents a provider API from leaking into Engine
design. An adapter may translate the request into provider-specific form, but
it may not add strategies, change priorities, weaken constraints, or receive
privileged review and revision state.

The provider returns a structured result, not an immediately deliverable chat
message. That result remains an untrusted candidate until Provider Validation
and EN-003 both succeed.

---

## Provider Validation

Provider Validation enforces the technical boundary before constitutional
review.

### Schema validation

The provider result must be a serializable object matching the approved output
schema. Malformed JSON or a non-object result is rejected.

### Field validation

All required fields must be present with the expected types. Unexpected,
missing, prohibited, empty, oversized, or incorrectly encoded fields are
rejected.

### Version validation

The returned schema version must match the version requested by the Engine and
the currently supported provider output version.

### Reasoning protection

Provider output must not contain chain-of-thought, internal reasoning, internal
prompts, privileged review or revision details, audit data, or inspection
content. These restrictions apply to response content and metadata fields.

### Failure classification

Timeouts, connection errors, malformed output, schema violations, provider
refusals, configuration errors, and unknown failures are converted into stable
provider-boundary categories. Raw provider errors never cross the learner-safe
boundary.

### Why the Provider Boundary exists

PB exists because language providers are external and probabilistic. A
provider's API shape, refusal behavior, metadata, errors, and output format must
not become constitutional authority. Validation makes technical trust explicit
and gives EN-005 a stable failure category when generation cannot continue.

---

## EN-003 Constitutional Review

EN-003 determines whether a technically valid candidate may proceed.

### Review responsibilities

Review checks:

- all required behavioral principles;
- selected-strategy compliance;
- Behavior Plan component compliance;
- harm and safety requirements;
- protected constitutional boundaries;
- deterministic rules for known violations, including hidden authority and
  unintended language contamination.

Review evaluates the complete candidate in the context of the learner message,
selected strategies, and Behavior Plan.

### Strategy verification

Every selected strategy receives an explicit result. Review verifies that the
primary strategy is expressed and that secondary strategy behavior is present
without conflicting with the primary.

### Behavior verification

Every required Behavior Plan component receives an explicit result. A candidate
cannot pass merely because it sounds generally helpful.

### Constitutional verification

All ten behavioral principles remain explicit in every review. Review also
checks safety and targeted constitutional protections that cannot be reduced to
provider declarations.

### Outcomes

- **`APPROVED`:** The candidate may be delivered.
- **`REVISION_REQUIRED`:** The candidate contains a correctable violation and
  proceeds to EN-004.
- **`REJECTED`:** The candidate must not be delivered. It proceeds to EN-005
  without being represented as an acceptable answer.

EN-003 creates findings, not replacement prose. It must never silently repair,
deliver, or expose the rejected candidate.

---

## EN-004 Revision

EN-004 is used only when EN-003 returns `REVISION_REQUIRED`.

Revision exists because some candidates are constitutionally close but contain
a bounded, correctable problem: unintended mixed-language text, an
overreaching phrase, missing required behavior, or another violation that can
be corrected without changing the learner's request.

### What revision may change

Revision may:

- remove or replace the identified violating language;
- add missing required behavior;
- clarify uncertainty or responsibility;
- restore dignity, freedom, or truthful examination;
- improve constitutional and conversational compliance.

### What revision must preserve

Revision must preserve:

- the original learner message and request;
- the selected primary and secondary strategies;
- the Behavior Plan objective;
- topic and scope;
- learner authority and responsibility;
- factual and constitutional meaning not identified as defective.

Revision must not introduce a new topic, authority, decision, or unsupported
claim. Its summary and corrected-violation record must accurately describe the
change.

### Revision control

The Engine permits exactly one revision. The revised response passes through an
independent structural preservation verifier and EN-003 review again. It is
delivered only if both checks succeed.

If revision cannot be produced, preservation cannot be verified, or the second
review does not approve it, EN-005 is invoked.

Revision prevents an easily correctable candidate from causing an unnecessary
fallback while preserving a strict upper bound against iterative provider
drift.

---

## EN-005 Approved Fallbacks

EN-005 provides constitutionally governed failure behavior.

Fallback categories cover:

- constitutional uncertainty;
- ethical boundaries;
- safety;
- technical limitations;
- review rejection;
- revision failure.

Fallback selection considers:

- selected strategies, when available;
- review outcome;
- revision outcome;
- stable provider failure category;
- current-session context required for the selection;
- whether Behavior Planning was available.

Strategy-aware variants ensure that safety and ethical-boundary failures remain
useful and proportionate. A permitted technical-limitation path exists for
failures occurring before Behavior Planning.

Fallbacks are part of the constitutional architecture, not error messages.
Their learner-facing text is documented and pre-approved. They preserve
humility and freedom without leaking internal failures, rejected candidates,
raw errors, review findings, revision records, prompts, or privileged
inspection.

EN-005 must not improvise a new response during failure handling.

---

## Engine Principles

- One responsibility per stage.
- Explicit inputs.
- Explicit outputs.
- Closed constitutional registries.
- Deterministic selection, planning, and validation.
- Provider output remains untrusted until review.
- Exactly one revision maximum.
- Pre-approved failure behavior.
- Privileged inspection never crosses the learner-safe boundary.
- Constitution before convenience.
- Review before delivery.
- Regression before certification.

---

## Future Evolution

Acceptable future work includes:

- improving routing recognition and compatible strategy combinations;
- strengthening deterministic and semantic review;
- adding providers behind the existing provider-neutral boundary;
- adding evaluation sets for demonstrated constitutional gaps;
- improving verification and observability without exposing privileged data;
- improving response quality while preserving selected strategies and plans.

The responsibilities of EN-001 through EN-005 should remain stable unless the
constitutional architecture itself changes through approved human
examination. Provider capability, UI requirements, benchmark optimization, or
implementation convenience are not sufficient reasons to collapse stages or
move constitutional authority into generation.

Any behavior-affecting Engine change requires focused regression tests, the
complete automated suite, and full evaluation before a new version may be
certified.

No lies. No shortcuts. Think for yourself.
