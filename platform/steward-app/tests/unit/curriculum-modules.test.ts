import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { buildLessonPracticeMessage } from "../../src/client/lesson-model.js";
import {
  curriculumLessons,
  curriculumModuleSlugs,
} from "../../src/client/curriculum-lessons.js";

type LessonExerciseField = {
  id: string;
  label: string;
  placeholder: string;
};

type LessonDefinition = {
  id: string;
  route: string;
  moduleTitle: string;
  lessonNumber: number;
  title: string;
  estimatedDuration: string;
  introduction: string;
  whyThisMatters: { paragraphs: readonly string[] };
  concept: { paragraphs: readonly string[] };
  example: {
    quote: string;
    distinctions: readonly { term: string; description: string }[];
    paragraphs: readonly string[];
  };
  exercise: {
    instructions: readonly string[];
    fields: readonly LessonExerciseField[];
  };
  reflection: {
    prompt: string;
    placeholder: string;
  };
  practicePromptTemplate: {
    instructions: string;
    defaultPrompt: string;
    handoff: string;
  };
  completionCriteria: string;
  nextLesson: { label: string } | null;
};

describe("Lifeschool curriculum modules 2-6", () => {
  it("keeps six modules with six lessons each and 36 total lessons", () => {
    const english = curriculumLessons.en as readonly LessonDefinition[];
    const greek = curriculumLessons.el as readonly LessonDefinition[];

    expect(curriculumModuleSlugs).toEqual([
      "thinking-clearly",
      "communicating-clearly",
      "making-decisions",
      "understanding-emotions",
      "relationships",
      "purpose-meaning",
    ]);
    expect(english).toHaveLength(36);
    expect(greek).toHaveLength(36);

    for (const slug of curriculumModuleSlugs) {
      const moduleLessons = english.filter((lesson) =>
        lesson.route.startsWith(`/courses/${slug}`),
      );
      expect(moduleLessons).toHaveLength(6);
      expect(moduleLessons.map((lesson) => lesson.lessonNumber)).toEqual([
        1, 2, 3, 4, 5, 6,
      ]);
    }
  });

  it("provides complete English and Greek lesson content for all 36 lessons", () => {
    const english = curriculumLessons.en as readonly LessonDefinition[];
    const greek = curriculumLessons.el as readonly LessonDefinition[];

    expect(english.map(({ id }) => id)).toEqual(
      greek.map(({ id }) => id),
    );

    for (const lesson of english) {
      expect(lesson.title.length).toBeGreaterThan(3);
      expect(lesson.estimatedDuration.length).toBeGreaterThan(3);
      expect(lesson.introduction.length).toBeGreaterThan(10);
      expect(lesson.exercise.fields.length).toBeGreaterThan(1);
      expect(lesson.practicePromptTemplate.defaultPrompt.length).toBeGreaterThan(10);
      expect(lesson.practicePromptTemplate.handoff.length).toBeGreaterThan(10);
      expect(lesson.completionCriteria.length).toBeGreaterThan(10);
    }
  });

  it("keeps Greek lesson content naturally Greek without English leakage", () => {
    const greekVisibleCopy = (curriculumLessons.el as readonly LessonDefinition[])
      .flatMap((lesson) => [
        lesson.moduleTitle,
        lesson.title,
        lesson.estimatedDuration,
        lesson.introduction,
        ...lesson.whyThisMatters.paragraphs,
        ...lesson.concept.paragraphs,
        lesson.example.quote,
        ...lesson.example.distinctions.flatMap(({ term, description }) => [
          term,
          description,
        ]),
        ...lesson.example.paragraphs,
        ...lesson.exercise.instructions,
        ...lesson.exercise.fields.flatMap(({ label, placeholder }) => [
          label,
          placeholder,
        ]),
        lesson.reflection.prompt,
        lesson.reflection.placeholder,
        lesson.practicePromptTemplate.instructions,
        lesson.practicePromptTemplate.defaultPrompt,
        lesson.practicePromptTemplate.handoff.replaceAll(
          /\{\{[a-z0-9-]+\}\}/g,
          "",
        ),
        lesson.completionCriteria,
        lesson.nextLesson?.label ?? "",
      ])
      .join(" ")
      .replaceAll(/Steward|Lifeschool/g, "");

    expect(greekVisibleCopy).toMatch(/\p{Script_Extensions=Greek}/u);
    expect(greekVisibleCopy).not.toMatch(/[A-Za-z]{3,}/);
  });

  it("ensures all handoff prompts interpolate required exercise fields", () => {
    for (const lesson of curriculumLessons.en as readonly LessonDefinition[]) {
      const sampleValues = Object.fromEntries(
        lesson.exercise.fields.map(({ id }) => [id, `sample-${id}`]),
      );
      const resolved = buildLessonPracticeMessage(
        lesson.practicePromptTemplate.handoff,
        sampleValues,
      );

      expect(resolved).toContain("sample-");
      expect(resolved).not.toContain("{{");
      expect(resolved).not.toContain("}}");
    }
  });

  it("keeps learner lesson practice on learner-safe API and no privileged trace", async () => {
    const lessonPage = await readFile(
      new URL("../../src/client/lesson-page.js", import.meta.url),
      "utf8",
    );

    expect(lessonPage).toContain('fetch("/api/message"');
    expect(lessonPage).toContain("projectLearnerResponse");
    expect(lessonPage).not.toMatch(
      /\/api\/playground|\/api\/benchmarks|developerTrace|inspection|reviewResult|strategySelection|providerRequest|providerResponse/,
    );
  });

  it("renders mobile lesson routes from responsive shell assets", async () => {
    const [lessonHtml, lessonCss] = await Promise.all([
      readFile(new URL("../../src/client/lesson.html", import.meta.url), "utf8"),
      readFile(new URL("../../src/client/courses.css", import.meta.url), "utf8"),
    ]);

    expect(lessonHtml).toContain('name="viewport" content="width=device-width, initial-scale=1"');
    expect(lessonHtml).toContain('id="lesson-root"');
    expect(lessonCss).toContain("@media (max-width: 640px)");
    expect(lessonCss).toContain(".lesson-list li");
  });
});
