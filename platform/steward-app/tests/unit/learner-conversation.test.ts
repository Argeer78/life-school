import { describe, expect, it } from "vitest";
import { runLearnerConversation } from "../../src/steward/learner-conversation.js";
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

describe("learner-safe conversation boundary", () => {
  it("returns only the accepted learner response", async () => {
    const model = new FakeModelAdapter({
      detectIntent: [reflectionIntent],
      mapConstitution: [constitutionalMapping],
      generate: ["A reviewed response."],
      review: [passingReview],
    });

    const response = await runLearnerConversation(model, "Help me reflect.");

    expect(response).toEqual({
      kind: "accepted",
      text: "A reviewed response.",
      revisions: 0,
    });
    expect(Object.keys(response).sort()).toEqual(["kind", "revisions", "text"]);
    expect("strategySelection" in response).toBe(false);
    expect("behaviorPlanning" in response).toBe(false);
    expect("components" in response).toBe(false);
  });

  it("cannot expose a rejected candidate through the learner-safe result", async () => {
    const model = new FakeModelAdapter({
      detectIntent: [reflectionIntent],
      mapConstitution: [constitutionalMapping],
      generate: ["REJECTED CANDIDATE"],
      review: [
        failingReview({ kind: "principle", id: "ST-BT-007" }),
        passingReview,
      ],
      revise: [
        successfulRevision(
          "The decision remains with the learner; they may examine the options.",
        ),
      ],
    });

    const response = await runLearnerConversation(model, "Choose for me.");

    expect(response.text).not.toContain("REJECTED CANDIDATE");
    expect(response).toEqual({
      kind: "accepted",
      text: "The decision remains with the learner; they may examine the options.",
      revisions: 1,
    });
    expect("inspection" in response).toBe(false);
    expect("strategySelection" in response).toBe(false);
    expect("behaviorPlanning" in response).toBe(false);
    expect("components" in response).toBe(false);
  });
});
