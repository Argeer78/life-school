import { createCourseSession } from "./course-session.js";
import { buildLessonPracticeMessage } from "./lesson-model.js";
import { renderLessonPage } from "./lesson-renderer.js";
import { createMemoryTranscript } from "./learn-transcript.js";
import { projectLearnerResponse } from "./learner-response.js";
import { findThinkingClearlyLesson } from "./thinking-clearly-lessons.js";
import { browserPreference, initializeI18n } from "./i18n.js";

const initialLocale = browserPreference();
const lesson = findThinkingClearlyLesson(
  window.location.pathname,
  initialLocale,
);
const lessonRoot = document.querySelector("#lesson-root");

if (lesson === undefined || !(lessonRoot instanceof HTMLElement)) {
  throw new Error("Lesson data is unavailable.");
}

lessonRoot.replaceChildren();
lessonRoot.insertAdjacentHTML("afterbegin", renderLessonPage(lesson));
const i18n = await initializeI18n();
document.title = `${lesson.moduleTitle} — ${i18n.translate("lesson.number", {
  number: lesson.lessonNumber,
})}`;

const exerciseFields = lesson.exercise.fields.map((field) => {
  const element = document.querySelector(`[data-exercise-field="${field.id}"]`);
  if (!(element instanceof HTMLTextAreaElement)) {
    throw new Error(`Exercise field ${field.id} is unavailable.`);
  }
  return { definition: field, element };
});
const continueWithSteward = document.querySelector("#continue-with-steward");
const exerciseHandoffStatus = document.querySelector(
  "#exercise-handoff-status",
);
const practiceForm = document.querySelector("#course-practice-form");
const practicePrompt = document.querySelector("#practice-prompt");
const practiceSubmit = document.querySelector("#practice-submit");
const practiceStatus = document.querySelector("#practice-status");
const practiceTranscript = document.querySelector("#practice-transcript");
const completeLesson = document.querySelector("#complete-lesson");
const completionStatus = document.querySelector("#completion-status");
const moduleReturn = document.querySelector("#module-return");
const nextLesson = document.querySelector("#next-lesson");

if (
  !(continueWithSteward instanceof HTMLButtonElement) ||
  !(exerciseHandoffStatus instanceof HTMLElement) ||
  !(practiceForm instanceof HTMLFormElement) ||
  !(practicePrompt instanceof HTMLTextAreaElement) ||
  !(practiceSubmit instanceof HTMLButtonElement) ||
  !(practiceStatus instanceof HTMLElement) ||
  !(practiceTranscript instanceof HTMLElement) ||
  !(completeLesson instanceof HTMLButtonElement) ||
  !(completionStatus instanceof HTMLElement) ||
  !(moduleReturn instanceof HTMLAnchorElement) ||
  (nextLesson !== null && !(nextLesson instanceof HTMLAnchorElement))
) {
  throw new Error("Required curriculum interface element is missing.");
}

const continueWithStewardButton = continueWithSteward;
const exerciseHandoffStatusView = exerciseHandoffStatus;
const practiceFormView = practiceForm;
const practicePromptView = practicePrompt;
const practiceSubmitView = practiceSubmit;
const practiceStatusView = practiceStatus;
const practiceTranscriptView = practiceTranscript;
const completeLessonButton = completeLesson;
const completionStatusView = completionStatus;
const moduleReturnLink = moduleReturn;
const nextLessonLink = nextLesson;

const courseSession = createCourseSession();
const transcript = createMemoryTranscript();
let practiceInFlight = false;

function exerciseValues() {
  return Object.fromEntries(
    exerciseFields.map(({ definition, element }) => [
      definition.id,
      element.value,
    ]),
  );
}

function exerciseIsComplete() {
  return exerciseFields.every(
    ({ element }) => element.value.trim().length > 0,
  );
}

function updateExerciseHandoff() {
  const complete = exerciseIsComplete();
  continueWithStewardButton.disabled = !complete || practiceInFlight;
  exerciseHandoffStatusView.dataset.i18n = complete
    ? "lesson.exerciseReady"
    : "lesson.exerciseIncomplete";
  exerciseHandoffStatusView.textContent = complete
    ? i18n.translate("lesson.exerciseReady")
    : i18n.translate("lesson.exerciseIncomplete");
}

function renderPractice() {
  practiceTranscriptView.replaceChildren();
  const entries = transcript.entries();
  if (entries.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-practice";
    empty.textContent = i18n.translate("lesson.noPractice");
    practiceTranscriptView.append(empty);
    return;
  }

  for (const entry of entries) {
    const article = document.createElement("article");
    const label = document.createElement("span");
    const text = document.createElement("p");
    article.className = `practice-message ${entry.role}`;
    label.className = "practice-label";
    label.textContent =
      entry.role === "learner" ? i18n.translate("lesson.you") : "Steward";
    text.textContent = entry.text;
    article.append(label, text);
    practiceTranscriptView.append(article);
  }
}

/** @param {string} key */
function setPracticeStatus(key) {
  practiceStatusView.dataset.i18n = key;
  practiceStatusView.textContent = i18n.translate(key);
}

practiceFormView.addEventListener("submit", async (event) => {
  event.preventDefault();
  const message = practicePromptView.value.trim();
  if (message.length === 0) return;

  transcript.clear();
  const activeVersion = transcript.version();
  transcript.add("learner", message);
  practiceInFlight = true;
  updateExerciseHandoff();
  practiceSubmitView.disabled = true;
  setPracticeStatus("lesson.responding");
  renderPractice();

  try {
    const response = await fetch("/api/message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });
    if (!response.ok) throw new Error("Practice request failed.");
    const learnerResponse = projectLearnerResponse(await response.json());
    if (activeVersion === transcript.version()) {
      transcript.add("steward", learnerResponse.text);
      setPracticeStatus("lesson.practiceComplete");
    }
  } catch {
    if (activeVersion === transcript.version()) {
      transcript.add(
        "steward",
        i18n.translate("lesson.clientUnavailable"),
      );
      setPracticeStatus("lesson.practiceUnavailable");
    }
  } finally {
    practiceInFlight = false;
    updateExerciseHandoff();
    practiceSubmitView.disabled = false;
    renderPractice();
    practicePromptView.focus();
  }
});

for (const { element } of exerciseFields) {
  element.addEventListener("input", updateExerciseHandoff);
}

continueWithStewardButton.addEventListener("click", () => {
  practicePromptView.value = buildLessonPracticeMessage(
    lesson.practicePromptTemplate.handoff,
    exerciseValues(),
  );
  practiceFormView.requestSubmit();
  practiceFormView.scrollIntoView({ behavior: "smooth", block: "start" });
});

completeLessonButton.addEventListener("click", () => {
  courseSession.complete(lesson.id);
  completionStatusView.dataset.i18n = "lesson.completeStatus";
  completionStatusView.dataset.i18nParamNumber = String(lesson.lessonNumber);
  completionStatusView.textContent = i18n.translate("lesson.completeStatus", {
    number: lesson.lessonNumber,
  });
  completeLessonButton.disabled = courseSession.isComplete(lesson.id);
  moduleReturnLink.classList.remove("hidden");
  nextLessonLink?.classList.remove("hidden");
});

window.addEventListener("lifeschool:locale-change", (event) => {
  if (
    event instanceof CustomEvent &&
    event.detail?.locale !== initialLocale
  ) {
    window.location.reload();
    return;
  }
  updateExerciseHandoff();
  renderPractice();
});

updateExerciseHandoff();
