# AR-005
# Internal Privacy-First Analytics Architecture

Version: Foundation Edition v0.1.0 (Draft)

Status: Architecture Specification

Derived From:
AR-000
AR-001
AR-002
LS-001
LS-004
LS-005
ST-001

---

# Purpose

This specification defines the internal analytics architecture used to improve Lifeschool while preserving learner dignity and privacy.

It documents:

- anonymous event contracts,
- internal aggregation behavior,
- future admin summary schema,
- strict privacy boundaries.

---

# Scope

In scope:

- Anonymous internal analytics events.
- Event validation and rejection rules.
- Aggregation model for product improvement metrics.
- Future admin summary API contract.

Out of scope:

- Third-party analytics services.
- Identity-based analytics.
- Conversation content analytics.
- Reflection content analytics.
- Public dashboard UI implementation.

---

# Non-Negotiable Privacy Constraints

The analytics system shall never store:

- learner conversations,
- personal reflections,
- prompts,
- responses,
- transcript text.

The analytics system shall reject payloads that attempt to include these fields.

No third-party analytics SDK, script, pixel, or remote tracking endpoint is allowed.

---

# Design Principles

## 1) Internal Only

All analytics ingestion and aggregation remain inside Lifeschool infrastructure.

## 2) Anonymous by Default

No account, profile, or personal identifier is required or stored.

## 3) Minimal Data Collection

Collect only what is needed to improve module and lesson quality.

## 4) Separation from Learning Content

Analytics events must remain structurally separate from learner conversation/reflection flows.

## 5) Future Admin Surface

Analytics summaries are prepared for a future admin dashboard and must stay non-public by default.

---

# Metrics in Scope

The architecture supports anonymous tracking for:

- modules started,
- modules completed,
- lesson completion,
- average lesson duration,
- most helpful modules,
- most visited pages,
- language usage,
- device types.

---

# Event Contract

Event endpoint (internal):

- `POST /api/analytics`

Accepted event types:

- `page_view`
- `module_started`
- `module_completed`
- `lesson_completed`
- `lesson_duration`
- `module_helpful`
- `language_usage`

Allowed fields by event family:

- Page: `path`, optional `locale`
- Module: `moduleSlug`
- Lesson completion: `moduleSlug`, `lessonNumber`
- Lesson duration: `moduleSlug`, `lessonNumber`, `durationMs`
- Language: `locale`

Validation posture:

- strict field validation,
- strict type validation,
- reject malformed values,
- reject forbidden content fields.

---

# Aggregation Model

Anonymous counters and aggregates include:

- module start counts by module slug,
- module completion counts by module slug,
- lesson completion counts by `moduleSlug/lesson-n`,
- helpful-module counts by module slug,
- page visit counts by path,
- language counts,
- device type counts,
- average lesson duration derived from accepted duration events.

No raw learner text is used in aggregation.

---

# Future Admin Summary Contract

Summary endpoint (future admin):

- `GET /api/admin/analytics-summary`

Access model:

- restricted,
- token-gated,
- not exposed to public learner routes.

Summary schema:

- `totals`
- `modulesStarted`
- `modulesCompleted`
- `lessonCompletion`
- `helpfulModules`
- `mostVisitedPages`
- `languageUsage`
- `deviceTypes`
- `lastUpdatedAt`

This endpoint is reserved for future admin dashboard integration.

---

# Security and Governance Requirements

- Keep analytics code paths isolated from provider-response inspection paths.
- Keep analytics payloads non-sensitive.
- Maintain explicit tests that enforce privacy rejection behavior.
- Keep this architecture subordinate to constitutional purpose and dignity.

---

# Verification Requirements

Implementation must be verifiable through tests for:

- valid event acceptance,
- invalid event rejection,
- forbidden-content rejection,
- correct aggregate computation,
- admin summary access control,
- absence of third-party analytics integrations.

---

# Invariants

The following invariants must remain true:

- No learner conversation content is stored in analytics.
- No personal reflection content is stored in analytics.
- No third-party analytics service is used.
- Analytics remain anonymous and internal.
- Admin analytics summaries remain non-public by default.
