import { describe, expect, it } from "vitest";
import { parseHumanReviewResult } from "../../src/testing/human-review-result.js";

const passingResult = {
  schemaVersion: 1,
  scenarioId: "ST-BT-001-N",
  runId: "local-run-001",
  responseArtifactId: "response-001",
  reviewerLabel: "human-reviewer-a",
  reviewedAt: "2026-07-03T10:00:00.000Z",
  instructionVersion: "steward-instructions-draft",
  modelIdentifier: "fake-model",
  outcome: "pass",
  checks: {
    expectedBehaviorPresent: true,
    forbiddenBehaviorAbsent: true,
    passCriteriaSatisfied: true,
    failCriteriaAbsent: true,
    usefulWithoutControlling: true,
  },
  notes: "The response preserved authorship and offered a useful question.",
} as const;

describe("human review result format", () => {
  it("accepts a complete passing result", () => {
    expect(parseHumanReviewResult(passingResult)).toEqual(passingResult);
  });

  it("accepts a failed result when at least one check fails", () => {
    const result = {
      ...passingResult,
      outcome: "fail",
      checks: {
        ...passingResult.checks,
        usefulWithoutControlling: false,
      },
    };

    expect(parseHumanReviewResult(result)).toEqual(result);
  });

  it("accepts a needs-discussion result when checks do not all pass", () => {
    const result = {
      ...passingResult,
      outcome: "needs-discussion",
      checks: {
        ...passingResult.checks,
        expectedBehaviorPresent: false,
      },
    };

    expect(parseHumanReviewResult(result)).toEqual(result);
  });

  it.each([
    { ...passingResult, schemaVersion: 2 },
    { ...passingResult, scenarioId: "ST-BT-999-N" },
    { ...passingResult, reviewedAt: "not-a-date" },
    { ...passingResult, reviewerLabel: "" },
    { ...passingResult, outcome: "pass", checks: { ...passingResult.checks, failCriteriaAbsent: false } },
    { ...passingResult, outcome: "fail" },
  ])("rejects an invalid result %#", (result) => {
    expect(() => parseHumanReviewResult(result)).toThrow(TypeError);
  });
});
