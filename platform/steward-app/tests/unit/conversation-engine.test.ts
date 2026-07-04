import { describe, expect, it } from "vitest";
import { preApprovedFallbacks } from "../../src/steward/fallback.js";
import { runConstitutionalConversation } from "../../src/steward/conversation-engine.js";
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

const principleFailure = failingReview({
  kind: "principle",
  id: "ST-BT-007",
});

function script(
  overrides: Partial<ConstructorParameters<typeof FakeModelAdapter>[0]> = {},
): ConstructorParameters<typeof FakeModelAdapter>[0] {
  return {
    detectIntent: [reflectionIntent],
    mapConstitution: [constitutionalMapping],
    generate: ["What do you notice happens just before you avoid the work?"],
    review: [passingReview],
    ...overrides,
  };
}

describe("constitutional conversation engine", () => {
  it("passes a message through every required stage in order", async () => {
    const model = new FakeModelAdapter(script());

    const result = await runConstitutionalConversation(
      model,
      "Why do I avoid work that matters to me?",
    );

    expect(model.calls).toEqual([
      "intent-detection",
      "constitutional-mapping",
      "response-generation",
      "constitutional-review",
    ]);
    expect(result.learnerResponse).toEqual({
      kind: "accepted",
      text: "What do you notice happens just before you avoid the work?",
      revisions: 0,
    });
    expect(result.inspection.strategySelection.status).toBe("completed");
    expect(result.inspection.strategySelection.value?.primary).toBe("CS-009");
    expect(result.inspection.intentDetection).toEqual({
      status: "completed",
      value: reflectionIntent,
      error: null,
    });
    expect(result.inspection.constitutionalMapping.value).toEqual(
      constitutionalMapping,
    );
    expect(result.inspection.behaviorPlanning.status).toBe("completed");
    expect(
      result.inspection.behaviorPlanning.value?.components.length,
    ).toBeGreaterThan(0);
    expect(result.inspection.responseGeneration.value).toEqual({
      candidate: "What do you notice happens just before you avoid the work?",
    });
    expect(result.inspection.constitutionalReview.value?.attempts).toHaveLength(1);
    expect(result.inspection.revision.status).toBe("not-required");
    expect(result.inspection.fallback).toEqual({
      used: false,
      reason: null,
      category: null,
      approvalId: null,
      approvalStatus: null,
    });
  });

  it("passes each structured output into the next model request", async () => {
    const model = new FakeModelAdapter(script());
    const userPrompt = "Help me reflect.";

    const result = await runConstitutionalConversation(model, userPrompt);
    const strategySelection = result.inspection.strategySelection.value;
    expect(strategySelection).not.toBeNull();

    expect(model.mappingRequests[0]).toEqual({
      userPrompt,
      strategySelection,
      intent: reflectionIntent,
    });
    const plan = result.inspection.behaviorPlanning.value;
    expect(plan).not.toBeNull();
    expect(model.generateRequests[0]).toEqual({
      learnerMessage: userPrompt,
      currentConversation: [],
      strategySelection,
      behaviorPlan: plan,
      constitutionalConstraints: {
        references: constitutionalMapping.references,
        protections: constitutionalMapping.protections,
        limits: constitutionalMapping.limits,
      },
      providerContractVersion: "PB-001/1.0",
      outputSchemaVersion: "PB-001-OUTPUT/1.0",
    });
  });

  it("exposes the rejected candidate, revision, and both reviews for inspection", async () => {
    const model = new FakeModelAdapter(
      script({
        generate: ["Quit your job."],
        review: [principleFailure, passingReview],
        revise: [
          successfulRevision(
            "The decision about quitting your job remains yours; we can examine your reasons and options.",
          ),
        ],
      }),
    );

    const result = await runConstitutionalConversation(
      model,
      "Choose whether I should quit my job.",
    );

    expect(model.calls).toEqual([
      "intent-detection",
      "constitutional-mapping",
      "response-generation",
      "constitutional-review",
      "revision",
      "constitutional-review",
    ]);
    expect(result.learnerResponse).toEqual({
      kind: "accepted",
      text: "The decision about quitting your job remains yours; we can examine your reasons and options.",
      revisions: 1,
    });
    expect(result.inspection.responseGeneration.value?.candidate).toBe(
      "Quit your job.",
    );
    expect(result.inspection.revision.value?.revisedResponse).toContain(
      "decision about quitting your job remains yours",
    );
    const attempts = result.inspection.constitutionalReview.value?.attempts;
    expect(attempts).toHaveLength(2);
    expect(attempts?.[0]).toMatchObject({
      target: "candidate",
      response: "Quit your job.",
      review: { outcome: "REVISION_REQUIRED" },
    });
    expect(attempts?.[1]).toMatchObject({
      target: "revision",
      response:
        "The decision about quitting your job remains yours; we can examine your reasons and options.",
      review: { outcome: "APPROVED" },
    });
  });

  it("never attempts a second revision and falls back after revision review fails", async () => {
    const model = new FakeModelAdapter(
      script({
        generate: ["Quit your job."],
        review: [principleFailure, principleFailure, passingReview],
        revise: [
          successfulRevision(
            "The decision about staying in your job remains yours; examine the options.",
          ),
          successfulRevision("A forbidden second revision."),
        ],
      }),
    );

    const result = await runConstitutionalConversation(
      model,
      "Choose whether I should quit.",
    );

    expect(model.reviseRequests).toHaveLength(1);
    expect(model.reviewRequests).toHaveLength(2);
    expect(result.learnerResponse).toEqual({
      kind: "fallback",
      text: preApprovedFallbacks.REVIEW_REJECTION.text,
      revisions: 1,
    });
    expect(result.inspection.fallback).toEqual({
      used: true,
      reason: "revision-review-failed",
      category: "REVIEW_REJECTION",
      approvalId: "EN-005-FB-005",
      approvalStatus: "PRE_APPROVED",
    });
  });

  it("falls back with the failed revision exposed when revision generation fails", async () => {
    const model = new FakeModelAdapter(
      script({
        generate: ["Quit your job."],
        review: [principleFailure],
        revise: [new Error("scripted revision failure")],
      }),
    );

    const result = await runConstitutionalConversation(model, "Choose for me.");

    expect(model.reviseRequests).toHaveLength(1);
    expect(result.inspection.revision.status).toBe("failed");
    expect(result.inspection.revision.error).toEqual({
      code: "REVISION_ERROR",
    });
    expect(result.inspection.fallback.reason).toBe("revision-failed");
  });

  it("preserves the first review when the revised response review is malformed", async () => {
    const model = new FakeModelAdapter(
      script({
        generate: ["Quit your job."],
        review: [principleFailure, { outcome: "APPROVED" }],
        revise: [
          successfulRevision(
            "The choice about the job remains yours; we can examine the options.",
          ),
        ],
      }),
    );

    const result = await runConstitutionalConversation(model, "Choose for me.");

    expect(result.inspection.constitutionalReview.status).toBe("failed");
    expect(result.inspection.constitutionalReview.value?.attempts).toHaveLength(1);
    expect(result.inspection.constitutionalReview.value?.attempts[0]?.review).toEqual(
      expect.objectContaining({ outcome: "REVISION_REQUIRED" }),
    );
    expect(result.inspection.fallback.reason).toBe("revision-review-invalid");
  });

  it("exposes a failed stage and marks later stages skipped before fallback", async () => {
    const model = new FakeModelAdapter(
      script({ detectIntent: [{ intent: "invented" }] }),
    );

    const result = await runConstitutionalConversation(model, "A prompt");

    expect(model.calls).toEqual(["intent-detection"]);
    expect(result.inspection.strategySelection.status).toBe("completed");
    expect(result.inspection.intentDetection.status).toBe("failed");
    expect(result.inspection.intentDetection.error).toEqual({
      code: "INTENT_DETECTION_ERROR",
    });
    expect(result.inspection.constitutionalMapping.status).toBe("skipped");
    expect(result.inspection.behaviorPlanning.status).toBe("skipped");
    expect(result.inspection.responseGeneration.status).toBe("skipped");
    expect(result.inspection.constitutionalReview.status).toBe("skipped");
    expect(result.inspection.revision.status).toBe("skipped");
    expect(result.inspection.fallback).toEqual({
      used: true,
      reason: "intent-detection-failed",
      category: "TECHNICAL_LIMITATION",
      approvalId: "EN-005-FB-004",
      approvalStatus: "PRE_APPROVED",
    });
  });

  it.each([
    {
      name: "constitutional mapping",
      overrides: { mapConstitution: [new Error("mapping unavailable")] },
      reason: "constitutional-mapping-failed",
      calls: ["intent-detection", "constitutional-mapping"],
    },
    {
      name: "response generation",
      overrides: { generate: [""] },
      reason: "response-generation-failed",
      calls: [
        "intent-detection",
        "constitutional-mapping",
        "response-generation",
      ],
    },
    {
      name: "constitutional review",
      overrides: { review: [{ passes: false, findings: [] }] },
      reason: "constitutional-review-failed",
      calls: [
        "intent-detection",
        "constitutional-mapping",
        "response-generation",
        "constitutional-review",
      ],
    },
  ])("falls back with an inspectable reason when $name fails", async ({
    overrides,
    reason,
    calls,
  }) => {
    const model = new FakeModelAdapter(script(overrides));
    const result = await runConstitutionalConversation(model, "A prompt");

    expect(model.calls).toEqual(calls);
    expect(result.learnerResponse.kind).toBe("fallback");
    expect(result.inspection.strategySelection.status).toBe("completed");
    expect(result.inspection.fallback).toEqual({
      used: true,
      reason,
      category: "TECHNICAL_LIMITATION",
      approvalId: "EN-005-FB-004",
      approvalStatus: "PRE_APPROVED",
    });
  });
});
