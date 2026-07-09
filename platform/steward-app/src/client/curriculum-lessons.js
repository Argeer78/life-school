import {
  thinkingClearlyLessons,
  findThinkingClearlyLesson,
} from "./thinking-clearly-lessons.js";
import { thinkingClearlyLessonsEl } from "./thinking-clearly-lessons-el.js";
import { additionalCurriculumLessons } from "./additional-modules-lessons.js";

/** @typedef {import("./lesson-model.js").LessonDefinition} LessonDefinition */

export const curriculumModuleSlugs = Object.freeze([
  "thinking-clearly",
  "communicating-clearly",
  "making-decisions",
  "understanding-emotions",
  "relationships",
  "purpose-meaning",
]);

export const curriculumLessons = Object.freeze({
  en: Object.freeze([
    ...thinkingClearlyLessons,
    ...additionalCurriculumLessons.en,
  ]),
  el: Object.freeze([
    ...thinkingClearlyLessonsEl,
    ...additionalCurriculumLessons.el,
  ]),
});

/**
 * @param {string} pathname
 * @param {"en" | "el"} locale
 * @returns {Readonly<LessonDefinition> | undefined}
 */
export function findCurriculumLesson(pathname, locale = "en") {
  const normalizedPath = pathname.length > 1 ? pathname.replace(/\/$/, "") : pathname;
  if (normalizedPath.startsWith("/courses/thinking-clearly")) {
    return findThinkingClearlyLesson(normalizedPath, locale);
  }
  /** @type {readonly Readonly<LessonDefinition>[]} */
  const lessons = locale === "el" ? curriculumLessons.el : curriculumLessons.en;
  return lessons.find((lesson) => lesson.route === normalizedPath);
}
