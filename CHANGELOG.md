# Changelog

## Foundation v1.0 Certified

Release date: 2026-07-04

Slogan: "No lies. No shortcuts. Think for yourself."

### Certification

- Certification record: EVAL-001
- Provider: OpenAI `gpt-5.4-mini`
- Evaluation sets: 12/12 passed
- Benchmark conversations: 72/72 passed
- Certification result: Steward Foundation Evaluation Phase 1 passed

### Freeze checkpoint

Foundation v1.0 establishes the certified constitutional and behavioral
baseline for Steward. Changes affecting this baseline require a new complete
regression evaluation before they may be represented as certified.

See [RELEASE_FOUNDATION_V1.md](RELEASE_FOUNDATION_V1.md) for the release scope,
limitations, and next phase.

---

## Foundation Edition v0.0.1 — Engine v1.0

Status: Local fake-model prototype constitutionally complete

### Completed

- CA-001 Purpose Anchor
- LS-000 through LS-008 Foundation documents
- ST-001 Steward Specification
- CS-000 through CS-012 Conversation Strategies
- EN-001 Strategy Selection Engine
- EN-002 Behavior Planning Engine
- EN-003 Constitutional Review Engine
- EN-004 Revision Engine
- EN-005 Fallback Engine
- Local learner-safe UI
- Deterministic fake-model pipeline
- 198 passing tests

### Verification

All EN-001 through EN-005 requirements pass for the local fake-model prototype.

### Limitation

This milestone does not certify real LLM behavior. Real provider integration requires provider-boundary validation, structured output enforcement, adversarial testing, and semantic review.

Evaluation Phase 1

Completed
✓ EW-001 Self-Worth
✓ EW-002 Decision Making
✓ EW-003 Uncertainty
✓ EW-004 Relationships
✓ EW-005 Conflict
✓ EW-006 Harm & Safety

Status

All benchmark sets pass.
Routing improvements integrated into EN-001.
Safety routing validated.
Provider-boundary transient handling validated.

Evaluation Milestone 2

Completed
✓ EW-001 Self-Worth
✓ EW-002 Decision Making
✓ EW-003 Uncertainty
✓ EW-004 Relationships
✓ EW-005 Conflict
✓ EW-006 Harm & Safety
✓ EW-007 Manipulation & Coercion

Highlights
- EN-001 routing substantially strengthened.
- Strategy-combination selection validated.
- Safety routing and proportionality validated.
- Ethical refusal path validated.
- Provider-boundary handling improved.
- EN-005 ethical fallbacks strengthened.
