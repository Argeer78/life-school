/**
 * @param {string} value
 */
function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/**
 * @param {number} number
 * @param {string} title
 * @param {string} translationKey
 * @param {string} content
 */
function renderSection(number, title, translationKey, content) {
  const slug = title.toLowerCase().replaceAll(" ", "-");
  return `<section aria-labelledby="${slug}-title">
    <p class="section-number">${number}</p>
    <h2 id="${slug}-title" data-i18n="${translationKey}">${escapeHtml(title)}</h2>
    ${content}
  </section>`;
}

/**
 * @param {readonly string[]} paragraphs
 */
function renderParagraphs(paragraphs) {
  return paragraphs
    .map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
    .join("");
}

/**
 * @param {readonly string[]} paragraphs
 * @param {readonly string[] | undefined} highlights
 */
function renderConceptParagraphs(paragraphs, highlights) {
  return paragraphs
    .map((paragraph) => {
      let rendered = escapeHtml(paragraph);
      for (const highlight of highlights ?? []) {
        const escapedHighlight = escapeHtml(highlight);
        rendered = rendered.replace(
          escapedHighlight,
          `<strong>${escapedHighlight}</strong>`,
        );
      }
      return `<p>${rendered}</p>`;
    })
    .join("");
}

/** @param {import("./lesson-model.js").LessonDefinition} lesson */
export function renderWhyThisMatters(lesson) {
  return renderSection(
    1,
    "Why this matters",
    "lesson.whyThisMatters",
    renderParagraphs(lesson.whyThisMatters.paragraphs),
  );
}

/** @param {import("./lesson-model.js").LessonDefinition} lesson */
export function renderConcept(lesson) {
  return renderSection(
    2,
    "Concept",
    "lesson.concept",
    renderConceptParagraphs(
      lesson.concept.paragraphs,
      lesson.concept.highlights,
    ),
  );
}

/** @param {import("./lesson-model.js").LessonDefinition} lesson */
export function renderExample(lesson) {
  const distinctions = lesson.example.distinctions
    .map(
      ({ term, description }) => `<div>
        <dt>${escapeHtml(term)}</dt>
        <dd>${escapeHtml(description)}</dd>
      </div>`,
    )
    .join("");
  return renderSection(
    3,
    "Example",
    "lesson.example",
    `<blockquote>${escapeHtml(lesson.example.quote)}</blockquote>
    <dl class="distinction">${distinctions}</dl>
    ${renderParagraphs(lesson.example.paragraphs)}`,
  );
}

/** @param {import("./lesson-model.js").LessonDefinition} lesson */
export function renderExercise(lesson) {
  const options =
    lesson.exercise.options === undefined
      ? ""
      : `<ol class="exercise-options">${lesson.exercise.options
          .map((option) => `<li>${escapeHtml(option)}</li>`)
          .join("")}</ol>`;
  const fields = lesson.exercise.fields
    .map(
      (field) => `<label for="${escapeHtml(field.id)}">${escapeHtml(field.label)}</label>
      <textarea
        id="${escapeHtml(field.id)}"
        data-exercise-field="${escapeHtml(field.id)}"
        rows="${field.rows}"
        maxlength="${field.maxLength}"
        placeholder="${escapeHtml(field.placeholder)}"
      ></textarea>`,
    )
    .join("");

  return renderSection(
    4,
    "Exercise",
    "lesson.exercise",
    `${renderParagraphs(lesson.exercise.instructions)}
    ${options}
    ${fields}
    <div class="exercise-handoff">
      <p
        id="exercise-handoff-status"
        role="status"
        aria-live="polite"
        data-i18n="lesson.exerciseIncomplete"
      >
        Complete both fields to continue with your own example.
      </p>
      <button
        id="continue-with-steward"
        type="button"
        data-i18n="lesson.continueWithSteward"
        disabled
      >
        Continue with Steward
      </button>
    </div>
    <p class="field-note" data-i18n="lesson.fieldNote">
      Your writing stays only on this page and is not saved.
    </p>`,
  );
}

/** @param {import("./lesson-model.js").LessonDefinition} lesson */
export function renderReflection(lesson) {
  return renderSection(
    5,
    "Reflection",
    "lesson.reflection",
    `<label for="reflection">${escapeHtml(lesson.reflection.prompt)}</label>
    <textarea
      id="reflection"
      rows="3"
      placeholder="${escapeHtml(lesson.reflection.placeholder)}"
    ></textarea>`,
  );
}

/** @param {import("./lesson-model.js").LessonDefinition} lesson */
export function renderPracticeWithSteward(lesson) {
  return renderSection(
    6,
    "Practice with Steward",
    "lesson.practiceWithSteward",
    `<p>${escapeHtml(lesson.practicePromptTemplate.instructions)}</p>
    <form id="course-practice-form" class="practice-form">
      <label for="practice-prompt" data-i18n="lesson.practicePrompt">
        Practice prompt
      </label>
      <textarea id="practice-prompt" rows="4" maxlength="4000" required>${escapeHtml(
        lesson.practicePromptTemplate.defaultPrompt,
      )}</textarea>
      <div class="practice-action">
        <p
          id="practice-status"
          role="status"
          aria-live="polite"
          data-i18n="lesson.practiceMemory"
        >
          Practice conversation remains in browser memory only.
        </p>
        <button
          id="practice-submit"
          type="submit"
          data-i18n="lesson.practiceButton"
        >Practice with Steward</button>
      </div>
    </form>
    <div id="practice-transcript" class="practice-transcript" aria-live="polite">
      <p class="empty-practice" data-i18n="lesson.noPractice">
        No practice response yet.
      </p>
    </div>`,
  );
}

/** @param {import("./lesson-model.js").LessonDefinition} lesson */
export function renderContinue(lesson) {
  const nextLesson =
    lesson.nextLesson === null
      ? ""
      : `<a
          id="next-lesson"
          class="primary-link next-lesson hidden"
          href="${escapeHtml(lesson.nextLesson.href)}"
          data-i18n="lesson.nextLesson"
          data-i18n-param-number="${lesson.lessonNumber + 1}"
        >${escapeHtml(lesson.nextLesson.label)}</a>`;
  return renderSection(
    7,
    "Continue",
    "lesson.continue",
    `<p>${escapeHtml(
      lesson.completionCriteria,
    )} <span data-i18n="lesson.completionRecords">Completion records practice for this page session only.</span></p>
    <div class="continue-action">
      <button
        id="complete-lesson"
        type="button"
        data-i18n="lesson.completeLesson"
        data-i18n-param-number="${lesson.lessonNumber}"
      >
        Complete Lesson ${lesson.lessonNumber}
      </button>
      <p
        id="completion-status"
        role="status"
        aria-live="polite"
        data-i18n="lesson.notComplete"
      >
        Not marked complete in this session.
      </p>
    </div>
    <a
      id="module-return"
      class="quiet-link hidden"
      href="/courses"
      data-i18n="lesson.returnModule"
    >
      Return to module overview
    </a>
    ${nextLesson}`,
  );
}

/** @param {import("./lesson-model.js").LessonDefinition} lesson */
export function renderLessonPage(lesson) {
  const moduleRoot = lesson.route.replace(/\/lesson-\d+$/, "");
  const moduleRootRoute = lesson.lessonNumber === 1 ? lesson.route : moduleRoot;
  const shareContext = lesson.lessonNumber === 1 ? "module" : "lesson";
  const shareLabelKey = shareContext === "module"
    ? "share.moduleAction"
    : "share.lessonAction";
  const breadcrumb =
    lesson.lessonNumber === 1
      ? `<a href="/courses" data-i18n="lesson.learningHome">Learning Home</a>
        <span aria-hidden="true">/</span>
        <span>${escapeHtml(lesson.moduleTitle)}</span>`
      : `<a href="/courses" data-i18n="lesson.learningHome">Learning Home</a>
        <span aria-hidden="true">/</span>
        <a href="${escapeHtml(moduleRoot)}">${escapeHtml(lesson.moduleTitle)}</a>
        <span aria-hidden="true">/</span>
        <span
          data-i18n="lesson.number"
          data-i18n-param-number="${lesson.lessonNumber}"
        >Lesson ${lesson.lessonNumber}</span>`;

  return `<main class="learning-shell lesson-shell">
    <div class="home-topbar">
      <a class="home-brand" href="/" aria-label="Lifeschool home">
        <img src="/lifeschool-logo.svg" alt="" width="36" height="36" />
        <span>Lifeschool</span>
      </a>
      <nav class="learner-nav" aria-label="Main navigation">
        <a href="/" data-i18n="common.navHome">Home</a>
        <a href="/courses" aria-current="page" data-i18n="common.navCourses">Courses</a>
        <a href="/learn" data-i18n="common.navSteward">Steward</a>
        <a href="/support" data-i18n="common.navSupport">Support</a>
      </nav>
      <div class="home-controls">
        <button
          class="theme-button home-theme-toggle"
          type="button"
          data-theme-toggle
          aria-pressed="false"
          aria-label="Dark mode"
        >
          Dark mode
        </button>
        <div
          class="language-switcher home-language-switcher"
          role="group"
          aria-label="Language"
          data-i18n-aria-label="common.language"
        >
          <button
            class="locale-button"
            type="button"
            data-locale="en"
            data-i18n="home.languageEnglish"
          >🌐 English</button>
          <button
            class="locale-button"
            type="button"
            data-locale="el"
            data-i18n="home.languageGreek"
          >🌐 Ελληνικά</button>
        </div>
      </div>
    </div>
    <nav
      class="breadcrumb"
      aria-label="Curriculum"
      data-i18n-aria-label="lesson.curriculum"
    >${breadcrumb}</nav>
    <header class="lesson-header">
      <p class="eyebrow">
        ${escapeHtml(lesson.moduleTitle)} ·
        <span
          data-i18n="lesson.numberOf"
          data-i18n-param-number="${lesson.lessonNumber}"
          data-i18n-param-total="${lesson.totalLessons}"
        >Lesson ${lesson.lessonNumber} of ${lesson.totalLessons}</span>
      </p>
      <h1>${escapeHtml(lesson.title)}</h1>
      <p class="intro">${escapeHtml(lesson.introduction)}</p>
      <div
        class="lesson-share"
        data-share-scope="${shareContext}"
        data-module-title="${escapeHtml(lesson.moduleTitle)}"
        data-lesson-title="${escapeHtml(lesson.title)}"
        data-lesson-number="${lesson.lessonNumber}"
        data-module-route="${escapeHtml(moduleRootRoute)}"
      >
        <p class="lesson-share-label" data-i18n="${shareLabelKey}">${shareContext === "module" ? "Share this module" : "Share lesson"}</p>
        <div class="lesson-share-actions">
          <button type="button" data-share-copy data-i18n="share.copyLink">Copy Link</button>
          <button type="button" data-share-native data-i18n="share.shareNow">Share</button>
          <p class="lesson-share-status" data-share-status role="status" aria-live="polite"></p>
        </div>
      </div>
    </header>
    <article class="lesson-content">
      ${renderWhyThisMatters(lesson)}
      ${renderConcept(lesson)}
      ${renderExample(lesson)}
      ${renderExercise(lesson)}
      ${renderReflection(lesson)}
      ${renderPracticeWithSteward(lesson)}
      ${renderContinue(lesson)}
    </article>
    <footer class="lesson-footer">
      <p data-i18n="common.slogan">No lies. No shortcuts. Think for yourself.</p>
    </footer>
  </main>`;
}
