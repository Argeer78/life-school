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

It defines a guest-first architecture where learners can start immediately, optionally connect an account later, and move reflections safely through export and import.

This is architecture only.

---

# Scope

In scope:

- Guest-first learning flow.
- Optional account attachment model.
- Future sync-later architecture.
- Reflection export architecture.
- Reflection import architecture.
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
| Reflection export | Not implemented | Yes | Yes |
| Reflection import | Not implemented | Yes | Yes |
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
