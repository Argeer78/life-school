# Steward Learner Product v1

Status: Learner product release checkpoint

Foundation baseline: Foundation v1.0 Certified

Foundation certification:
[EVAL-001](docs/evaluation/EVAL-001-certification.md)

Learner experience:
[LX-001](docs/learner-experience/LX-001-learner-experience-principles.md)

Learner experience validation:
[LX-EVAL-001](docs/learner-experience/LX-EVAL-001-learner-experience-evaluation.md)
PASS

Verification: 444 automated tests passing

---

## What was added

Learner Product v1 adds `/learn`, a clean learner-facing Steward conversation
surface over the certified production pipeline.

The product includes:

- the same production learner-safe API and output boundary used by Steward;
- a calm, simple, mobile-friendly conversation interface;
- a browser-memory-only transcript;
- a Clear conversation control;
- clear identity text explaining that Steward supports examination without
  replacing learner judgment;
- the slogan, "No lies. No shortcuts. Think for yourself.";
- a visible statement that Steward is not a therapist, emergency service, or
  final authority;
- LX-001 Learner Experience Principles;
- LX-EVAL-001 and a six-prompt learner-experience smoke set.

The learner surface shows only learner-safe responses. It does not display
strategy IDs, behavior plans, provider observations, review details, revision
records, fallback inspection, or DevTools traces.

## What was validated

LX-EVAL-001 records a PASS for Learner Product v1.

Validation confirmed:

- `/learn` loads and remains usable at a mobile viewport;
- the slogan and limitation statement remain visible;
- learner messages use the production learner-safe path;
- browser output contains no privileged trace or provider metadata;
- the transcript exists only in browser memory;
- Clear conversation removes the local transcript;
- all six learner-experience smoke responses provide one relevant, usable
  next step under human LX-001 review;
- responses remain below the LX reference length and avoid list-heavy
  accumulation;
- the complete automated suite passes with 444 tests.

LX-EVAL-001 complements EVAL-000 and EVAL-001. It does not replace
constitutional evaluation or create automatic constitutional scoring.

## What is intentionally excluded

Learner Product v1 intentionally excludes:

- accounts or authentication;
- learner profiles;
- persistent or server-side memory;
- local or remote transcript persistence;
- a database;
- analytics or telemetry;
- personalization;
- journaling;
- progress tracking;
- notifications, streaks, rewards, or retention mechanics;
- privileged trace, strategy, review, provider, or internal metadata;
- DevTools controls in the learner interface.

These exclusions preserve the initial learner-safe, stateless boundary and
avoid creating authority, retention, or data-collection systems without a
separate constitutional and product examination.

## Known limitations

- The visible transcript lasts only for the current browser tab and is lost
  when the page is reloaded or closed.
- Previous transcript entries are not sent to the production pipeline; each
  learner request is processed independently.
- The LX smoke set contains six representative prompts and cannot establish
  quality for every learner conversation.
- Provider output can vary outside the deterministic local validation path.
- Steward may be mistaken and remains neither a therapist, emergency service,
  nor final authority.
- Learners facing immediate danger still need appropriate human or emergency
  support.
- Learner Product v1 is a local product checkpoint, not a production
  deployment or operational reliability certification.

## Next recommended phase: Lifeschool Curriculum v1

The next recommended phase is Lifeschool Curriculum v1: a carefully governed
foundation of learning material that gives learners substantive opportunities
to examine important questions and develop practical thinking skills.

Curriculum work should:

- derive from CA-001 and the Foundation Documents;
- preserve learner dignity, freedom, responsibility, and authorship;
- teach examination rather than obedience;
- distinguish educational material from final answers or imposed worldview;
- define its own evaluation and release criteria;
- remain separate from accounts, tracking, personalization, and learner
  surveillance.

The curriculum should strengthen what Steward helps learners do without
turning Steward into an authority over what learners must believe or become.
---

## Foundation Principle Reference

See CA-001 (FP-001) for canonical wording and interpretation.







