# CUR-001 Official Publication v1

Status: Official educational publication

Foundation baseline: Foundation v1.0 Certified

Curriculum architecture:
[CUR-000](docs/curriculum/CUR-000-curriculum-architecture.md)

Curriculum module:
[CUR-001](docs/curriculum/CUR-001-thinking-clearly.md)

Validation: CUR-001 Review PASS

Verification: 458 automated tests passing

---

## Purpose

CUR-001 Official Publication v1 establishes the first complete Lifeschool
curriculum module over Steward's certified learner-safe conversation pipeline.

Thinking Clearly gives learners a structured way to separate observations,
feelings, assumptions, interpretations, evidence, alternatives, consequences,
and open questions. It teaches examination rather than obedience and preserves
learner judgment throughout.

## Published scope

This publication includes:

- **CUR-000 Curriculum Architecture**, defining the relationship between
  curriculum, Steward, learner judgment, exercises, and completion;
- **CUR-001 Thinking Clearly**, the first Lifeschool curriculum module;
- the reusable **Lifeschool Lesson Framework**, which renders lessons from
  structured curriculum data;
- all **six Thinking Clearly lessons**:
  1. What happened vs. what it means;
  2. Feelings are real, but not always final evidence;
  3. Assumptions and missing information;
  4. Better questions create better thinking;
  5. Evidence, alternatives, and consequences;
  6. From reaction to examination;
- **exercise-to-Steward handoff**, which carries the learner's own exercise
  into the existing learner-safe production conversation path;
- **session-only learning**, including exercise text, practice transcripts,
  and completion state that are not persisted;
- **mobile support** for the module home, lessons, exercises, handoffs, and
  completion controls;
- direct access to all six lessons without requiring sequential reopening.

## Validation

The publication has been validated through:

- **CUR-001 Review: PASS** - the module home, six lessons, required lesson
  sections, exercises, handoffs, navigation, completion behavior, and overall
  Lifeschool learning experience were reviewed end to end;
- **Learner Experience: PASS** - the curriculum retains the learner-safe,
  calm, practical, non-controlling experience established by LX-001;
- **458 automated tests: PASS** - the complete test suite passes;
- TypeScript typecheck: PASS;
- mobile browser smoke tests: PASS;
- confirmation that curriculum output does not expose privileged trace,
  provider metadata, strategy identifiers, or constitutional review details.

## Known limitations

- Only one curriculum module is available.
- Progress exists only for the current page session.
- No accounts or authentication are included.
- No local or server-side persistence is included.
- No learner dashboard is included.
- No curriculum search is included.

These limitations are intentional for the release candidate. They keep the
initial learning experience simple and avoid introducing data collection,
tracking, or learner identity systems without separate examination.

For this first official publication, the same limitations remain intentional to
preserve learner safety, simplicity, and constitutional fidelity.

## Recommended next phase: Curriculum Expansion

The recommended next phase is **Curriculum Expansion**.

Future work may add carefully governed modules from the CUR-000 draft module
set while preserving:

- the certified constitutional baseline;
- the reusable Lesson Framework;
- learner judgment, freedom, dignity, and responsibility;
- learner-safe Steward handoffs;
- regression coverage for every new lesson and module;
- curriculum review before release.

Expansion should add substantive learning opportunities without introducing
accounts, persistence, tracking, or engagement mechanics by default.

No lies. No shortcuts. Think for yourself.
---

## Foundation Principle Reference

See CA-001 (FP-001) for canonical wording and interpretation.







