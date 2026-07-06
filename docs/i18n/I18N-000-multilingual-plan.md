# I18N-000 — Lifeschool Multilingual Plan

Version: 1.0

Status: Multilingual Foundation

Supported foundation locales:

- English (`en`)
- Greek (`el`)

---

## Purpose

This plan defines how Lifeschool can support multiple languages without
changing its constitutional meaning or allowing translation work to become a
new source of authority.

Multilingual support exists to make Lifeschool understandable and usable
across languages. It must preserve learner dignity, freedom, responsibility,
and access to truthful examination.

**Language changes. Constitution does not.**

## Stage 1 — UI translation

Stage 1 translates static learner-facing interface text:

- navigation;
- buttons;
- language controls;
- limitation statements;
- privacy and session-only notices;
- empty states and status labels;
- lesson section labels;
- the Lifeschool slogan.

The initial supported languages are English and Greek. The selected locale is
stored only as a browser preference. It is not attached to an account, learner
profile, provider request, constitutional trace, or analytics event.

Stage 1 does not translate:

- Steward responses;
- curriculum concepts, examples, exercises, or reflection prompts;
- constitutional documents;
- Conversation Strategies or Engine Specifications;
- evaluation benchmarks or certification records.

## Stage 2 — Curriculum translation

Stage 2 may introduce reviewed translations of curriculum modules and lessons.

Each curriculum translation should:

- preserve the meaning and learning purpose of the authoritative curriculum;
- distinguish translation from constitutional amendment;
- receive human review by fluent speakers;
- preserve examples, exercises, boundaries, and learner authorship;
- avoid adding cultural assumptions, ideology, authority, or advice absent
  from the source;
- maintain traceability to the authoritative curriculum version.

Translated curriculum should be versioned and reviewed as curriculum, not
generated at runtime without examination.

## Stage 3 — Response-language behavior

Status: Implemented as provider guidance only.

Steward performs lightweight detection of English and Greek from the learner's
message. The detected language is expressed only as language-generation
guidance to the provider:

- Greek learner messages request a Greek learner-facing response;
- English learner messages request an English learner-facing response;
- unknown messages fall back safely to the supplied UI language when one is
  available, or to English;
- provider schema field names and values remain unchanged.

Response-language guidance does not change constitutional routing, Conversation
Strategy meaning, Behavior Plan meaning, provider contracts, or learner-safe
API semantics. Steward voice and constitutional constraints remain the same in
both languages.

Stage 3 implementation does not constitute multilingual certification.
English and Greek response behavior still require the language-specific
evaluation and human review defined by Stage 4.

## Stage 4 — Multilingual evaluation and certification

Stage 4 establishes language-specific evaluation and certification.

It should include:

- translated or language-native evaluation suites;
- fluent human reviewers;
- constitutional fidelity checks across languages;
- routing and provider-boundary regression testing;
- safety, uncertainty, authority, and manipulation cases;
- mixed-language and malformed-output tests;
- explicit certification records for each evaluated language and provider.

English Foundation certification does not automatically certify Greek or any
future language. Each language must earn evidence appropriate to its
implementation and provider behavior.

## Boundaries

Multilingual work must not:

- rewrite constitutional principles through translation;
- create separate constitutional behavior by locale;
- send locale preferences into provider requests without Stage 3 approval;
- translate privileged traces into learner output;
- introduce accounts, profiles, analytics, or learner tracking;
- treat machine translation as constitutional review;
- claim certification that has not been performed.

The locale preference is interface state only.

## Governing Rule

**Language changes. Constitution does not.**

No lies. No shortcuts. Think for yourself.
