import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { createCourseSession } from "../../src/client/course-session.js";
import {
  buildLessonPracticeMessage,
  defineLesson,
} from "../../src/client/lesson-model.js";
import {
  renderConcept,
  renderContinue,
  renderExample,
  renderExercise,
  renderLessonPage,
  renderPracticeWithSteward,
  renderReflection,
  renderWhyThisMatters,
} from "../../src/client/lesson-renderer.js";
import {
  findThinkingClearlyLesson,
  thinkingClearlyLessons,
} from "../../src/client/thinking-clearly-lessons.js";
import { thinkingClearlyLessonsEl } from "../../src/client/thinking-clearly-lessons-el.js";

describe("Lifeschool Lesson Framework v1", () => {
  it("presents the complete Thinking Clearly module overview", async () => {
    const html = await readFile(
      new URL("../../src/client/courses.html", import.meta.url),
      "utf8",
    );

    expect(html).toContain("Learning Home");
    expect(html).toContain("Thinking Clearly");
    expect(html).toContain("90 minutes across 6 lessons");
    for (const route of [
      "/courses/thinking-clearly",
      "/courses/thinking-clearly/lesson-2",
      "/courses/thinking-clearly/lesson-3",
      "/courses/thinking-clearly/lesson-4",
      "/courses/thinking-clearly/lesson-5",
      "/courses/thinking-clearly/lesson-6",
    ]) {
      expect(html).toContain(`href="${route}"`);
    }
    for (const title of [
      "What happened vs. what it means",
      "Feelings are real, but not always final evidence",
      "Assumptions and missing information",
      "Better questions create better thinking",
      "Evidence, alternatives, and consequences",
      "From reaction to examination",
    ]) {
      expect(html).toContain(title);
    }
  });

  it("represents all six lessons with the complete reusable lesson model", () => {
    expect(thinkingClearlyLessons).toHaveLength(6);
    for (const lesson of thinkingClearlyLessons) {
      expect(lesson).toMatchObject({
        id: expect.any(String),
        title: expect.any(String),
        estimatedDuration: expect.any(String),
        whyThisMatters: { paragraphs: expect.any(Array) },
        concept: { paragraphs: expect.any(Array) },
        example: {
          quote: expect.any(String),
          distinctions: expect.any(Array),
        },
        exercise: { fields: expect.any(Array) },
        reflection: {
          prompt: expect.any(String),
        },
        practicePromptTemplate: {
          defaultPrompt: expect.any(String),
          handoff: expect.any(String),
        },
        completionCriteria: expect.any(String),
      });
      expect("nextLesson" in lesson).toBe(true);
    }
    expect(
      findThinkingClearlyLesson("/courses/thinking-clearly/"),
    ).toHaveProperty("id", "CUR-001-LESSON-1");
    expect(
      findThinkingClearlyLesson("/courses/thinking-clearly/lesson-2"),
    ).toHaveProperty("id", "CUR-001-LESSON-2");
    expect(
      findThinkingClearlyLesson("/courses/thinking-clearly/lesson-6/"),
    ).toHaveProperty("id", "CUR-001-LESSON-6");
    expect(
      findThinkingClearlyLesson("/courses/thinking-clearly", "el"),
    ).toHaveProperty("title", "Τι συνέβη και τι σημαίνει");
  });

  it("provides complete native Greek data for all six lessons", () => {
    expect(thinkingClearlyLessonsEl).toHaveLength(6);
    expect(
      thinkingClearlyLessonsEl.map(({ id }) => id),
    ).toEqual(thinkingClearlyLessons.map(({ id }) => id));

    const visibleStrings = thinkingClearlyLessonsEl.flatMap((lesson) => [
      lesson.moduleTitle,
      lesson.title,
      lesson.estimatedDuration,
      lesson.introduction,
      ...lesson.whyThisMatters.paragraphs,
      ...lesson.concept.paragraphs,
      ...(lesson.concept.highlights ?? []),
      lesson.example.quote,
      ...lesson.example.distinctions.flatMap(({ term, description }) => [
        term,
        description,
      ]),
      ...lesson.example.paragraphs,
      ...lesson.exercise.instructions,
      ...(lesson.exercise.options ?? []),
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
    ]);

    for (const text of visibleStrings.filter((value) => value.length > 0)) {
      expect(text).toMatch(/\p{Script_Extensions=Greek}/u);
      expect(text.replaceAll("Steward", "")).not.toMatch(/[A-Za-z]{3,}/);
    }
  });

  it("uses consistent Greek curriculum terminology", () => {
    expect(
      new Set(thinkingClearlyLessonsEl.map(({ moduleTitle }) => moduleTitle)),
    ).toEqual(new Set(["Καθαρή σκέψη"]));
    expect(thinkingClearlyLessonsEl[0]?.concept.paragraphs.join(" ")).toMatch(
      /παρατήρηση.*ερμηνεία/is,
    );
    expect(thinkingClearlyLessonsEl[4]?.title).toBe(
      "Στοιχεία, εναλλακτικές εξηγήσεις και συνέπειες",
    );
    expect(thinkingClearlyLessonsEl[5]?.title).toBe(
      "Από την αντίδραση στην εξέταση",
    );
  });

  it("renders all seven reusable sections in order for all six lessons", () => {
    const sectionRenderers = [
      renderWhyThisMatters,
      renderConcept,
      renderExample,
      renderExercise,
      renderReflection,
      renderPracticeWithSteward,
      renderContinue,
    ];
    const sectionNames = [
      "Why this matters",
      "Concept",
      "Example",
      "Exercise",
      "Reflection",
      "Practice with Steward",
      "Continue",
    ];

    for (const lesson of thinkingClearlyLessons) {
      const rendered = renderLessonPage(lesson);
      for (const [index, sectionName] of sectionNames.entries()) {
        const position = rendered.indexOf(`>${sectionName}</h2>`);
        expect(position).toBeGreaterThan(-1);
        if (index > 0) {
          expect(position).toBeGreaterThan(
            rendered.indexOf(`>${sectionNames[index - 1]}</h2>`),
          );
        }
        expect(sectionRenderers[index]!(lesson)).toContain(sectionName);
      }
    }
  });

  it("preserves Lesson 1 content, handoff, and Lesson 2 navigation", () => {
    const lesson = thinkingClearlyLessons[0];
    if (lesson === undefined) throw new Error("Lesson 1 fixture is missing.");
    const rendered = renderLessonPage(lesson);

    expect(rendered).toContain("What happened vs. what it means");
    expect(rendered).toContain(
      "My friend looked at their phone twice while I was speaking.",
    );
    expect(rendered).toContain("What happened");
    expect(rendered).toContain("What I think it means");
    expect(rendered).toContain("Continue with Steward");
    expect(rendered).toContain("/courses/thinking-clearly/lesson-2");
    expect(
      buildLessonPracticeMessage(lesson.practicePromptTemplate.handoff, {
        observation: "My colleague did not answer my message today",
        interpretation: "They are avoiding me",
      }),
    ).toBe(
      "I observed: My colleague did not answer my message today. My interpretation was: They are avoiding me. Can you help me examine whether I'm separating what happened from what I think it means?",
    );
  });

  it("preserves Lesson 2 content and feeling handoff", () => {
    const lesson = thinkingClearlyLessons[1];
    if (lesson === undefined) throw new Error("Lesson 2 fixture is missing.");
    const rendered = renderLessonPage(lesson);

    expect(rendered).toContain(
      "Feelings are real, but not always final evidence",
    );
    expect(rendered).toContain('for="feeling">Feeling');
    expect(rendered).toContain("What the feeling might be telling me");
    expect(
      buildLessonPracticeMessage(lesson.practicePromptTemplate.handoff, {
        feeling: "anxious",
        "feeling-meaning": "this matters to me",
      }),
    ).toBe(
      "I noticed this feeling: anxious. I think it may be telling me: this matters to me. Can you help me examine the feeling without treating it as final evidence?",
    );
    expect(() =>
      buildLessonPracticeMessage(lesson.practicePromptTemplate.handoff, {
        feeling: "",
        "feeling-meaning": "this matters",
      }),
    ).toThrow(TypeError);
  });

  it("renders the required Lessons 3–6 fields and handoff messages", () => {
    const cases = [
      {
        lessonNumber: 3,
        title: "Assumptions and missing information",
        fields: [
          ["possible-truth", "What I think might be true"],
          ["missing-information", "What I do not know yet"],
        ],
        values: {
          "possible-truth": "the meeting may concern my work",
          "missing-information": "why it was scheduled",
        },
        message:
          "I think this might be true: the meeting may concern my work. What I do not know yet is: why it was scheduled. Can you help me separate assumption from missing information?",
      },
      {
        lessonNumber: 4,
        title: "Better questions create better thinking",
        fields: [
          ["first-question", "My first question"],
          ["clearer-question", "A clearer question"],
        ],
        values: {
          "first-question": "Why does nobody listen to me",
          "clearer-question": "What happened when I last felt unheard",
        },
        message:
          "My first question was: Why does nobody listen to me. I tried to make it clearer as: What happened when I last felt unheard. Can you help me improve the question so it leads to better thinking?",
      },
      {
        lessonNumber: 5,
        title: "Evidence, alternatives, and consequences",
        fields: [
          ["claim", "Claim or conclusion"],
          ["evidence", "Evidence supporting or challenging my claim"],
          ["alternative", "Possible alternative explanation"],
          ["consequence", "Possible consequence if I am right or wrong"],
        ],
        values: {
          claim: "speaking up will make things worse",
          evidence: "past conversations became tense",
          alternative: "careful wording may improve clarity",
          consequence: "the concern may continue if I stay silent",
        },
        message:
          "My claim or conclusion is: speaking up will make things worse. Evidence supporting or challenging it is: past conversations became tense. A possible alternative explanation is: careful wording may improve clarity. A possible consequence if I am right or wrong is: the concern may continue if I stay silent. Can you help me think through it more clearly?",
      },
      {
        lessonNumber: 6,
        title: "From reaction to examination",
        fields: [
          ["first-reaction", "My first reaction"],
          ["examine-instead", "What I want to examine instead"],
        ],
        values: {
          "first-reaction": "reply angrily",
          "examine-instead": "what the message actually said",
        },
        message:
          "My first reaction was: reply angrily. What I want to examine instead is: what the message actually said. Can you help me move from reaction to examination?",
      },
    ];

    for (const testCase of cases) {
      const lesson = thinkingClearlyLessons[testCase.lessonNumber - 1];
      if (lesson === undefined) {
        throw new Error(`Lesson ${testCase.lessonNumber} fixture is missing.`);
      }
      const rendered = renderLessonPage(lesson);

      expect(rendered).toContain(testCase.title);
      for (const [fieldId, label] of testCase.fields) {
        expect(rendered).toContain(`data-exercise-field="${fieldId}"`);
        expect(rendered).toContain(label);
      }
      expect(
        buildLessonPracticeMessage(
          lesson.practicePromptTemplate.handoff,
          testCase.values,
        ),
      ).toBe(testCase.message);
    }
  });

  it("links Lessons 1–6 sequentially and ends after Lesson 6", () => {
    for (const [index, lesson] of thinkingClearlyLessons.entries()) {
      const lessonNumber = index + 1;
      if (lessonNumber < 6) {
        expect(lesson.nextLesson).toEqual({
          href: `/courses/thinking-clearly/lesson-${lessonNumber + 1}`,
          label: `Continue to Lesson ${lessonNumber + 1}`,
        });
        expect(renderLessonPage(lesson)).toContain(
          `/courses/thinking-clearly/lesson-${lessonNumber + 1}`,
        );
      } else {
        expect(lesson.nextLesson).toBeNull();
        expect(renderLessonPage(lesson)).not.toContain('id="next-lesson"');
      }
    }
  });

  it("keeps lesson completion in page-session memory only", () => {
    const session = createCourseSession();
    for (const lesson of thinkingClearlyLessons) {
      session.complete(lesson.id);
    }

    expect(session.completedLessons()).toEqual(
      thinkingClearlyLessons.map(({ id }) => id),
    );
    expect(createCourseSession().completedLessons()).toEqual([]);
  });

  it("requires only lesson data for future rendering", async () => {
    const frameworkSource = await readFile(
      new URL("../../src/client/lesson-page.js", import.meta.url),
      "utf8",
    );
    const sourceLesson = thinkingClearlyLessons[1];
    if (sourceLesson === undefined) {
      throw new Error("Source lesson fixture is missing.");
    }
    const sample = defineLesson({
      ...sourceLesson,
      id: "CUR-001-LESSON-SAMPLE",
      route: "/courses/thinking-clearly/lesson-sample",
      title: "Sample future lesson",
    });

    expect(renderLessonPage(sample)).toContain("Sample future lesson");
    expect(frameworkSource).not.toMatch(
      /CUR-001-LESSON-1|CUR-001-LESSON-2|What happened vs\.|Feelings are real/,
    );
  });

  it("uses only the production learner-safe API and remains ephemeral", async () => {
    const frameworkFiles = await Promise.all(
      [
        "lesson.html",
        "lesson-page.js",
        "lesson-model.js",
        "lesson-renderer.js",
        "thinking-clearly-lessons.js",
        "course-session.js",
      ].map((file) =>
        readFile(new URL(`../../src/client/${file}`, import.meta.url), "utf8"),
      ),
    );
    const framework = frameworkFiles.join("\n");

    expect(framework).toContain('fetch("/api/message"');
    expect(framework).toContain("projectLearnerResponse");
    expect(framework).toContain("JSON.stringify({ message })");
    expect(framework).not.toMatch(
      /\/api\/playground|\/api\/benchmarks|developerTrace|inspection|strategySelection|principleResults|reviewResult|providerRequest|providerResponse/,
    );
    expect(framework).not.toMatch(
      /localStorage|sessionStorage|indexedDB|cookie|analytics|telemetry|accountId|profileId|database/i,
    );
    expect(framework).not.toMatch(
      /badge|streak|leaderboard|points|score\b|gamification/i,
    );
  });

  it("retains the mobile-first curriculum breakpoint", async () => {
    const css = await readFile(
      new URL("../../src/client/courses.css", import.meta.url),
      "utf8",
    );

    expect(css).toContain("@media (max-width: 640px)");
    expect(css).toContain("grid-template-columns: 1fr");
  });
});
