import { describe, expect, it } from "vitest";
import { loadEvaluationFixtures } from "../../src/evaluation/fixtures.js";
import {
  evaluationScoreCriteria,
  evaluationSetIds,
  type HumanEvaluationScore,
} from "../../src/evaluation/types.js";

describe("Markdown-backed evaluation fixtures", () => {
  it("represents all 12 authoritative EW documents", async () => {
    const fixtures = await loadEvaluationFixtures();

    expect(fixtures.map(({ id }) => id)).toEqual(evaluationSetIds);
    expect(fixtures).toHaveLength(12);
    expect(fixtures.every(({ sourceDocument }) =>
      sourceDocument.startsWith("docs/evaluation/EW-"),
    )).toBe(true);
    expect(fixtures.every(({ title }) => title.length > 0)).toBe(true);
    expect(fixtures.every(({ description }) => description.length > 0)).toBe(
      true,
    );
  });

  it("represents all 72 conversations exactly once", async () => {
    const fixtures = await loadEvaluationFixtures();
    const conversations = fixtures.flatMap(({ conversations }) =>
      conversations,
    );
    const ids = conversations.map(({ id }) => id);

    expect(conversations).toHaveLength(72);
    expect(new Set(ids).size).toBe(72);
    expect(
      conversations.every(
        ({ learnerPrompt, expectedQualities, criticalFailureConditions }) =>
          learnerPrompt.length > 0 &&
          expectedQualities.length > 0 &&
          criticalFailureConditions.length > 0,
      ),
    ).toBe(true);
  });

  it("preserves explicit expected strategy coverage without inventing it", async () => {
    const fixtures = await loadEvaluationFixtures();
    const selfWorth = fixtures.find(({ id }) => id === "EW-001");
    const safetyCase = selfWorth?.conversations.find(
      ({ id }) => id === "EW-001-005",
    );
    const identityCase = selfWorth?.conversations.find(
      ({ id }) => id === "EW-001-006",
    );
    const decisionCase = fixtures
      .find(({ id }) => id === "EW-002")
      ?.conversations.at(0);

    expect(safetyCase).toMatchObject({
      expectedPrimaryStrategy: "CS-006",
      expectedSecondaryStrategies: ["CS-001"],
    });
    expect(identityCase).toMatchObject({
      expectedPrimaryStrategy: "CS-001",
      expectedSecondaryStrategies: ["CS-010", "CS-011"],
    });
    expect(decisionCase).toMatchObject({
      expectedPrimaryStrategy: null,
      expectedSecondaryStrategies: [],
    });
    expect(
      fixtures.find(({ id }) => id === "EW-012")?.primaryCoverage,
    ).toEqual(["ST-001"]);
  });

  it("defines a human-only six-criterion scoring contract", () => {
    const score: HumanEvaluationScore = {
      scores: {
        constitutionalFidelity: 4,
        humanDignity: 4,
        humanFreedom: 3,
        intellectualHonesty: 4,
        practicalHelpfulness: 3,
        naturalness: 4,
      },
      outcome: "PASS",
      reviewerNotes: "Human reviewer evidence.",
    };

    expect(evaluationScoreCriteria).toEqual([
      "constitutionalFidelity",
      "humanDignity",
      "humanFreedom",
      "intellectualHonesty",
      "practicalHelpfulness",
      "naturalness",
    ]);
    expect(score.outcome).toBe("PASS");
  });
});
