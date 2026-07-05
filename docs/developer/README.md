# Steward Developer Documentation

This directory is the starting point for developers working on Steward. It
describes how to run, understand, change, evaluate, and release the software
without separating implementation decisions from their constitutional source.

Steward Foundation v1.0 has completed constitutional certification under
[EVAL-001](../evaluation/EVAL-001-certification.md). The certified baseline
passed all 12 evaluation sets and all 72 benchmark conversations. Certification
applies to that evaluated version and does not remove the need to rerun
verification and evaluation after behavior changes.

Before changing Steward, read the governing documentation:

- [Whitepaper](../whitepaper/STEWARD_FOUNDATION_WHITEPAPER.md) — the purpose,
  scope, and conceptual model of Steward Foundation.
- [Constitution](../foundation/anchors/CA-001.md) — the highest constitutional
  anchor. The supporting Foundation documents are indexed by
  [LS-000](../foundation/LS-000.md).
- [Architecture](../architecture/AR-000.md) — the architecture documentation
  and its relationship to constitutional requirements.
- [Evaluation](../evaluation/EVAL-000.md) — the behavioral evaluation
  framework. The current certified result is recorded in
  [EVAL-001](../evaluation/EVAL-001-certification.md).

## Documentation Structure

- [01-getting-started.md](01-getting-started.md) — local prerequisites,
  installation, configuration, development commands, and the shortest path to
  running Steward safely.
- [02-architecture-overview.md](02-architecture-overview.md) — system
  boundaries, major components, data flow, learner-safe and privileged
  interfaces, and constitutional traceability.
- [03-conversation-strategies.md](03-conversation-strategies.md) — the closed
  Conversation Strategy registry, strategy selection, combinations, priority,
  and the relationship between strategies and behavior plans.
- [04-engine.md](04-engine.md) — the EN-001 through EN-005 conversation path:
  strategy selection, behavior planning, constitutional review, revision, and
  fallback.
- [05-provider-boundary.md](05-provider-boundary.md) — provider-neutral
  contracts, prompt construction, structured output validation, failure
  classification, configuration, and adapter responsibilities.
- [06-evaluation.md](06-evaluation.md) — the evaluation framework, benchmark
  execution, scoring, transient-provider policy, regression interpretation, and
  certification requirements.
- [07-release-process.md](07-release-process.md) — release preparation,
  required verification, full-suite evaluation, certification records, freeze
  checkpoints, and conditions that invalidate certification.

## Development Principles

- Preserve constitutional behavior. Code implements constitutional authority;
  it does not create it.
- Trace significant behavior to CA-001, the Foundation documents, ST-001, and
  the relevant specifications.
- Run the complete evaluation suite before certifying any behavior change.
- Prefer examination over prescription.
- Protect learner dignity, freedom, judgment, and responsibility.
- Avoid introducing hidden authority through prompts, defaults, model output,
  review logic, or interface design.
- Keep learner-facing output separate from privileged inspection data.
- Treat provider output as untrusted until it passes boundary validation and
  constitutional review.
- Preserve the one-revision maximum and approved fallback path.
- Do not optimize for individual benchmark conversations. Correct the
  underlying constitutional behavior and evaluate the complete suite.
- Prefer the smallest faithful implementation and avoid unnecessary state,
  coupling, or abstraction.
- Document uncertainty, limitations, and behavior-affecting changes plainly.

No lies. No shortcuts. Think for yourself.
