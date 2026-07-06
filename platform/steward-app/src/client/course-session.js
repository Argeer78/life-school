/**
 * Holds curriculum progress only for the lifetime of the current page.
 * It deliberately has no serialization or persistence behavior.
 *
 * @returns {{
 *   complete: (lessonId: string) => void,
 *   isComplete: (lessonId: string) => boolean,
 *   completedLessons: () => readonly string[]
 * }}
 */
export function createCourseSession() {
  /** @type {Set<string>} */
  const completed = new Set();

  return {
    /** @param {string} lessonId */
    complete(lessonId) {
      completed.add(lessonId);
    },
    /** @param {string} lessonId */
    isComplete(lessonId) {
      return completed.has(lessonId);
    },
    completedLessons() {
      return [...completed];
    },
  };
}
