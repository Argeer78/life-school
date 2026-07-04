import { describe, expect, it } from "vitest";
import { planFromStrategySelection } from "../../src/steward/behavior-planning.js";
import { conversationStrategyIds } from "../../src/steward/conversation-strategy-registry.js";
import type {
  ConstitutionalReview,
  PrincipleReviewResult,
} from "../../src/steward/review-schema.js";
import {
  correctedViolationsFor,
  correctionPriority,
  parseRevisionRecord,
  revisionPreservationFor,
} from "../../src/steward/revision-schema.js";
import { selectConversationStrategies } from "../../src/steward/strategy-selection.js";
import { makeReview } from "../fixtures/review-fixtures.js";

const learnerMessage =
  "Should I move, and can you guarantee that it will work out?";
const strategySelection = selectConversationStrategies({
  learnerMessage,
  currentConversation: [],
  availableStrategies: conversationStrategyIds,
});
const plan = planFromStrategySelection(learnerMessage, strategySelection);
const reviewContext = { strategySelection, plan };
const review = makeReview(
  reviewContext,
  { kind: "principle", id: "ST-BT-007" },
  "REVISION_REQUIRED",
);
const revisionContext = {
  learnerMessage,
  strategySelection,
  plan,
  review,
};

function validRecord() {
  return {
    outcome: "REVISED" as const,
    revisedResponse: "The choice remains yours; let us examine the options.",
    revisionSummary: "Returned responsibility to the learner.",
    correctedViolations: correctedViolationsFor(revisionContext),
    preservation: revisionPreservationFor(revisionContext),
  };
}

describe("EN-004 revision record schema", () => {
  it("defines the required constitutional correction priority", () => {
    expect(correctionPriority).toEqual([
      "HARM_SAFETY",
      "MANIPULATION_COERCION",
      "DIGNITY",
      "FREEDOM",
      "RESPONSIBILITY",
      "TRUTHFUL_EXAMINATION",
      "INTELLECTUAL_HONESTY",
      "CONVERSATIONAL_QUALITY",
    ]);
  });

  it("accepts a complete revision bound to its original context", () => {
    expect(parseRevisionRecord(validRecord(), revisionContext)).toEqual(
      validRecord(),
    );
  });

  it.each([
    {
      learnerMessage: "A changed learner message",
    },
    {
      primaryStrategy: "CS-006",
    },
    {
      secondaryStrategies: [],
    },
    {
      behaviorComponents: [],
    },
    {
      learnerIntentPreserved: false,
    },
    {
      selectedStrategiesPreserved: false,
    },
    {
      behaviorPlanObjectivePreserved: false,
    },
  ])("rejects altered preservation context %#", (change) => {
    const record = validRecord();
    expect(() =>
      parseRevisionRecord(
        {
          ...record,
          preservation: { ...record.preservation, ...change },
        },
        revisionContext,
      ),
    ).toThrow(TypeError);
  });

  it("requires every failed criterion in constitutional priority order", () => {
    const failedPrinciples = new Set([
      "ST-BT-006",
      "ST-BT-005",
      "ST-BT-004",
      "ST-BT-007",
      "ST-BT-002",
      "ST-BT-003",
      "ST-BT-009",
    ]);
    const passing = makeReview(reviewContext);
    const multiReview: ConstitutionalReview = {
      ...passing,
      outcome: "REVISION_REQUIRED",
      principleResults: passing.principleResults.map(
        (result): PrincipleReviewResult =>
          failedPrinciples.has(result.testId)
            ? {
                testId: result.testId,
                passes: false,
                reason: "This criterion failed.",
                revisionRequirement: "Correct this criterion.",
              }
            : result,
      ),
      harmSafety: {
        passes: false,
        reason: "Harm and safety failed.",
        revisionRequirement: "Remove the harmful content.",
      },
    };
    const context = { ...revisionContext, review: multiReview };
    const corrected = correctedViolationsFor(context);

    expect(corrected.map(({ category }) => category)).toEqual([
      "HARM_SAFETY",
      "MANIPULATION_COERCION",
      "DIGNITY",
      "FREEDOM",
      "RESPONSIBILITY",
      "TRUTHFUL_EXAMINATION",
      "INTELLECTUAL_HONESTY",
      "CONVERSATIONAL_QUALITY",
    ]);

    expect(() =>
      parseRevisionRecord(
        {
          outcome: "REVISED",
          revisedResponse: "A corrected response.",
          revisionSummary: "Corrected all violations.",
          correctedViolations: [...corrected].reverse(),
          preservation: revisionPreservationFor(context),
        },
        context,
      ),
    ).toThrow(TypeError);
  });

  it("accepts an explicit failed revision without claimed corrections", () => {
    const record = {
      outcome: "FAILED" as const,
      revisedResponse: null,
      revisionSummary: "A compliant revision was not possible.",
      correctedViolations: [] as const,
      preservation: revisionPreservationFor(revisionContext),
    };
    expect(parseRevisionRecord(record, revisionContext)).toEqual(record);
  });
});
