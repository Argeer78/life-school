import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { buildLessonPracticeMessage } from "../../src/client/lesson-model.js";
import { thinkingClearlyLessonsEl } from "../../src/client/thinking-clearly-lessons-el.js";
import { resolveResponseLanguage } from "../../src/provider/response-language.js";
import {
  providerResult,
  type GenerationProvider,
} from "../../src/provider/contract.js";
import { createLocalDemoFakeModel } from "../../src/server/local-demo-model.js";
import { processLearnerMessage } from "../../src/server/message-api.js";
import { processPlaygroundMessage } from "../../src/server/playground-api.js";
import { conversationStrategyIds } from "../../src/steward/conversation-strategy-registry.js";
import { selectConversationStrategies } from "../../src/steward/strategy-selection.js";

const exactLessonPrompt =
  "Παρατήρησα αυτό το συναίσθημα: μίσος. Νομίζω ότι μπορεί να μου δείχνει: ότι μισώ κάποιον. Μπορείς να με βοηθήσεις να το εξετάσω χωρίς να το θεωρήσω τελική απόδειξη;";

async function learnerResponse(prompt: string) {
  return processLearnerMessage(createLocalDemoFakeModel(prompt), {
    message: prompt,
  });
}

function expectGreekLearnerText(text: string) {
  expect(text).toMatch(/\p{Script_Extensions=Greek}/u);
  expect(text).not.toMatch(
    /(?:^|\n)\s*(?:Curiosity|CS-\d{3}|Strategy|Primary strategy)\b/i,
  );
}

describe("Greek learner-safe response behavior", () => {
  it("routes all six Greek lesson practice prompts by meaning instead of defaulting to curiosity", () => {
    const expected = [
      "CS-004",
      "CS-011",
      "CS-003",
      "CS-009",
      "CS-003",
      "CS-011",
    ];
    thinkingClearlyLessonsEl.forEach((lesson, index) => {
      expect(
        selectConversationStrategies({
          learnerMessage: lesson.practicePromptTemplate.defaultPrompt,
          currentConversation: [],
          availableStrategies: conversationStrategyIds,
        }).primary,
      ).toBe(expected[index]);
    });
  });

  it("uses Greek response-language guidance for a Greek /learn prompt", async () => {
    const prompt = "Ποιος είναι ο σκοπός μου;";
    const learnClient = await readFile(
      new URL("../../src/client/learn.js", import.meta.url),
      "utf8",
    );

    expect(learnClient).toContain('fetch("/api/message"');
    expect(resolveResponseLanguage(prompt)).toBe("el");
    expectGreekLearnerText((await learnerResponse(prompt)).text);
  });

  it("uses Greek response-language guidance for curriculum practice", async () => {
    const lesson = thinkingClearlyLessonsEl[1];
    if (lesson === undefined) throw new Error("Greek Lesson 2 is unavailable.");
    const lessonClient = await readFile(
      new URL("../../src/client/lesson-page.js", import.meta.url),
      "utf8",
    );
    const prompt = lesson.practicePromptTemplate.defaultPrompt;

    expect(lessonClient).toContain('fetch("/api/message"');
    expect(resolveResponseLanguage(prompt)).toBe("el");
    expectGreekLearnerText((await learnerResponse(prompt)).text);
  });

  it("keeps the Greek exercise handoff in Greek through the learner API", async () => {
    const lesson = thinkingClearlyLessonsEl[1];
    if (lesson === undefined) throw new Error("Greek Lesson 2 is unavailable.");
    const prompt = buildLessonPracticeMessage(
      lesson.practicePromptTemplate.handoff,
      {
        feeling: "μίσος",
        "feeling-meaning": "ότι μισώ κάποιον",
      },
    );

    expect(prompt).toBe(exactLessonPrompt);
    expect(resolveResponseLanguage(prompt)).toBe("el");
    const response = await learnerResponse(prompt);
    expectGreekLearnerText(response.text);
    expect(response.text).toMatch(/πραγματικό ως εμπειρία/i);
    expect(response.text).toMatch(/δεν αποδεικνύει από μόνο του/i);
    expect(response.text).toMatch(/τι ένιωσα.*τι συμπέρανα/is);
    expect(response.text.split(/[.!?](?:\s|$)/u).filter(Boolean)).toHaveLength(
      2,
    );
  });

  it("does not expose learner-facing strategy labels in local responses", async () => {
    for (const prompt of [
      exactLessonPrompt,
      "Why are leaves green?",
      "What is my purpose?",
      "Should I quit my job?",
    ]) {
      const response = await learnerResponse(prompt);
      expect(response.text).not.toMatch(
        /(?:^|\n)\s*(?:Curiosity|CS-\d{3}|Strategy|Primary strategy)\b/i,
      );
      expect(response.text).not.toMatch(/\bCS-\d{3}\b/i);
    }
  });

  it("repairs wrong-language or strategy-labelled provider text before learner delivery", async () => {
    const englishProvider: GenerationProvider = {
      generate: async () =>
        providerResult(
          "Curiosity gives us a useful starting point. Primary strategy: CS-009.",
        ),
    };
    const model = createLocalDemoFakeModel(exactLessonPrompt, englishProvider);
    const response = await processLearnerMessage(model, {
      message: exactLessonPrompt,
    });

    expectGreekLearnerText(response.text);
    expect(response.text).toMatch(/τι ένιωσα.*τι συμπέρανα/is);
  });

  it("continues to answer English learner prompts in English", async () => {
    const prompt = "Why are leaves green?";
    const response = await learnerResponse(prompt);

    expect(resolveResponseLanguage(prompt)).toBe("en");
    expect(response.text).toMatch(/your question gives us/i);
    expect(response.text).not.toMatch(/\p{Script_Extensions=Greek}/u);
  });

  it("keeps strategy IDs available only in the privileged DevTools trace", async () => {
    const result = await processPlaygroundMessage(
      createLocalDemoFakeModel(exactLessonPrompt),
      { message: exactLessonPrompt },
      { provider: "fake", model: "local-demo" },
    );

    expect(result.stages.strategySelection.value?.primary).toMatch(/^CS-\d{3}$/);
    expect(result.learnerResponse.text).not.toMatch(/\bCS-\d{3}\b/);
    expectGreekLearnerText(result.learnerResponse.text);
  });
});
