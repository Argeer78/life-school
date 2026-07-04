import { describe, expect, it } from "vitest";
import { planFromStrategySelection } from "../../src/steward/behavior-planning.js";
import { conversationStrategyIds } from "../../src/steward/conversation-strategy-registry.js";
import { verifyRevisionPreservation } from "../../src/steward/revision-preservation.js";
import { selectConversationStrategies } from "../../src/steward/strategy-selection.js";

const learnerMessage = "Should I quit my job?";
const strategySelection = selectConversationStrategies({
  learnerMessage,
  currentConversation: [],
  availableStrategies: conversationStrategyIds,
});
const behaviorPlan = planFromStrategySelection(
  learnerMessage,
  strategySelection,
);

function verify(
  changes: Partial<Parameters<typeof verifyRevisionPreservation>[0]> = {},
) {
  return verifyRevisionPreservation({
    learnerMessage,
    strategySelection,
    behaviorPlan,
    failedCandidate: "You must quit your job.",
    revisedResponse:
      "The decision about leaving your job remains yours. You may examine the options and consequences.",
    revisionSummary:
      "Corrected responsibility by returning the decision to the learner.",
    correctedViolations: [
      { source: "ST-BT-007", category: "RESPONSIBILITY" },
    ],
    ...changes,
  });
}

describe("independent EN-004 semantic preservation verifier", () => {
  it("independently verifies a structurally preserved revision", () => {
    const result = verify();

    expect(result.verified).toBe(true);
    expect(result.checks).toHaveLength(5);
    expect(result.checks.every(({ passes }) => passes)).toBe(true);
  });

  it("rejects a revision that no longer answers the same request", () => {
    const result = verify({
      revisedResponse:
        "The decision about buying a house remains yours. You may examine those options.",
    });

    expect(result.verified).toBe(false);
    expect(result.checks).toContainEqual({
      id: "SAME_LEARNER_REQUEST",
      passes: false,
      reasonCode: "MISSING_TOPIC_ANCHOR",
    });
  });

  it("rejects a revision without the selected strategy objective", () => {
    const result = verify({
      revisedResponse: "Your job situation deserves careful examination.",
    });

    expect(result.checks).toContainEqual({
      id: "SAME_SELECTED_STRATEGIES",
      passes: false,
      reasonCode: "MISSING_STRATEGY_SIGNAL",
    });
  });

  it("rejects insufficient behavior-plan coverage", () => {
    const result = verify({
      revisedResponse: "This is your job decision.",
    });

    expect(result.checks).toContainEqual({
      id: "SAME_BEHAVIOR_OBJECTIVE",
      passes: false,
      reasonCode: "INSUFFICIENT_BEHAVIOR_COVERAGE",
    });
  });

  it("rejects new authority, learner decisions, and certainty claims", () => {
    const result = verify({
      revisedResponse:
        "The decision about your job remains yours, but you must quit your job. You may examine the options.",
    });

    expect(result.checks).toContainEqual({
      id: "NO_NEW_TOPIC_AUTHORITY_DECISION_OR_CLAIM",
      passes: false,
      reasonCode: "NEW_TOPIC_OR_AUTHORITY",
    });
  });

  it("rejects a new topic even when the original topic remains present", () => {
    const result = verify({
      revisedResponse:
        "The decision about leaving your job remains yours. Examine the options and buy a house.",
    });

    expect(result.checks).toContainEqual({
      id: "NO_NEW_TOPIC_AUTHORITY_DECISION_OR_CLAIM",
      passes: false,
      reasonCode: "NEW_TOPIC_OR_AUTHORITY",
    });
  });

  it("rejects an inaccurate revision summary", () => {
    const result = verify({ revisionSummary: "Added an unrelated metaphor." });

    expect(result.checks).toContainEqual({
      id: "ACCURATE_REVISION_SUMMARY",
      passes: false,
      reasonCode: "INACCURATE_SUMMARY",
    });
  });

  it("is deterministic for identical inputs", () => {
    expect(verify()).toEqual(verify());
  });
});
