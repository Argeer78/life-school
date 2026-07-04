import { describe, expect, it } from "vitest";
import type { ReviewRequest } from "../../src/model/client.js";
import { runConstitutionalConversation } from "../../src/steward/conversation-engine.js";
import { hasUnexpectedLanguageMixing } from "../../src/steward/language-consistency.js";
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

function modelWithReview(review: unknown) {
  return new FakeModelAdapter({
    detectIntent: [reflectionIntent],
    mapConstitution: [constitutionalMapping],
    generate: ["REJECTED CANDIDATE"],
    review: [review],
  });
}

describe("EN-003 Constitutional Review Engine", () => {
  it("delivers a candidate only after an explicit APPROVED outcome", async () => {
    const result = await runConstitutionalConversation(
      modelWithReview(passingReview),
      "Help me examine this experience.",
    );

    expect(result.learnerResponse).toEqual({
      kind: "accepted",
      text: "REJECTED CANDIDATE",
      revisions: 0,
    });
    expect(
      result.inspection.constitutionalReview.value?.attempts[0]?.review.outcome,
    ).toBe("APPROVED");
  });

  it("fails review when a selected strategy requirement is violated", async () => {
    const model = modelWithReview((request: ReviewRequest) =>
      failingReview({
        kind: "strategy",
        id: request.strategySelection.primary,
      })(request),
    );
    const result = await runConstitutionalConversation(
      model,
      "Help me examine this experience.",
    );

    expect(
      result.inspection.constitutionalReview.value?.attempts[0]?.review.outcome,
    ).toBe("REVISION_REQUIRED");
    expect(result.learnerResponse.text).not.toContain("REJECTED CANDIDATE");
  });

  it("fails review when a required behavior component is missing", async () => {
    const model = modelWithReview((request: ReviewRequest) =>
      failingReview({
        kind: "behavior",
        id: request.plan.components[0]!.id,
      })(request),
    );
    const result = await runConstitutionalConversation(
      model,
      "Help me examine this experience.",
    );

    const review =
      result.inspection.constitutionalReview.value?.attempts[0]?.review;
    expect(review?.outcome).toBe("REVISION_REQUIRED");
    expect(review?.behaviorPlanCompliance.some(({ passes }) => !passes)).toBe(
      true,
    );
    expect(result.learnerResponse.text).not.toContain("REJECTED CANDIDATE");
  });

  it("rejects a harm or safety violation without attempting revision", async () => {
    const model = modelWithReview(
      failingReview({ kind: "harm-safety" }, "REJECTED"),
    );
    const result = await runConstitutionalConversation(
      model,
      "I want to hurt someone.",
    );

    expect(model.reviseRequests).toHaveLength(0);
    expect(
      result.inspection.constitutionalReview.value?.attempts[0]?.review
        .harmSafety.passes,
    ).toBe(false);
    expect(result.inspection.fallback.reason).toBe(
      "constitutional-review-rejected",
    );
    expect(result.inspection.fallback.category).toBe("SAFETY");
    expect(result.inspection.fallback.approvalStatus).toBe("PRE_APPROVED");
    expect(result.learnerResponse.text).not.toContain("REJECTED CANDIDATE");
  });

  it("is deterministic with identical fake review inputs", async () => {
    const first = await runConstitutionalConversation(
      modelWithReview(passingReview),
      "Help me examine this experience.",
    );
    const second = await runConstitutionalConversation(
      modelWithReview(passingReview),
      "Help me examine this experience.",
    );

    expect(first).toEqual(second);
  });

  it("requires revision for unintended mixed-language leakage in an English response", async () => {
    const prompt = "Do you think my boss secretly hates me?";
    const contaminated =
      "It makes sense to feel concerned, but the reason may be uncertain. Examine the specific конкретные behaviors in this work relationship and consider whether another explanation fits; your judgment remains yours.";
    const revised =
      "It makes sense to feel concerned, but the reason may be uncertain. Examine the specific behaviors in this work relationship and consider whether another explanation fits; your judgment remains yours.";
    const model = new FakeModelAdapter({
      detectIntent: [reflectionIntent],
      mapConstitution: [constitutionalMapping],
      generate: [contaminated],
      review: [passingReview, passingReview],
      revise: [
        successfulRevision(
          revised,
          "Removed unintended mixed-language wording to improve conversational clarity.",
        ),
      ],
    });

    const result = await runConstitutionalConversation(model, prompt);

    expect(
      result.inspection.constitutionalReview.value?.attempts[0]?.review.outcome,
    ).toBe("REVISION_REQUIRED");
    expect(result.inspection.revision.status).toBe("completed");
    expect(result.learnerResponse).toEqual({
      kind: "accepted",
      text: revised,
      revisions: 1,
    });
    expect(result.learnerResponse.text).not.toContain("конкретные");
  });

  it("does not treat a non-English learner conversation as unintended mixing", () => {
    expect(
      hasUnexpectedLanguageMixing(
        "Почему мой начальник так поступает?",
        "Причина пока неизвестна, поэтому стоит проверить наблюдаемые факты.",
      ),
    ).toBe(false);
  });

  it.each([
    "Your purpose is something you get to examine, not something I can assign for you.",
    "Your purpose isn't something I can determine.",
    "I can't tell you what your purpose is.",
  ])(
    "approves purpose language that preserves learner authorship: %s",
    async (candidate) => {
      const model = new FakeModelAdapter({
        detectIntent: [reflectionIntent],
        mapConstitution: [constitutionalMapping],
        generate: [candidate],
        review: [passingReview],
      });

      const result = await runConstitutionalConversation(
        model,
        "Why am I here?",
      );
      const review =
        result.inspection.constitutionalReview.value?.attempts[0]?.review;

      expect(review?.outcome).toBe("APPROVED");
      expect(
        review?.principleResults.find(({ testId }) => testId === "ST-BT-004")
          ?.passes,
      ).toBe(true);
      expect(result.inspection.revision.status).toBe("not-required");
      expect(result.inspection.fallback.used).toBe(false);
      expect(result.learnerResponse.text).toBe(candidate);
    },
  );

  it("requires and completes one revision for direct purpose assignment", async () => {
    const candidate = "Your purpose is to help others.";
    const revised =
      "Your experience is yours, and your purpose remains yours to examine. Consider a value and responsibility.";
    const model = new FakeModelAdapter({
      detectIntent: [reflectionIntent],
      mapConstitution: [constitutionalMapping],
      generate: [candidate],
      review: [passingReview, passingReview],
      revise: [successfulRevision(revised)],
    });

    const result = await runConstitutionalConversation(
      model,
      "What is my purpose?",
    );
    const attempts = result.inspection.constitutionalReview.value?.attempts;

    expect(attempts?.[0]?.review.outcome).toBe("REVISION_REQUIRED");
    expect(
      attempts?.[0]?.review.principleResults.find(
        ({ testId }) => testId === "ST-BT-004",
      ),
    ).toMatchObject({
      passes: false,
      reason:
        "The response assigns purpose to the learner and replaces learner authorship.",
    });
    expect(model.reviseRequests).toHaveLength(1);
    expect(attempts?.[1]?.review.outcome).toBe("APPROVED");
    expect(result.inspection.revision.status).toBe("completed");
    expect(result.inspection.fallback.used).toBe(false);
    expect(result.learnerResponse).toEqual({
      kind: "accepted",
      text: revised,
      revisions: 1,
    });
  });
});
