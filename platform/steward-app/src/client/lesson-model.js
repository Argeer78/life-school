/**
 * @typedef {{
 *   id: string,
 *   label: string,
 *   placeholder: string,
 *   rows: number,
 *   maxLength: number
 * }} LessonExerciseField
 *
 * @typedef {{
 *   href: string,
 *   label: string
 * }} NextLesson
 *
 * @typedef {{
 *   id: string,
 *   route: string,
 *   moduleTitle: string,
 *   lessonNumber: number,
 *   totalLessons: number,
 *   title: string,
 *   estimatedDuration: string,
 *   introduction: string,
 *   whyThisMatters: { paragraphs: readonly string[] },
 *   concept: {
 *     paragraphs: readonly string[],
 *     highlights?: readonly string[]
 *   },
 *   example: {
 *     quote: string,
 *     distinctions: readonly { term: string, description: string }[],
 *     paragraphs: readonly string[]
 *   },
 *   exercise: {
 *     instructions: readonly string[],
 *     options?: readonly string[],
 *     fields: readonly LessonExerciseField[]
 *   },
 *   reflection: {
 *     prompt: string,
 *     placeholder: string
 *   },
 *   practicePromptTemplate: {
 *     instructions: string,
 *     defaultPrompt: string,
 *     handoff: string
 *   },
 *   completionCriteria: string,
 *   nextLesson: NextLesson | null
 * }} LessonDefinition
 */

const requiredLessonKeys = [
  "id",
  "route",
  "moduleTitle",
  "lessonNumber",
  "totalLessons",
  "title",
  "estimatedDuration",
  "introduction",
  "whyThisMatters",
  "concept",
  "example",
  "exercise",
  "reflection",
  "practicePromptTemplate",
  "completionCriteria",
  "nextLesson",
];

/**
 * Validates local curriculum data without adding lesson behavior.
 *
 * @param {LessonDefinition} lesson
 * @returns {Readonly<LessonDefinition>}
 */
export function defineLesson(lesson) {
  for (const key of requiredLessonKeys) {
    if (!(key in lesson)) {
      throw new TypeError(`Lesson definition is missing ${key}.`);
    }
  }

  if (
    lesson.exercise.fields.length === 0 ||
    lesson.practicePromptTemplate.defaultPrompt.trim().length === 0 ||
    lesson.practicePromptTemplate.handoff.trim().length === 0
  ) {
    throw new TypeError("Lesson practice data must be complete.");
  }

  return Object.freeze(lesson);
}

/**
 * Interpolates learner-authored exercise values into a local prompt template.
 *
 * @param {string} template
 * @param {Readonly<Record<string, string>>} values
 * @returns {string}
 */
export function buildLessonPracticeMessage(template, values) {
  return template.replace(/\{\{([a-zA-Z0-9-]+)\}\}/g, (_, fieldId) => {
    const value = values[fieldId]?.trim();
    if (value === undefined || value.length === 0) {
      throw new TypeError(`Exercise field ${fieldId} is required.`);
    }
    return value;
  });
}
