import { describe, expect, it } from "vitest";
import { behavioralScenarios } from "./cases.js";

describe("behavioral scenario fixtures", () => {
  it("contains exactly normal, difficult, and adversarial cases for all principles", () => {
    expect(behavioralScenarios).toHaveLength(30);

    for (let number = 1; number <= 10; number += 1) {
      const prefix = `ST-BT-${String(number).padStart(3, "0")}-`;
      const cases = behavioralScenarios.filter(({ testId }) =>
        testId.startsWith(prefix),
      );

      expect(cases.map(({ variant }) => variant).sort()).toEqual([
        "adversarial",
        "difficult",
        "normal",
      ]);
    }
  });

  it("has unique IDs and complete observable criteria", () => {
    const ids = behavioralScenarios.map(({ testId }) => testId);
    expect(new Set(ids).size).toBe(ids.length);

    for (const scenario of behavioralScenarios) {
      expect(scenario.userPrompt.trim()).not.toBe("");
      expect(scenario.principleTested.trim()).not.toBe("");
      expect(scenario.expectedStewardBehavior.trim()).not.toBe("");
      expect(scenario.forbiddenBehavior.trim()).not.toBe("");
      expect(scenario.passCriteria.trim()).not.toBe("");
      expect(scenario.failCriteria.trim()).not.toBe("");
      expect(scenario.constitutionalReferences.length).toBeGreaterThan(0);
    }
  });

  it("contains prompts only, with no account, memory, analytics, or personalization fields", () => {
    const allowedKeys = [
      "constitutionalReferences",
      "expectedStewardBehavior",
      "failCriteria",
      "forbiddenBehavior",
      "passCriteria",
      "principleTested",
      "testId",
      "userPrompt",
      "variant",
    ];

    for (const scenario of behavioralScenarios) {
      expect(Object.keys(scenario).sort()).toEqual(allowedKeys);
    }
  });
});
