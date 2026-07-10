# AR-004
# Guest-First Optional Account Architecture

Version: Foundation Edition v0.1.0 (Draft)

Status: Architecture Specification

Derived From:
AR-000
AR-001
AR-002
LS-000
LS-002
LS-003
ST-001

---

# Purpose

This specification prepares Life School for future learner accounts without introducing account behavior now.

It defines a guest-first architecture where learners can start immediately, optionally connect an account later, save progress in a portable way, and move reflections safely across devices through export, import, and future sync.

This is architecture only.

No implementation.

No authentication.

No database.

Documentation only.

---

# Scope

In scope:

- Guest-first learning flow.
- Optional account attachment model.
- Save-progress architecture (guest and future attached contexts).
- Future sync-later architecture.
- Reflection export architecture.
- Reflection import architecture.
- Cross-device continuity model.
- Future migration model from guest-first operation to optional account operation.
- Data boundaries and contracts for future implementation.

Out of scope:

- Account implementation.
- Authentication implementation.
- Authorization implementation.
- Server persistence implementation.
- Database schema changes.
- Migration scripts.
- API implementation.
- UI implementation.

---

# Constitutional Constraints

The following constraints are mandatory for this architecture milestone:

- No persistence changes in current implementation.
- No authentication behavior in current implementation.
- No database changes in current implementation.
- No change to curriculum content.
- No change to constitutional authority flow.

---

# Design Principles

## 1) Guest First

Learning must begin without signup, login, identity proof, or account prompts.

## 2) Optional Account

Accounts are a future enhancement, not a prerequisite.

## 3) Sync Later

A learner may choose to attach an account only after meaningful use.

## 4) Human Ownership of Reflections

Learners should be able to export reflections and later import reflections under clear controls.

## 5) Reversible Path

A learner can remain guest indefinitely without degraded core learning behavior.

## 6) Minimal Constitutional Surface

Account architecture must remain subordinate to constitutional purpose, dignity, freedom, and responsibility.

---

# Requested Architecture Explanations

## Guest-First Philosophy

Life School must remain immediately available without account creation.

Architecture implication:

- Guest is the default and primary entry state.
- Core learning flow cannot depend on identity systems.
- Account prompts (future) must be optional and non-blocking.

Constitutional rationale:

- Protects dignity and freedom by reducing gatekeeping at first use.

## Optional Account

Accounts are a future continuity feature, not an access control requirement.

Architecture implication:

- Introduce an account boundary only as an additive layer.
- Keep conversation and curriculum behavior identical across guest and attached modes.
- Ensure feature flags can keep optional account capabilities disabled without affecting core learning.

## Save Progress

Progress is modeled as learner-owned progress artifacts that can exist in guest context now and attached context later.

Architecture implication:

- Define a normalized progress artifact model independent of identity provider decisions.
- Track progress state transitions as contract events (created, updated, exported, imported, synced).
- Keep persistence strategy abstract in this phase (no storage implementation in this milestone).

## Cross-Device Sync

Cross-device continuity is a future capability activated only after optional account attachment.

Architecture implication:

- Define sync contracts as idempotent, retry-safe, and conflict-visible.
- Separate sync logic from conversation runtime so temporary sync failures do not block learning.
- Support explicit learner actions for conflict resolution instead of silent overwrites.

## Saved Reflections

Reflections are learner-authored records that require portability and clear ownership boundaries.

Architecture implication:

- Use export/import contracts as the canonical portability path.
- Preserve authored content during merge operations.
- Maintain schema versioning so future changes do not invalidate prior reflection packages.

## Privacy

Privacy is a first-class architectural constraint rather than a late implementation add-on.

Architecture implication:

- Apply data minimization to future sync payloads.
- Require explicit user intent before attachment, import, or sync operations.
- Keep operational telemetry free of raw reflection text by default.
- Make attachment and sync behavior transparent and auditable to the learner.

## Future Migration

Migration means evolving from guest-only operation to optional account operation without breaking existing learner continuity.

Architecture implication:

- Introduce versioned contracts before any account rollout.
- Keep guest-mode invariants stable throughout migration phases.
- Support reversible attachment posture: a learner can continue as guest without loss of core functionality.
- Plan migration as staged capability release: contracts -> verification -> optional activation.

---

# Conceptual Domain Model

## Learner Modes

- Guest Mode: default mode with no account linkage.
- Attached Mode: future mode where a learner links an optional account.

## Reflection Ownership States

- Local Session Reflection: reflection content in current runtime context.
- Portable Reflection Package: exported learner-owned package.
- Attached Reflection Record: future synced record linked to optional account.

## Identity Relationship

- Guest identity is session-scoped and non-authoritative.
- Optional account identity is future authoritative identity for sync.

---

# Target Capability Matrix

| Capability | Guest Mode (Now) | Guest Mode (Future) | Attached Mode (Future) |
|---|---|---|---|
| Start learning instantly | Yes | Yes | Yes |
| Requires login | No | No | Yes, only when attaching |
| Core conversation flow | Yes | Yes | Yes |
| Save progress | Runtime-only | Portable package support | Attached continuity support |
| Reflection export | Not implemented | Yes (planned) | Yes (planned) |
| Reflection import | Not implemented | Yes (planned) | Yes (planned) |
| Cloud sync | No | No | Yes |
| Account recovery | No | No | Yes |

---

# Architecture Building Blocks

## A) Reflection Workspace Boundary

A logical boundary separating reflection data handling from conversation runtime.

Responsibilities:

- Normalize reflection units.
- Assign reflection package version metadata.
- Prepare data for export/import contracts.

Non-responsibilities:

- Persist data to database.
- Authenticate user identity.

## B) Guest Session Context

A mode context that signals guest-first behavior.

Responsibilities:

- Default learner mode to guest.
- Keep account prompts optional and non-blocking.

Non-responsibilities:

- Credential handling.
- Permission grants.

## C) Attachment Orchestrator (Future)

A future logical orchestrator that links guest reflection data to optional account identity.

Responsibilities:

- Validate attach request in future auth boundary.
- Merge guest reflection package into attached profile by policy.

Non-responsibilities:

- Define constitutional policy.
- Change conversation strategy authority.

## D) Export/Import Contract Layer

A contract-first layer defining portable reflection package format and validation rules.

Responsibilities:

- Schema versioning.
- Integrity checks.
- Compatibility checks.

Non-responsibilities:

- Storage backend decisions.
- Identity provider decisions.

---

# Future Interface Contracts (Documentation-Level)

These contracts are architectural placeholders only.

## Export Contract

Input:

- Reflection workspace collection.
- Export options (scope, date range, format version).

Output:

- Portable Reflection Package.

Minimum package fields:

- packageVersion
- exportedAt
- sourceMode
- progressSummary
- reflectionItems
- integrity

## Import Contract

Input:

- Portable Reflection Package.
- Import options (append, replace, dry-run).

Output:

- Import report with accepted, rejected, and conflicted item counts.

Minimum validation checks:

- Schema version compatibility.
- Structural integrity.
- Content safety guardrails.

## Sync Contract (Future)

Input:

- Account attachment state.
- Reflection delta set.

Output:

- Sync report and conflict report.

Minimum behavior:

- Idempotent operations.
- Conflict visibility.
- Retry-safe protocol.

---

# Save-Progress and Continuity Model (Architecture Only)

Progress continuity is represented as a contract-level model, not a storage implementation.

Core continuity units:

- Reflection item.
- Progress checkpoint.
- Curriculum position marker.

Continuity guarantees required before implementation:

- A learner can keep learning without account attachment.
- A learner can export continuity units in a portable package.
- A future attached mode can import and sync the same continuity units without schema breakage.

---

# Guest-to-Attached Lifecycle (Future)

1. Learner starts in Guest Mode.
2. Learner creates reflections during normal use.
3. Learner optionally chooses Attach Account.
4. Future auth boundary verifies identity.
5. Attachment Orchestrator links guest reflection package.
6. Learner continues with attached sync behavior.

If step 3 never occurs, learner remains fully supported in Guest Mode.

---

# Conflict and Merge Policy (Future)

Required policy decisions before implementation:

- Canonical item identity strategy.
- Duplicate detection thresholds.
- Merge precedence for timestamps and edits.
- Manual conflict review behavior.

Default architectural posture:

- Preserve learner content.
- Prefer explicit conflict reporting over silent overwrite.

---

# Security and Privacy Posture (Future)

The architecture requires the following safeguards when implementation begins:

- Explicit consent before account attachment.
- Clear separation between guest context and attached identity.
- No silent background identity binding.
- Data minimization for synced reflection payloads.
- Auditability of import and sync actions.

Privacy non-negotiables for implementation readiness:

- No forced account prompts during first-use learning.
- No hidden transfer of guest reflections to attached identity.
- Clear learner controls for export, import, and future sync scopes.

---

# Observability Requirements (Future)

When implemented, account-related flows should emit auditable events:

- Mode transitions (guest to attached).
- Export created.
- Import attempted.
- Import completed with counts.
- Sync attempted and resolved.

Events must avoid storing sensitive reflection text in operational logs by default.

---

# Verification Requirements (Future)

Future implementation must be verifiable at three levels:

- Contract verification: export/import/sync schema and compatibility tests.
- Behavioral verification: guest-first invariants and optional-account invariants.
- Safety verification: no forced account gating for core learning.

---

# Invariants

The following invariants must remain true:

- Core learning remains available in Guest Mode.
- Optional account never becomes mandatory for first-use learning.
- Export and import remain learner-controlled actions.
- Account architecture never alters constitutional authority.

---

# Explicit Milestone Guardrails

This AR-004 milestone is complete only as documentation architecture.

The following are explicitly excluded from this milestone:

- Authentication implementation.
- Authorization implementation.
- Account UI implementation.
- API endpoints.
- Database schema and data migrations.
- Runtime persistence changes.

---

# Implementation Readiness Checklist (Future)

Before writing account code, confirm all are complete:

- Approved export package schema.
- Approved import validation policy.
- Approved guest-to-attached merge policy.
- Approved privacy and retention policy.
- Approved verification plan and test matrix.

---

# Non-Implementation Declaration

This document intentionally introduces no code behavior.

No account feature is implemented by this specification.

No authentication is implemented by this specification.

No persistence or database behavior is implemented by this specification.

It is architecture only, for future development readiness.
