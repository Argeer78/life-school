import { describe, expect, it } from "vitest";
import {
  learnerResponseBody,
  processLearnerMessage,
} from "../../src/server/message-api.js";
import { preApprovedFallbacks } from "../../src/steward/fallback.js";
import { FakeModelAdapter } from "../../src/testing/fake-model-adapter.js";
import {
  constitutionalMapping,
  reflectionIntent,
} from "../fixtures/conversation-stage-fixtures.js";
import {
  failingReview,
  passingReview,
} from "../fixtures/review-fixtures.js";
import { successfulRevision } from "../fixtures/revision-fixtures.js";

describe("learner message API boundary", () => {
  it("returns only learner-safe fields after rejecting a candidate", async () => {
    const rejectedCandidate = "SECRET REJECTED CANDIDATE";
    const model = new FakeModelAdapter({
      detectIntent: [reflectionIntent],
      mapConstitution: [constitutionalMapping],
      generate: [rejectedCandidate],
      review: [
        failingReview({ kind: "principle", id: "ST-BT-007" }),
        passingReview,
      ],
      revise: [
        successfulRevision(
          "The decision remains yours; you may examine your options.",
        ),
      ],
    });

    const response = await processLearnerMessage(model, {
      message: "Choose for me.",
    });
    const serialized = JSON.stringify(learnerResponseBody(response));

    expect(Object.keys(response).sort()).toEqual(["kind", "revisions", "text"]);
    expect(serialized).not.toContain(rejectedCandidate);
    expect(serialized).not.toContain("principleResults");
    expect(serialized).not.toContain("revisionRequirement");
    expect(serialized).not.toContain("strategyCompliance");
    expect(serialized).not.toContain("behaviorPlanCompliance");
    expect(serialized).not.toContain("harmSafety");
    expect(serialized).not.toContain("REVISION_REQUIRED");
    expect(serialized).not.toContain("revisionSummary");
    expect(serialized).not.toContain("correctedViolations");
    expect(serialized).not.toContain("preservation");
    expect(serialized).not.toContain("inspection");
    expect(serialized).not.toContain("review");
    expect(serialized).not.toContain("strategySelection");
    expect(serialized).not.toContain("behaviorPlanning");
    expect(serialized).not.toContain("components");
  });

  it("never exposes raw model errors or internal prompt text", async () => {
    const secret =
      "RAW PROVIDER ERROR: INTERNAL SYSTEM PROMPT MUST NEVER LEAK";
    const model = new FakeModelAdapter({
      detectIntent: [new Error(secret)],
      generate: [],
      review: [],
    });

    const response = await processLearnerMessage(model, {
      message: "Hello",
    });
    const serialized = JSON.stringify(response);

    expect(response).toEqual({
      kind: "fallback",
      text: preApprovedFallbacks.TECHNICAL_LIMITATION.text,
      revisions: 0,
    });
    expect(serialized).not.toContain(secret);
    expect(serialized).not.toContain("PROMPT");
    expect(serialized).not.toContain("ERROR");
  });

  it.each([
    null,
    {},
    { message: "" },
    { message: "hello", accountId: "not-allowed" },
    { message: "hello", transcript: [] },
    { message: "hello", profile: {} },
  ])("rejects stateful or malformed request %#", async (body) => {
    const model = new FakeModelAdapter({
      generate: [],
      review: [],
    });

    await expect(processLearnerMessage(model, body)).rejects.toMatchObject({
      code: "INVALID_MESSAGE_REQUEST",
    });
    expect(model.calls).toHaveLength(0);
  });
});
