# Greek Localization v1

Status: Release checkpoint

Foundation baseline: Foundation v1.0 Certified

Verification: 478 automated tests passing

---

## Purpose

Greek Localization v1 establishes English and Greek as the first supported
Lifeschool interface languages.

The release makes the learner interface and CUR-001 available in natural Greek
while preserving the same constitutional meaning, learner judgment, and
learner-safe conversation boundary.

**Language changes. Constitution does not.**

## Completed Work

Greek Localization v1 includes:

- English and Greek static learner-facing UI;
- a simple browser-local language switcher;
- lightweight English/Greek response-language detection;
- provider guidance requesting a response in the learner's detected language;
- complete native Greek localization of CUR-001 Thinking Clearly, including:
  - the module overview;
  - all six lesson titles and descriptions;
  - concepts and explanations;
  - examples and distinctions;
  - exercises and fields;
  - reflection prompts;
  - Steward practice instructions and handoffs;
  - completion and navigation text;
- the official
  [Greek Localization Style Guide](docs/i18n/EL-STYLE-GUIDE.md);
- the staged
  [I18N-000 Multilingual Plan](docs/i18n/I18N-000-multilingual-plan.md);
- the unscored
  [EL-EW-000 Greek Mini Evaluation](docs/evaluation/el/EL-EW-000-greek-mini-evaluation.md);
- 478 automated tests.

## Validation

Validation confirmed:

- Greek browser smoke test: **PASS**;
- the course home and all six CUR-001 lessons render in Greek;
- no English curriculum text leaks into the Greek learner experience;
- Greek terminology is consistent across the module;
- the mobile curriculum layout remains usable;
- no constitutional documents, principles, or priorities changed;
- no provider contract, strategy routing, behavior planning, review, revision,
  or fallback semantics changed;
- no learner constitutional behavior changed;
- product names remain Steward and Lifeschool;
- TypeScript typecheck passes;
- all 478 automated tests pass.

Response-language guidance changes only the language of expression. It does not
grant the provider constitutional authority or alter the meaning of the
learner-safe response.

## Known Limitations

- Only English and Greek are supported.
- CUR-001 Thinking Clearly is the only localized curriculum module.
- Greek constitutional evaluation and certification are not yet complete.
- EL-EW-000 is a mini-evaluation, not a certification suite.
- Curriculum modules beyond CUR-001 remain English.
- Provider fluency can vary and still requires Greek human review.
- The locale preference remains browser-local and is not attached to an
  account or learner profile.

## Recommended Next Phase: Private Alpha Program

The recommended next phase is a small **Private Alpha Program**.

The alpha should gather careful, consent-based feedback from English- and
Greek-speaking learners about:

- clarity and naturalness;
- lesson usability;
- response-language consistency;
- confusing or overly formal wording;
- learner-safe limitations;
- technical reliability.

The program should not introduce analytics, hidden monitoring, persistent
profiles, engagement mechanics, or claims of Greek certification. Feedback
should inform examination and regression work without optimizing Steward for
agreement, retention, or individual benchmark responses.

No lies. No shortcuts. Think for yourself.
