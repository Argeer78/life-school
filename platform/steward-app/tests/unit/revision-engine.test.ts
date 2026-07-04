import { describe, expect, it } from "vitest";
import type { ReviseRequest } from "../../src/model/client.js";
import { runConstitutionalConversation } from "../../src/steward/conversation-engine.js";
import { revisionPreservationFor } from "../../src/steward/revision-schema.js";
import { FakeModelAdapter } from "../../src/testing/fake-model-adapter.js";
import {
  constitutionalMapping,
  reflectionIntent,
} from "../fixtures/conversation-stage-fixtures.js";
import {
  failingReview,
  passingReview,
} from "../fixtures/review-fixtures.js";
import {
  failedRevision,
  successfulRevision,
} from "../fixtures/revision-fixtures.js";

const firstFailure = failingReview({
  kind: "principle",
  id: "ST-BT-007",
});

function model(
  revise: unknown,
  secondReview: unknown = passingReview,
): FakeModelAdapter {
  return new FakeModelAdapter({
    detectIntent: [reflectionIntent],
    mapConstitution: [constitutionalMapping],
    generate: ["You must quit your job."],
    review: [firstFailure, secondReview],
    revise: [revise],
  });
}

describe("EN-004 Revision Engine", () => {
  it("creates a privileged typed record and re-reviews the revised response", async () => {
    const adapter = model(
      successfulRevision(
        "The decision about quitting your job remains yours; we can examine options and consequences.",
      ),
    );
    const result = await runConstitutionalConversation(
      adapter,
      "Should I quit my job?",
    );

    expect(adapter.reviseRequests).toHaveLength(1);
    expect(adapter.reviewRequests).toHaveLength(2);
    expect(result.inspection.revision.value).toMatchObject({
      outcome: "REVISED",
      revisedResponse:
        "The decision about quitting your job remains yours; we can examine options and consequences.",
      preservation: {
        learnerMessage: "Should I quit my job?",
        learnerIntentPreserved: true,
        selectedStrategiesPreserved: true,
        behaviorPlanObjectivePreserved: true,
      },
    });
    expect(result.inspection.revision.value?.correctedViolations).toEqual([
      { source: "ST-BT-007", category: "RESPONSIBILITY" },
    ]);
    expect(result.inspection.revisionVerification).toMatchObject({
      status: "completed",
      value: { verified: true },
      error: null,
    });
    expect(result.learnerResponse.revisions).toBe(1);
  });

  it("falls back when independent verification disproves adapter preservation claims", async () => {
    const adapter = model(
      successfulRevision(
        "The decision about buying a house remains yours; examine the options.",
      ),
    );
    const result = await runConstitutionalConversation(
      adapter,
      "Should I quit my job?",
    );

    expect(adapter.reviewRequests).toHaveLength(1);
    expect(result.inspection.revision.value?.preservation).toMatchObject({
      learnerIntentPreserved: true,
      selectedStrategiesPreserved: true,
      behaviorPlanObjectivePreserved: true,
    });
    expect(result.inspection.revisionVerification).toMatchObject({
      status: "failed",
      value: { verified: false },
      error: { code: "REVISION_PRESERVATION_ERROR" },
    });
    expect(result.inspection.fallback).toMatchObject({
      reason: "revision-preservation-failed",
      category: "REVISION_FAILURE",
      approvalStatus: "PRE_APPROVED",
    });
    expect(result.learnerResponse.text).not.toContain("buying a house");
  });

  it("invokes fallback when revision reports failure", async () => {
    const adapter = model(failedRevision());
    const result = await runConstitutionalConversation(
      adapter,
      "Should I quit my job?",
    );

    expect(adapter.reviseRequests).toHaveLength(1);
    expect(adapter.reviewRequests).toHaveLength(1);
    expect(result.inspection.revision.value?.outcome).toBe("FAILED");
    expect(result.inspection.fallback.reason).toBe("revision-failed");
    expect(result.inspection.fallback.category).toBe("REVISION_FAILURE");
    expect(result.inspection.fallback.approvalStatus).toBe("PRE_APPROVED");
  });

  it("rejects a revision that changes its bound constitutional context", async () => {
    const adapter = model((request: ReviseRequest) => {
      const context = {
        learnerMessage: request.userPrompt,
        strategySelection: request.strategySelection,
        plan: request.plan,
        review: request.review,
      };
      return {
        outcome: "REVISED",
        revisedResponse: "A changed response.",
        revisionSummary: "Claimed a correction.",
        correctedViolations: [
          { source: "ST-BT-007", category: "RESPONSIBILITY" },
        ],
        preservation: {
          ...revisionPreservationFor(context),
          learnerMessage: "A different learner message",
        },
      };
    });
    const result = await runConstitutionalConversation(
      adapter,
      "Should I quit my job?",
    );

    expect(adapter.reviewRequests).toHaveLength(1);
    expect(result.inspection.revision.status).toBe("failed");
    expect(result.inspection.fallback.reason).toBe("revision-failed");
  });

  it("invokes fallback when re-review rejects the revision", async () => {
    const adapter = model(
      successfulRevision(
        "The decision about quitting your job remains yours; examine the options.",
      ),
      failingReview({ kind: "harm-safety" }, "REJECTED"),
    );
    const result = await runConstitutionalConversation(
      adapter,
      "Should I quit my job?",
    );

    expect(adapter.reviseRequests).toHaveLength(1);
    expect(adapter.reviewRequests).toHaveLength(2);
    expect(result.inspection.fallback.reason).toBe("revision-review-failed");
    expect(result.learnerResponse.text).not.toContain(
      "The decision remains yours.",
    );
  });

  it("never performs more than one revision", async () => {
    const adapter = new FakeModelAdapter({
      detectIntent: [reflectionIntent],
      mapConstitution: [constitutionalMapping],
      generate: ["You must quit."],
      review: [firstFailure, firstFailure, passingReview],
      revise: [
        successfulRevision(
          "The decision about quitting remains yours; examine the options.",
        ),
        successfulRevision("Forbidden second revision."),
      ],
    });

    await runConstitutionalConversation(adapter, "Should I quit?");

    expect(adapter.reviseRequests).toHaveLength(1);
    expect(adapter.reviewRequests).toHaveLength(2);
  });

  it("is deterministic with identical fake revision inputs", async () => {
    const createAdapter = () =>
      model(
        successfulRevision(
          "The decision about quitting your job remains yours; examine the options.",
        ),
      );

    const first = await runConstitutionalConversation(
      createAdapter(),
      "Should I quit my job?",
    );
    const second = await runConstitutionalConversation(
      createAdapter(),
      "Should I quit my job?",
    );

    expect(first).toEqual(second);
  });
});
