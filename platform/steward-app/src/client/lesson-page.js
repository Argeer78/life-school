import { createCourseSession } from "./course-session.js";
import { buildLessonPracticeMessage } from "./lesson-model.js";
import { renderLessonPage } from "./lesson-renderer.js";
import { createMemoryTranscript } from "./learn-transcript.js";
import { projectLearnerResponse } from "./learner-response.js";
import { findCurriculumLesson } from "./curriculum-lessons.js";
import { browserPreference, initializeI18n } from "./i18n.js";
import { createShareLinks } from "./share-actions.js";
import {
  createCertificateId,
  downloadCertificatePdf,
  formatCompletionDate,
  printCertificate,
  shareCertificate,
} from "./module-certificate.js";

/** @typedef {import("./lesson-model.js").LessonDefinition} LessonDefinition */
/** @typedef {import("./lesson-model.js").LessonExerciseField} LessonExerciseField */

/** @type {"en" | "el"} */
const initialLocale = browserPreference() === "el" ? "el" : "en";
const lesson = findCurriculumLesson(
  window.location.pathname,
  initialLocale,
);
const lessonRoot = document.querySelector("#lesson-root");

if (lesson === undefined || !(lessonRoot instanceof HTMLElement)) {
  throw new Error("Lesson data is unavailable.");
}
const currentLesson = lesson;

lessonRoot.replaceChildren();
lessonRoot.insertAdjacentHTML("afterbegin", renderLessonPage(lesson));
const i18n = await initializeI18n();
document.title = `${lesson.moduleTitle} — ${i18n.translate("lesson.number", {
  number: lesson.lessonNumber,
})}`;

/** @type {{ definition: LessonExerciseField, element: HTMLTextAreaElement }[]} */
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
const lessonShare = document.querySelector(".lesson-share");
const certificateShell = document.querySelector("#module-certificate");
const certificateNameInput = document.querySelector("#certificate-learner-name");
const certificateDateValue = document.querySelector("#certificate-date-value");
const certificateIdValue = document.querySelector("#certificate-id-value");
const certificateStatus = document.querySelector("#certificate-status");
const certificateDownload = document.querySelector("#certificate-download");
const certificatePrint = document.querySelector("#certificate-print");
const certificateShareButton = document.querySelector("#certificate-share");
const certificateHelpful = document.querySelector("#certificate-helpful");

const courseSession = createCourseSession();
const transcript = createMemoryTranscript();
let practiceInFlight = false;
/** @type {Date | null} */
let moduleCompletedAt = null;
const lessonOpenedAt = Date.now();

/** @param {string} route */
function moduleSlugFromLessonRoute(route) {
  const match = route.match(/^\/courses\/([a-z-]+)/);
  return match?.[1] ?? "module";
}

function moduleCertificateData() {
  if (moduleCompletedAt === null) return null;
  const learnerName =
    certificateNameInput instanceof HTMLInputElement
      ? certificateNameInput.value.trim()
      : "";
  return {
    learnerName,
    moduleTitle: currentLesson.moduleTitle,
    moduleSlug: moduleSlugFromLessonRoute(currentLesson.route),
    completionDate: moduleCompletedAt,
    certificateId: createCertificateId(
      moduleSlugFromLessonRoute(currentLesson.route),
      moduleCompletedAt,
      learnerName,
    ),
  };
}

/** @param {string} key */
function setCertificateStatus(key) {
  if (!(certificateStatus instanceof HTMLElement)) return;
  certificateStatus.dataset.i18n = key;
  certificateStatus.textContent = i18n.translate(key);
}

function updateCertificatePreview() {
  if (!(certificateShell instanceof HTMLElement)) return;
  const certificate = moduleCertificateData();
  const enabled = certificate !== null;

  if (certificateDateValue instanceof HTMLElement) {
    certificateDateValue.textContent =
      certificate === null ? "-" : formatCompletionDate(certificate.completionDate);
  }
  if (certificateIdValue instanceof HTMLElement) {
    certificateIdValue.textContent =
      certificate === null ? "-" : certificate.certificateId;
  }
  if (certificateDownload instanceof HTMLButtonElement) {
    certificateDownload.disabled = !enabled;
  }
  if (certificatePrint instanceof HTMLButtonElement) {
    certificatePrint.disabled = !enabled;
  }
  if (certificateShareButton instanceof HTMLButtonElement) {
    certificateShareButton.disabled = !enabled;
  }
}

function revealCertificatePanel() {
  if (!(certificateShell instanceof HTMLElement)) return;
  if (moduleCompletedAt === null) {
    moduleCompletedAt = new Date();
  }
  certificateShell.classList.remove("hidden");
  updateCertificatePreview();
}

/** @param {string} eventName @param {Record<string, unknown>} detail */
function emitModuleEvent(eventName, detail) {
  window.dispatchEvent(new CustomEvent(eventName, { detail }));
}

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
    if (entry.role === "steward") {
      const takeaway = document.createElement("p");
      takeaway.className = "practice-takeaway";
      const normalized = entry.text.replace(/\s+/g, " ").trim();
      const summary =
        normalized.match(/^(.+?[.!?])(?:\s|$)/u)?.[1] ?? normalized;
      takeaway.textContent = `${i18n.translate("lesson.takeawayPrefix")}: ${summary.slice(0, 160)}`;
      const takeawayActions = document.createElement("div");
      takeawayActions.className = "takeaway-actions";

      const copyQuote = document.createElement("button");
      copyQuote.type = "button";
      copyQuote.className = "takeaway-copy";
      copyQuote.textContent = i18n.translate("share.copyQuote");
      copyQuote.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(summary.slice(0, 160));
          setPracticeStatus("share.quoteCopied");
        } catch {
          setPracticeStatus("share.copyUnavailable");
        }
      });

      const shareQuote = document.createElement("button");
      shareQuote.type = "button";
      shareQuote.className = "takeaway-share";
      shareQuote.textContent = i18n.translate("share.shareQuote");
      shareQuote.addEventListener("click", async () => {
        const quote = summary.slice(0, 160);
        const shareUrl = `${window.location.origin}${window.location.pathname}`;
        try {
          if (typeof navigator.share === "function") {
            await navigator.share({
              title: i18n.translate("home.documentTitle"),
              text: quote,
              url: shareUrl,
            });
          } else {
            const links = createShareLinks(shareUrl, quote);
            window.open(links.x, "_blank", "noopener,noreferrer");
          }
          setPracticeStatus("share.quoteShared");
        } catch {
          setPracticeStatus("share.shareUnavailable");
        }
      });

      takeawayActions.append(copyQuote, shareQuote);
      article.append(label, text, takeaway, takeawayActions);
    } else {
      article.append(label, text);
    }
    practiceTranscriptView.append(article);
  }
}

function configureLessonSharing() {
  if (!(lessonShare instanceof HTMLElement)) return;
  const status = lessonShare.querySelector("[data-share-status]");
  const copyButton = lessonShare.querySelector("[data-share-copy]");
  const shareButton = lessonShare.querySelector("[data-share-native]");
  if (
    !(status instanceof HTMLElement) ||
    !(copyButton instanceof HTMLButtonElement) ||
    !(shareButton instanceof HTMLButtonElement)
  ) {
    return;
  }

  const scope = lessonShare.dataset.shareScope === "module" ? "module" : "lesson";
  const moduleTitle = lessonShare.dataset.moduleTitle ?? "Lifeschool";
  const lessonTitle = lessonShare.dataset.lessonTitle ?? "Lesson";
  const lessonNumber = Number(lessonShare.dataset.lessonNumber ?? "1");
  const moduleRoute = lessonShare.dataset.moduleRoute ?? window.location.pathname;
  const sharePath = scope === "module" ? moduleRoute : window.location.pathname;
  const shareUrl = `${window.location.origin}${sharePath}`;
  const shareText = scope === "module"
    ? i18n.translate("share.moduleText", { module: moduleTitle })
    : i18n.translate("share.lessonText", {
      module: moduleTitle,
      number: lessonNumber,
      lesson: lessonTitle,
    });
  const shareLinks = createShareLinks(shareUrl, shareText);

  copyButton.onclick = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      status.textContent = i18n.translate("share.linkCopied");
    } catch {
      status.textContent = i18n.translate("share.copyUnavailable");
    }
  };

  shareButton.onclick = async () => {
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({
          title: scope === "module" ? moduleTitle : `${moduleTitle} — ${lessonTitle}`,
          text: shareText,
          url: shareUrl,
        });
      } else {
        window.open(shareLinks.x, "_blank", "noopener,noreferrer");
      }
      status.textContent = i18n.translate("share.shared");
    } catch {
      status.textContent = i18n.translate("share.shareUnavailable");
    }
  };
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
  revealCertificatePanel();
  setCertificateStatus("certificate.ready");

  const moduleSlug = moduleSlugFromLessonRoute(currentLesson.route);
  const durationMs = Math.max(0, Date.now() - lessonOpenedAt);
  emitModuleEvent("lifeschool:lesson-completed", {
    moduleSlug,
    lessonNumber: currentLesson.lessonNumber,
    durationMs,
  });
  if (currentLesson.nextLesson === null) {
    emitModuleEvent("lifeschool:module-completed", {
      moduleSlug,
    });
  }
});

certificateNameInput?.addEventListener("input", () => {
  updateCertificatePreview();
});

certificateDownload?.addEventListener("click", () => {
  const certificate = moduleCertificateData();
  if (certificate === null) return;
  try {
    downloadCertificatePdf(certificate);
    setCertificateStatus("certificate.downloadReady");
  } catch {
    setCertificateStatus("certificate.unavailable");
  }
});

certificatePrint?.addEventListener("click", () => {
  const certificate = moduleCertificateData();
  if (certificate === null) return;
  try {
    printCertificate(certificate);
    setCertificateStatus("certificate.printReady");
  } catch {
    setCertificateStatus("certificate.unavailable");
  }
});

certificateShareButton?.addEventListener("click", async () => {
  const certificate = moduleCertificateData();
  if (certificate === null) return;
  try {
    await shareCertificate(certificate);
    setCertificateStatus("certificate.shareReady");
  } catch {
    setCertificateStatus("certificate.shareFallback");
  }
});

certificateHelpful?.addEventListener("click", () => {
  emitModuleEvent("lifeschool:module-helpful", {
    moduleSlug: moduleSlugFromLessonRoute(currentLesson.route),
  });
  setCertificateStatus("certificate.helpfulSaved");
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
  configureLessonSharing();
});

updateExerciseHandoff();
configureLessonSharing();
updateCertificatePreview();

const askNext = document.createElement("button");
askNext.type = "button";
askNext.className = "ask-next-lesson";
askNext.textContent = i18n.translate("lesson.askNextLesson");
askNext.addEventListener("click", () => {
  practicePromptView.value = i18n.translate("lesson.quickPromptNextLesson");
  practicePromptView.focus();
});
practiceFormView.append(askNext);
