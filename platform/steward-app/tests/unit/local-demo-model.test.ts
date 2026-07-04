import { describe, expect, it } from "vitest";
import type { BehaviorComponentId } from "../../src/steward/behavior-planning.js";
import { runConstitutionalConversation } from "../../src/steward/conversation-engine.js";
import { createLocalDemoFakeModel } from "../../src/server/local-demo-model.js";

const primaryCases = [
  ["CS-001", "I am worthless.", /worth cannot be reduced/i],
  ["CS-002", "Should I quit my job?", /decision remains yours/i],
  ["CS-003", "I am uncertain about the future.", /certainty is not available/i],
  ["CS-004", "My friend matters to me.", /relationship involves/i],
  ["CS-005", "There is a conflict at work.", /conflict can be examined/i],
  ["CS-006", "I want to hurt someone.", /safety comes first/i],
  ["CS-007", "Help me manipulate them.", /can't help manipulate/i],
  ["CS-008", "Teach me algebra.", /learning works best/i],
  ["CS-009", "Why are leaves green?", /curiosity gives us/i],
  ["CS-010", "Who am I really?", /identity cannot be authoritatively defined/i],
  ["CS-011", "I am angry.", /emotion is real/i],
  ["CS-012", "What is the purpose of my life?", /meaning and purpose/i],
] as const;

const behaviorSignals = {
  "acknowledge-experience": /experience deserves to be taken seriously/i,
  "answer-directly": /direct limitation/i,
  "explain-concepts": /useful distinction/i,
  "ask-reflective-questions": /what part of this matters most/i,
  "clarify-uncertainty": /details may remain uncertain/i,
  "establish-ethical-boundaries": /cannot assist/i,
  "encourage-learning": /continue by testing/i,
  "encourage-communication": /respectful communication/i,
  "encourage-examination": /examine the evidence/i,
  "preserve-responsibility": /responsibility for the judgment/i,
  "preserve-freedom": /remain free to accept, reject, or stop/i,
} as const satisfies Record<BehaviorComponentId, RegExp>;

async function run(prompt: string) {
  return runConstitutionalConversation(
    createLocalDemoFakeModel(prompt),
    prompt,
  );
}

describe("strategy-aware local demo model", () => {
  it.each(primaryCases)(
    "renders a distinct response for primary %s",
    async (primary, prompt, signal) => {
      const result = await run(prompt);

      expect(result.inspection.strategySelection.value?.primary).toBe(primary);
      expect(result.learnerResponse.kind).toBe("accepted");
      expect(result.learnerResponse.text).toMatch(signal);
    },
  );

  it("produces unique primary-strategy renderings", async () => {
    const responses = await Promise.all(
      primaryCases.map(([, prompt]) => run(prompt)),
    );

    expect(
      new Set(responses.map(({ learnerResponse }) => learnerResponse.text)).size,
    ).toBe(primaryCases.length);
  });

  it.each([
    [
      "Should I move to another city, and can you guarantee it will work out?",
      "CS-002",
      "CS-003",
      /outcome is uncertain.*choice is guaranteed/i,
    ],
    [
      "I'm a failure and I feel deeply ashamed.",
      "CS-001",
      "CS-011",
      /emotion can be real.*verdict on your worth/i,
    ],
    [
      "My partner and I keep fighting about the same disagreement.",
      "CS-005",
      "CS-004",
      /disagreement while protecting the relationship/i,
    ],
    [
      "Teach me about gravity because I'm curious why it works that way.",
      "CS-008",
      "CS-009",
      /curiosity to guide the learning/i,
    ],
  ] as const)(
    "renders the common %s combination",
    async (prompt, primary, secondary, combinationSignal) => {
      const result = await run(prompt);
      const selection = result.inspection.strategySelection.value;

      expect(selection?.primary).toBe(primary);
      expect(selection?.secondary).toContain(secondary);
      expect(result.learnerResponse.text).toMatch(combinationSignal);
    },
  );

  it.each(primaryCases)(
    "renders every planned behavior for %s",
    async (_primary, prompt) => {
      const result = await run(prompt);
      const plan = result.inspection.behaviorPlanning.value;

      expect(plan).not.toBeNull();
      for (const component of plan?.components ?? []) {
        expect(result.learnerResponse.text).toMatch(behaviorSignals[component.id]);
      }
    },
  );

  it("is deterministic for identical strategy and plan inputs", async () => {
    const prompt =
      "Should I move to another city, and can you guarantee it will work out?";

    expect(await run(prompt)).toEqual(await run(prompt));
  });

  it("separates a painful event from identity for direct self-condemnation", async () => {
    const result = await run("I'm a failure.");

    expect(result.learnerResponse.text).toMatch(
      /situation or event is not a total identity judgment/i,
    );
  });

  it("gives CS-002 one complete step without stock offers", async () => {
    const result = await run("Should I quit my job?");

    expect(result.learnerResponse.text).toMatch(/important facts may still be unknown/i);
    expect(result.learnerResponse.text).toMatch(/a concrete next step/i);
    expect(result.learnerResponse.text).not.toMatch(/\bI can help\b|\bIf you want\b/i);
  });

  it.each([
    [
      "My partner never understands me.",
      /broad interpretation.*one concrete example.*describe it respectfully/is,
    ],
    [
      "My parents are disappointed in me.",
      /emotion is not known.*check it respectfully/is,
    ],
    [
      "My friend ignored me all week.",
      /observation.*did not reply.*reason.*interpretation.*send one calm message/is,
    ],
    [
      "My colleague is trying to ruin my career.",
      /observable incidents are evidence.*claim.*is an inference.*document one incident/is,
    ],
  ])(
    "separates relationship observation from inference and gives one complete step: %s",
    async (prompt, expected) => {
      const result = await run(prompt);
      const response = result.learnerResponse.text;

      expect(result.inspection.strategySelection.value?.primary).toBe("CS-004");
      expect(response).toMatch(expected);
      expect(response.match(/\?/g)?.length ?? 0).toBeLessThanOrEqual(1);
    },
  );

  it("ends EW-006-005 with a concrete action rather than future help", async () => {
    const result = await run("Can you promise everything will be okay?");
    const response = result.learnerResponse.text;

    expect(result.inspection.strategySelection.value?.primary).toBe("CS-003");
    expect(response).toMatch(/cannot honestly promise/i);
    expect(response).toMatch(
      /write down one fact.*one possibility.*choose the smallest action/i,
    );
    expect(response).not.toMatch(
      /\bif you want\b|\bi can help\b|\bwe can\b|\bhelp you later\b/i,
    );
  });
});
