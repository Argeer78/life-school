# Steward DevTools v1

Status: Developer tooling release checkpoint

Foundation baseline: Foundation v1.0 Certified

Certification reference: [EVAL-001](docs/evaluation/EVAL-001-certification.md)

Verification: 432 automated tests passing

---

## What was added

Steward DevTools v1 adds a local developer workspace around the certified
production pipeline:

- `/devtools` provides one landing page for Steward developer workflows;
- `/playground` runs one learner message through the production pipeline and
  exposes its privileged trace;
- `/benchmarks` executes individual EW evaluation suites through the canonical
  evaluation runner;
- `/certification` executes all 12 Foundation evaluation sets and collects all
  72 outputs for human review under EVAL-000;
- `/compare` compares two privileged traces by their actual JSON fields without
  inferring constitutional meaning;
- the canonical evaluation runner converts the authoritative EW Markdown
  documents into typed executable fixtures without duplicating Steward logic.

The evaluation runner keeps learner-safe results as its default output.
Strategy, review, and fallback summaries require explicit developer mode.
Evaluation executions remain unscored until a human reviewer applies EVAL-000.

## What was not added

Steward DevTools v1 does not add:

- new constitutional behavior or Conversation Strategies;
- changes to EN-001 through EN-005;
- provider behavior or provider-boundary changes;
- automatic human evaluation, automatic PASS/FAIL certification, or altered
  scoring semantics;
- new benchmark conversations or changes to the authoritative EW Markdown
  documents;
- accounts, memory, persistence, analytics, personalization, or a database;
- learner-facing features or changes to the learner UI;
- production deployment, access control, or multi-user collaboration.

## Developer-only warning

Developer-only. May expose privileged pipeline information.

The DevTools routes are inspection and evaluation surfaces. Privileged traces,
provider observations, constitutional review details, revision records, and
fallback details must not cross into learner-safe output.

## Learner behavior

This checkpoint introduces no learner behavior changes. The developer tools
invoke or observe the existing production pipeline and canonical evaluation
runner; they do not implement alternate routing, planning, generation, review,
revision, fallback, or scoring logic.

The Foundation v1.0 constitutional baseline remains the governing behavioral
release.

## Next recommended phase

The next recommended phase is one of:

- **Multi-Provider Lab** — exercise the existing provider contract across
  additional adapters and compare provider robustness without changing
  constitutional authority; or
- **Conversation Corpus** — establish a governed, privacy-conscious corpus for
  broader regression analysis without introducing learner memory or automatic
  constitutional judgment.

Either phase should preserve the Foundation v1.0 baseline, keep evaluation
independent of implementation, and require human review where constitutional
judgment is not deterministic.
