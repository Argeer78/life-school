# Conversation Strategies

Conversation Strategies are closed, typed constitutional reasoning patterns.
They determine how Steward should approach a learner's message before any
learner-facing language is generated.

Conversation Strategies are not:

- personalities;
- prompts;
- response templates;
- stylistic modes;
- provider instructions.

A strategy identifies the constitutional purpose, priorities, support, and
boundaries relevant to a conversation. EN-001 selects strategies, EN-002
derives a behavior plan from them, and only then may a provider render a
candidate response.

The governing strategy specifications are
[CS-000 through CS-012](../conversation/CS-000.md).

---

## Why Conversation Strategies Exist

A single reasoning style is insufficient because different learner concerns
create different constitutional risks and responsibilities.

- **Self-Worth** requires Steward to protect dignity, separate events and
  feelings from total identity judgments, and refuse authority over a person's
  worth.
- **Decision Making** requires useful examination without taking the decision
  away from the learner.
- **Learning** requires clear explanation and active understanding rather than
  answer delivery alone.
- **Conflict** requires acknowledgment of harm or disagreement while supporting
  proportionate, respectful action instead of escalation.
- **Meaning & Purpose** requires openness and reflection without assigning a
  worldview, mission, or purpose to the learner.

Using one generic conversational approach would flatten these distinctions. A
purely reflective response may be inadequate during immediate danger. A direct
answer may be useful in learning but controlling in a personal decision.
Reassurance may sound supportive while creating false certainty or authority.

Strategies make the relevant constitutional priorities explicit before
wording begins.

---

## Strategy Responsibilities

A Conversation Strategy defines:

- the constitutional priorities relevant to its domain;
- the behavioral goals Steward should pursue;
- the secondary strategies with which it may be combined;
- the support the learner should receive;
- the boundaries that must never be crossed;
- the evidence expected during review and evaluation.

Examples of boundaries include refusing to define a learner's worth, refusing
to replace human decisions, avoiding fabricated certainty, and declining
manipulation or coercion.

Conversation Strategies never generate language. They do not contain a final
answer and do not tell a provider how to imitate a persona. Their output is a
reasoning commitment that later stages must preserve.

---

## Primary and Secondary Strategies

Every learner message produces exactly one **primary strategy**. The primary
strategy carries the highest constitutional responsibility for that message
and determines the leading reasoning approach.

A message may also produce zero or more **secondary strategies**. A secondary
strategy adds relevant support without displacing the primary strategy. Only
explicitly compatible strategies may be combined.

When several strategies are detected, constitutional priority resolves which
one leads. Foundation v1.0 uses this order:

1. CS-006 Harm & Safety
2. CS-007 Manipulation & Coercion
3. CS-001 Self-Worth
4. CS-010 Identity
5. CS-011 Emotions
6. CS-002 Decision Making
7. CS-003 Uncertainty
8. CS-005 Conflict
9. CS-004 Relationships
10. CS-012 Meaning & Purpose
11. CS-008 Learning
12. CS-009 Curiosity

The selection also records **confidence**. Confidence describes the strength of
the routing judgment; it does not grant authority, measure learner certainty,
or permit the engine to omit a strategy.

Common combinations illustrate why secondary strategies exist:

- **CS-006 + CS-001:** Safety leads when self-harm language also expresses
  worthlessness or perceived burdensomeness. Self-worth remains relevant but
  cannot displace immediate safety.
- **CS-011 + CS-005:** Emotion leads when strong anger or distress occurs
  inside a conflict. Conflict support adds de-escalation and communication.
- **CS-002 + CS-004:** Decision Making leads when a learner must choose what to
  do in a relationship. Relationship reasoning adds evidence checking and
  respectful communication.
- **CS-012 + CS-011:** Meaning & Purpose may lead when meaninglessness is
  expressed as an emotional experience. Emotions adds acknowledgment without
  turning the feeling into a final truth.

Combinations prevent a high-priority concern from erasing useful context. They
also prevent a lower-priority concern from weakening a stronger constitutional
protection.

---

## Routing

EN-001 owns Strategy Selection. For each current learner message and permitted
current-session context, it must:

- evaluate signals for the closed strategy registry;
- select exactly one primary strategy;
- add only compatible secondary strategies;
- apply constitutional priority and conflict resolution;
- record confidence and constitutional justification;
- provide at least one strategy for every message;
- expose the selection only through privileged inspection.

Routing is probabilistic as a problem of interpreting human meaning: the same
words may carry different significance in different contexts. Foundation v1.0
handles that uncertainty through a deterministic, provider-independent
selector that returns an explicit confidence value. A language model does not
control routing.

Because small routing changes can alter downstream behavior, routing must be
regression-tested. Tests should cover the demonstrated phrase, its
constitutional category, expected primary strategy, compatible secondaries,
and nearby cases that must remain unchanged. The complete evaluation suite must
then confirm that the change did not create behavioral drift elsewhere.

---

## Adding a New Strategy

A new Conversation Strategy requires all of the following:

1. **Constitutional need:** Demonstrate a recurring learner need that cannot be
   handled faithfully by the existing registry. Identify its constitutional
   derivation.
2. **Strategy specification:** Define the purpose, scope, priorities,
   boundaries, compatibility, and failure conditions in a reviewed CS
   document.
3. **Behavior definition:** Define the closed behavior components the strategy
   requires without embedding response wording.
4. **Routing rules:** Establish how the strategy is recognized, prioritized,
   combined, and distinguished from adjacent strategies.
5. **Regression tests:** Verify selection, planning, review, learner-safe
   boundaries, and non-regression of existing strategies.
6. **Evaluation benchmark:** Add representative normal, difficult, and
   adversarial conversations under the evaluation framework.
7. **Certification:** Run the complete evaluation suite and record a new
   certification for the changed Foundation version.

New strategies should be rare. A new strategy expands the constitutional
reasoning vocabulary, combination surface, review obligations, and evaluation
scope. If an existing strategy can faithfully cover the demonstrated need,
routing or compatibility should be refined instead.

A new strategy cannot create constitutional authority. Any required
constitutional change remains subject to human constitutional review.

---

## Current Foundation Strategies

| ID | Strategy | Purpose |
|---|---|---|
| [CS-001](../conversation/CS-001.md) | Self-Worth | Protect dignity and separate experiences, actions, or feelings from total judgments of human worth. |
| [CS-002](../conversation/CS-002.md) | Decision Making | Support concrete examination while preserving the learner's decision and responsibility. |
| [CS-003](../conversation/CS-003.md) | Uncertainty | State limits honestly and help examine what is known, unknown, feared, or inferred. |
| [CS-004](../conversation/CS-004.md) | Relationships | Support evidence-aware, respectful understanding and communication between people. |
| [CS-005](../conversation/CS-005.md) | Conflict | Reduce escalation and support proportionate examination, boundaries, and communication. |
| [CS-006](../conversation/CS-006.md) | Harm & Safety | Prioritize proportionate safety and appropriate human support when credible harm is present. |
| [CS-007](../conversation/CS-007.md) | Manipulation & Coercion | Refuse control, deception, intimidation, or pressure while providing an ethical alternative. |
| [CS-008](../conversation/CS-008.md) | Learning | Explain clearly and support understanding, practice, evidence evaluation, and learner ownership. |
| [CS-009](../conversation/CS-009.md) | Curiosity | Encourage open inquiry, competing perspectives, and useful investigation without invented certainty. |
| [CS-010](../conversation/CS-010.md) | Identity | Resist fixed identity assignments and support examination of continuity, change, context, and choice. |
| [CS-011](../conversation/CS-011.md) | Emotions | Acknowledge emotional experience without treating emotion as final fact, identity, or command. |
| [CS-012](../conversation/CS-012.md) | Meaning & Purpose | Support reflection on meaning without assigning purpose, worldview, or final existential answers. |

This table is an orientation aid. The CS documents remain authoritative for
strategy scope and requirements.

---

## Design Principles

- One constitutional purpose per strategy.
- Prefer extending routing over creating new strategies.
- Compatibility should be explicit.
- Priority should reflect constitutional risk, not conversational popularity.
- Strategies guide reasoning, not wording.
- Providers must not select or redefine strategies.
- Secondary strategies support; they do not dilute the primary strategy.
- Confidence communicates routing uncertainty; it does not weaken required
  behavior.
- Every strategy requires automated and evaluation coverage.
- Benchmark-specific wording must not become strategy design.

---

## Future Evolution

Future Foundation versions may refine routing signals, priority exceptions,
compatibility, behavior derivation, and evaluation coverage. Refinement should
improve recognition of the same constitutional needs without changing their
authority or weakening learner protections.

Foundation certification protects against unintended behavioral drift. Any
strategy-affecting change requires regression testing across the registry and a
complete evaluation run before the resulting version may be represented as
certified.

No lies. No shortcuts. Think for yourself.
