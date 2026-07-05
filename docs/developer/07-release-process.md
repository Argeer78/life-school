# Steward Release Process

Steward evolves through evidence rather than intuition. A change is not
complete because it appears useful, reads fluently, or passes one targeted
test.

No behavioral change is considered complete until it has passed the required
automated verification, regression evaluation, and certification process.
Release evidence must show that the change corrects the demonstrated problem
without weakening the certified constitutional baseline.

This workflow applies to Steward Foundation and to platform work that can
affect learner-visible behavior, constitutional boundaries, provider
interaction, or certification claims.

---

## Release Philosophy

- **Constitution before convenience.** Implementation and release pressure do
  not override CA-001, the Foundation documents, or human constitutional
  authority.
- **Evidence before opinion.** A demonstrated failure, reproducible trace, test,
  or evaluation result should justify behavior-affecting work.
- **Regression before release.** A local improvement is incomplete until the
  surrounding system is shown not to have degraded.
- **Certification before expansion.** A changed constitutional pipeline must
  earn certification before new scope is represented as stable.
- **Small, reviewable changes.** Prefer the smallest correction that addresses
  the underlying constitutional problem.
- **Traceability before abstraction.** Developers should be able to identify
  the constitutional source, affected stage, tests, evaluation evidence, and
  release consequence of a change.
- **Failure before repair.** Investigate and locate the failing stage before
  changing behavior.

Certification is evidence about a specific version and evaluated
configuration. It is not permission to stop examining the system.

---

## Change Categories

Different changes require different release evidence.

| Category | Description | Minimum release evidence | New certification? |
|---|---|---|---|
| Documentation | Clarifies existing behavior, architecture, operation, or limitations without changing software or authoritative constitutional meaning. | Review links, accuracy, authority order, and consistency with the current version. | No, unless the documentation changes a certification claim or accompanies another certifiable change. |
| Bug fix | Corrects implementation that does not meet an existing requirement. | Reproduction, focused regression test, typecheck, complete automated suite, and affected evaluation cases. | Yes when learner behavior, routing, review, revision, fallback, provider handling, or learner-safe delivery changes. |
| Implementation refactoring | Changes internal structure without intended behavior or contract changes. | Typecheck, complete automated suite, boundary verification, and evidence that observable behavior is unchanged. | Normally no; required if behavior or a certified architectural guarantee changes. |
| Behavioral improvement | Changes learner-visible responses or any upstream decision that can affect them. | Constitutional trace, focused regression tests, complete automated suite, all affected benchmarks, and full evaluation suite. | Yes. |
| Constitutional change | Changes an Anchor, Foundation requirement, authority, protection, or constitutional meaning. | Approved human constitutional process before implementation, updated specifications and evaluation, complete verification, and full evaluation. | Yes, under a new Foundation version. |
| New Conversation Strategy | Expands the closed constitutional reasoning registry. | Demonstrated constitutional need, approved CS specification, behavior and compatibility definitions, routing and engine tests, new benchmark coverage, and full evaluation. | Yes. |
| New Evaluation Suite | Adds behavioral evidence for a demonstrated constitutional gap. | EVAL-000 conformity, reviewed expected behavior and critical failures, reproducible cases, and execution of the expanded suite. | A draft suite alone does not recertify; adopting it into a release baseline requires a new certification result. |
| Provider addition | Adds a provider or materially changes a provider/model configuration. | Contract, validation, timeout, failure, and learner-safe tests using mocks; complete evaluation under the proposed provider and model. | Yes for each released certified provider/model configuration. |
| Performance or operational change | Changes latency, deployment, capacity, or runtime behavior without intended constitutional change. | Performance evidence plus complete automated verification; evaluate any path that can alter timeouts, fallbacks, ordering, or delivery. | Required if certified behavior or provider-boundary outcomes can change. |
| User-interface change | Changes presentation or interaction around the learner-safe API. | Interface tests, privacy and boundary checks, accessibility review, and confirmation that privileged data remains unavailable. | Required if the UI changes message meaning, behavioral pressure, persistence, or learner-visible Engine behavior. |

When classification is uncertain, treat the change as behavior-affecting until
evidence shows otherwise. Do not use a narrow label to avoid evaluation.

Constitutional changes are not ordinary development tasks. Technology may
draft, analyze, or test them, but human approval remains necessary before they
become authoritative.

---

## Standard Development Workflow

### 1. Identify the problem

State the observed failure, affected learner behavior, evidence, and governing
constitutional or technical requirement.

This prevents solutions from being driven by vague preference or provider
style.

### 2. Investigate

Trace the complete relevant path:

```text
Strategy Selection
→ Behavior Planning
→ Provider Boundary
→ Validation
→ Review
→ Revision
→ Fallback
→ Learner-safe output
```

Record the exact failing stage and distinguish implementation, routing,
provider, review, revision, fallback, and evaluation issues.

This prevents a downstream symptom from being repaired in the wrong layer.

### 3. Design the smallest constitutional change

Identify:

- the authoritative constitutional and specification source;
- the narrowest responsible component;
- behavior that must remain unchanged;
- risks to adjacent strategies and benchmarks;
- evidence that will prove the correction.

Do not broaden authority or introduce a new abstraction merely because it
makes one case easier.

### 4. Implement

Change only the responsible layer. Preserve closed registries, typed contracts,
learner-safe boundaries, provider independence, one-revision control, and
pre-approved fallback behavior.

Implementation must express existing authority rather than invent it.

### 5. Add regression tests

Add a focused test that fails before the correction and passes after it. Include
nearby negative cases when over-broad matching or behavior is a risk.

Regression coverage should prove the underlying rule, not one exact model
sentence.

### 6. Run automated tests

Run:

```powershell
npm run typecheck
npm test
```

from `platform/steward-app`.

The complete suite must pass. Targeted tests are useful during development but
do not replace the final suite.

### 7. Run evaluation

Run the directly affected benchmark cases first. If they pass, run all
Foundation evaluation sets through the complete Engine under the release
provider configuration.

Follow [EVAL-000](../evaluation/EVAL-000.md), including scoring, critical
failure, provider-boundary, and transient-retry rules. Do not repeatedly sample
until a preferred response appears.

This step establishes whether the correction generalizes without behavioral
drift.

### 8. Update documentation

Update the developer reference, specification cross-references, changelog,
known limitations, and certification record when the released behavior or
supported configuration changes.

Do not silently rewrite previous benchmark or certification history.

### 9. Release

Create a versioned release only after required evidence is complete. Record:

- version and date;
- scope and change category;
- provider and model configuration;
- automated verification result;
- evaluation result;
- certification reference, when required;
- known limitations and excluded scope.

Release status must match the evidence. A partial evaluation cannot be
described as certified.

---

## Behavioral Changes

Behavior should never change without:

- constitutional and specification traceability;
- focused regression coverage;
- automated verification;
- affected benchmark evaluation;
- a complete regression evaluation;
- documentation updates when behavior, operation, limitations, or
  certification scope changes.

Behavior includes more than final wording. A change is behavioral when it can
alter:

- Strategy Selection or combinations;
- Behavior Planning;
- provider instructions or refusal semantics;
- output validation;
- constitutional review outcomes;
- revision eligibility or preservation;
- fallback selection or text;
- learner-safe API output;
- UI pressure, framing, persistence, or disclosure.

Behavioral improvements must preserve the certified constitutional baseline
unless an explicit constitutional revision has been approved through human
authority. A developer must not weaken one constitutional protection to
improve another benchmark.

Prompt-specific correction may be appropriate when a demonstrated provider
rendering issue is genuinely narrow. It still requires evaluation of the full
suite and must not become hidden constitutional authority.

---

## Foundation Certification

[EVAL-001](../evaluation/EVAL-001-certification.md) records the Steward
Foundation v1.0 baseline:

- 12/12 evaluation suites passed;
- 72/72 benchmark conversations passed;
- 390 automated tests passed at the freeze checkpoint;
- certification outcome: PASS.

Certification covers the complete evaluated constitutional pipeline, including
Strategy Selection, Behavior Planning, Provider Boundary, validation, review,
revision, fallback, and learner-safe delivery.

The baseline is not a permanent guarantee. It is evidence that one version,
provider/model configuration, and benchmark suite passed at one certified
checkpoint.

Future versions must earn new certification when behavior, constitutional
architecture, provider configuration, or the adopted benchmark baseline
changes. Historical certification remains a record of the earlier version and
must not be silently reassigned to later code.

---

## Versioning

Steward should use semantic versioning for released Foundation and platform
baselines:

```text
MAJOR.MINOR.PATCH
```

### Patch release: `v1.0.1`

Use a patch version for backward-compatible corrections that do not change
constitutional meaning or expand the public behavior contract. Examples
include documentation corrections, internal defects, and narrowly compatible
implementation fixes.

A patch still requires full certification when it changes certified observed
behavior or provider outcomes.

### Minor release: `v1.1.0`

Use a minor version for backward-compatible capability additions or meaningful
behavior improvements that preserve the existing Constitution. Examples
include an additional certified provider, a new evaluation suite, or a new
platform capability that preserves existing contracts.

Behavior-affecting minor releases require new certification.

### Major release: `v2.0.0`

Use a major version for an approved constitutional revision, incompatible
architectural responsibility change, changed public contract, or other
deliberate break from the Foundation v1 baseline.

A major version requires human constitutional approval where applicable, new
specifications, complete verification, expanded evaluation, and a new
certification record.

Version size does not determine whether evaluation is necessary. Behavioral
impact does.

---

## Future Releases

Future releases may include:

- new language-model providers;
- additional benchmark suites;
- performance and reliability improvements;
- longer conversation support;
- accessibility and multilingual work;
- Steward Platform capabilities;
- operational deployment and observability;
- new interfaces built on the learner-safe API.

All future work should preserve constitutional behavior unless the Constitution
is deliberately revised through the approved human process.

New providers must satisfy the same Provider Boundary. New platform
capabilities must not expose privileged data or create hidden authority.
Performance work must not trade review, validation, or learner safety for
latency. New evaluations must measure constitutional needs rather than reward a
particular provider.

Expansion follows certification; it does not inherit certification
automatically.

---

## Steward Development Principles

- Protect the learner.
- Protect the Constitution.
- Protect human authority.
- Protect the evaluation suite.
- Protect the learner-safe boundary.
- Protect reproducibility.
- Protect historical certification records.
- Protect developer understanding.
- Prefer a small correction over broad complexity.
- Investigate before implementing.
- Review before delivery.
- Regression before release.

No lies. No shortcuts. Think for yourself.
