# Provider Boundary

The Provider Boundary is the architectural interface between Steward's
constitutional engine and an external language-generation system.

Steward treats a language model as a provider of candidate language, not as a
constitutional authority. The provider does not choose Conversation
Strategies, define behavior, approve output, control revision, or decide what
the learner receives.

Constitutional authority always remains inside Steward. Provider output is
untrusted until it satisfies the Provider Boundary contract and passes
constitutional review.

---

## Why the Provider Boundary Exists

Directly coupling the Engine to a model would allow provider behavior, API
conventions, refusal policy, and output variability to influence
constitutional behavior implicitly. PB prevents that coupling.

The boundary supports:

- **Provider independence:** The Engine depends on a provider-neutral contract,
  not one vendor's API.
- **Constitutional consistency:** Strategy and behavior are resolved before the
  provider is called.
- **Deterministic validation:** Technical acceptance is governed by explicit
  rules rather than provider confidence or prose quality.
- **Testability:** Provider input, output, validation, and failure handling can
  be tested with deterministic adapters and mocked responses.
- **Future provider replacement:** A new provider can be evaluated behind the
  same contract without redesigning EN-001 through EN-005.
- **Security of the constitutional core:** Providers do not receive privileged
  inspection, review, revision, fallback, internal prompt, account, or
  persistent learner data.

The boundary does not make model output deterministic or infallible. It makes
the provider's authority and failure surface explicit.

---

## Provider Contract

The provider receives a typed Generation Request. Conceptually, it contains:

- the current learner message;
- permitted current-session conversation context;
- the selected primary and secondary Conversation Strategies;
- the explicit Behavior Plan;
- closed constitutional constraints;
- the provider contract version;
- the required output schema version.

### Learner message

The learner message identifies the current request. It is not supplemented by
an account profile, persistent memory, analytics, or inferred personalization.

### Conversation context

Only the current conversation explicitly supplied to the Engine may be
included. The contract does not authorize hidden historical context.

### Strategy Selection

The provider receives the Strategy Selection already produced by EN-001. It
must express that selection and may not replace, reorder, or extend it.

### Behavior Plan

The provider receives the closed behavior components already derived by
EN-002. The plan defines the required response behavior without supplying a
fixed response template.

### Constitutional constraints

The request includes approved constitutional references, protections, and
limits. These make the boundaries of generation explicit and traceable.

### Output schema

Contract and schema versions tell the provider which structured result Steward
expects. Versioning prevents a silent mismatch from being treated as valid
output.

These inputs are explicit because hidden assumptions are difficult to test and
easy to weaken. A provider should not have to infer whether it may make a
decision for the learner, assign an identity, fabricate certainty, or expose
internal reasoning. Strategy, behavior, and boundaries are resolved before
generation.

The Generation Request is the complete provider input. Review findings,
rejected candidates, revision records, fallback decisions, raw errors, and
privileged inspection data are outside the contract.

---

## Expected Provider Output

The provider returns a structured Provider Result rather than unrestricted
chat output. The result includes:

- the candidate learner-facing response;
- provider confidence;
- an uncertainty indicator;
- refusal semantics;
- bounded provider notes;
- the output schema version.

The learner-facing response is still only a candidate. Confidence and
uncertainty are provider declarations, not constitutional findings. Notes are
structured metadata for the privileged boundary and must not contain hidden
reasoning or appear in learner output.

`refusal` distinguishes a total provider refusal from a constitutional boundary
expressed inside a useful response. A provider that refuses only the learner's
requested manipulation, transfer of authority, deception, or other prohibited
act should continue with an ethical learner-facing response and should not mark
the entire generation as refused. Total refusal is reserved for cases where no
learner-facing result can be provided.

Structured output makes presence, type, size, version, and prohibited content
independently verifiable. It does not allow the provider to certify its own
constitutional compliance.

---

## Provider Validation

Provider Validation runs after generation and before EN-003 Constitutional
Review.

### Schema validation

The result must be a serializable object that conforms to the supported
provider output schema. Malformed JSON, missing output, or a non-object result
is rejected.

### Field validation

Required fields must be present with the expected types and ranges. Unexpected
fields, missing fields, invalid confidence values, empty candidate text,
oversized content, and invalid encoding are rejected.

### Version validation

The provider's schema version must match both the version requested by the
Engine and the version supported by the current boundary. An unsupported or
stale result cannot enter review.

### Prohibited content detection

Validation rejects prohibited fields or content associated with internal
prompts, privileged audit data, review records, revision records, inspection
data, or other information outside the provider contract.

### Reasoning protection

Chain-of-thought and internal reasoning are not part of the Provider Result.
The boundary rejects reasoning fields and protected internal content rather
than forwarding them to review or the learner.

### Failure classification

Provider exceptions and invalid results are converted into stable failure
categories. Raw SDK exceptions, provider payloads, credentials, and internal
diagnostics remain privileged.

Validation happens before constitutional review because EN-003 evaluates the
meaning of a valid candidate. It should not be responsible for guessing the
shape, encoding, version, or trustworthiness of malformed provider output.
Separating technical validation from constitutional review makes both stages
smaller and independently testable.

---

## Failure Categories

Provider failures are categorized rather than guessed from arbitrary error
text.

Relevant classes include:

- malformed or missing provider responses;
- schema field or type violations;
- invalid or unsupported schema versions;
- prohibited internal content;
- oversized or incorrectly encoded output;
- total provider refusal;
- timeouts and connection failures;
- authentication, permission, rate, or provider API failures;
- unsupported local provider configuration;
- unknown provider failures.

Stable categories allow the Engine to select EN-005 behavior without exposing
provider-specific details. They also make tests and audits independent of
vendor wording.

A provider failure is not automatically a constitutional failure. It means the
candidate could not safely cross PB. The learner receives an appropriate
pre-approved fallback rather than raw errors or partially validated output.

---

## Provider Independence

Steward should be able to replace one language model provider with another
without changing constitutional behavior.

Provider independence requires:

- EN-001 and EN-002 to remain provider-independent;
- one provider-neutral Generation Request;
- one provider-neutral Provider Result;
- the same validation requirements;
- the same stable failure classification;
- EN-003 review of every valid candidate;
- the same learner-safe boundary and fallback guarantees;
- complete regression and evaluation for the new provider configuration.

Different providers may vary in fluency, latency, cost, uncertainty, refusal
behavior, and reliability. None of those differences authorizes a provider to
select strategies or weaken constitutional constraints.

Providers generate language. Steward governs behavior.

---

## Extension

An additional provider belongs behind the existing provider-neutral interface.
A provider adapter is responsible for:

1. reading credentials and provider configuration from approved runtime
   configuration;
2. translating the Generation Request into the provider's API format without
   adding constitutional behavior;
3. requesting the supported structured output;
4. mapping the provider response into the Provider Result contract;
5. enforcing timeout behavior;
6. converting provider-specific errors into stable failure categories;
7. sending the mapped result through the existing PB validation path.

The adapter must not receive privileged Engine data or bypass validation and
EN-003 review. Tests must use mocked provider responses and must not require
real network calls.

Before acceptance, every provider must satisfy the same Provider Boundary
contract and pass:

- contract and validation tests;
- failure-mapping tests;
- learner-safe boundary tests;
- the automated regression suite;
- the complete evaluation suite under the proposed provider and model version.

Provider support is a technical extension, not a constitutional amendment.

---

## Design Principles

- The provider is not the constitutional authority.
- Constitutional behavior is selected before generation.
- The Generation Request is the complete provider input.
- Validation precedes review.
- Structured contracts over free-form interaction.
- Provider declarations do not replace independent review.
- Chain-of-thought is neither requested nor exposed.
- Failures should be classified, not guessed.
- Raw provider errors remain privileged.
- Behavior is governed outside the model.
- Every provider uses the same learner-safe boundary.
- Provider replacement requires regression and evaluation.

---

## Foundation Certification

The Provider Boundary was validated as part of the complete Steward Foundation
v1.0 constitutional pipeline recorded in
[EVAL-001](../evaluation/EVAL-001-certification.md).

Certification covered provider hand-off, structured output, validation,
failure handling, constitutional review, revision, fallback, and learner-safe
delivery under the evaluated OpenAI `gpt-5.4-mini` configuration. The certified
run passed all 12 evaluation sets and all 72 benchmark conversations.

Certification applies only to the evaluated boundary, adapter, provider,
model, and pipeline version. A provider or model change requires a new complete
evaluation result.

No lies. No shortcuts. Think for yourself.
