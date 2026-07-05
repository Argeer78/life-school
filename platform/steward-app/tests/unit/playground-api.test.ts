import { describe, expect, it } from "vitest";
import { serializePlaygroundTrace } from "../../src/client/playground-trace.js";
import {
  providerResult,
  type ProviderResult,
} from "../../src/provider/contract.js";
import { createLocalDemoFakeModel } from "../../src/server/local-demo-model.js";
import { processPlaygroundMessage } from "../../src/server/playground-api.js";
import { runConstitutionalConversation } from "../../src/steward/conversation-engine.js";
import { preApprovedFallbacks } from "../../src/steward/fallback.js";
import { FakeModelAdapter } from "../../src/testing/fake-model-adapter.js";
import {
  constitutionalMapping,
  reflectionIntent,
} from "../fixtures/conversation-stage-fixtures.js";

const runtime = {
  provider: "fake",
  model: "local-demo",
} as const;

describe("Steward Playground API", () => {
  it("observes the production pipeline without changing its learner result", async () => {
    const prompt = "Should I make this decision?";
    const baselineModel = createLocalDemoFakeModel(prompt);
    const observedModel = createLocalDemoFakeModel(prompt);

    const baseline = await runConstitutionalConversation(
      baselineModel,
      prompt,
    );
    const playground = await processPlaygroundMessage(
      observedModel,
      { message: prompt },
      runtime,
    );

    expect(playground.learnerResponse).toEqual(baseline.learnerResponse);
    expect(playground.stages.strategySelection).toEqual(
      baseline.inspection.strategySelection,
    );
    expect(playground.stages.behaviorPlanning).toEqual(
      baseline.inspection.behaviorPlanning,
    );
    expect(observedModel.calls).toEqual(baselineModel.calls);
    expect(observedModel.calls).toEqual([
      "intent-detection",
      "constitutional-mapping",
      "response-generation",
      "constitutional-review",
    ]);
    expect(
      baseline.inspection.constitutionalReview.value?.attempts[0]?.review
        .principleResults[0]?.reason,
    ).toBe("The deterministic local response observes this principle.");
    expect(
      playground.stages.constitutionalReview.value?.attempts[0]?.review
        .principleResults[0]?.reason,
    ).toBe("The candidate response observes this principle.");
    expect(
      playground.stages.constitutionalReview.value?.attempts[0]?.review
        .strategyCompliance[0]?.reason,
    ).toBe("The candidate response observes this strategy.");
    expect(
      playground.stages.constitutionalReview.value?.attempts[0]?.review
        .behaviorPlanCompliance[0]?.reason,
    ).toBe("The candidate response observes this behavior.");
    expect(JSON.stringify(playground)).not.toContain(
      "deterministic local response",
    );
  });

  it("exposes every requested stage and run metadata", async () => {
    const prompt = "Help me understand this idea.";
    const model = createLocalDemoFakeModel(prompt);

    const result = await processPlaygroundMessage(
      model,
      { message: prompt },
      runtime,
    );

    expect(result.stages.strategySelection.status).toBe("completed");
    expect(result.stages.behaviorPlanning.status).toBe("completed");
    expect(result.stages.providerRequest).toMatchObject({
      status: "completed",
      value: {
        learnerMessage: prompt,
        providerContractVersion: "PB-001/1.0",
        outputSchemaVersion: "PB-001-OUTPUT/1.0",
      },
    });
    expect(result.stages.providerResponse.status).toBe("completed");
    expect(result.stages.providerValidation).toEqual({
      status: "completed",
      value: {
        valid: true,
        schemaVersion: "PB-001-OUTPUT/1.0",
      },
      error: null,
    });
    expect(result.stages.constitutionalReview.status).toBe("completed");
    expect(result.stages.revision.record.status).toBe("not-required");
    expect(result.stages.fallback.used).toBe(false);
    expect(result.metadata).toMatchObject({
      provider: "fake",
      model: "local-demo",
      revisionCount: 0,
      fallbackStatus: "not-used",
      reviewResult: "APPROVED",
      tokenCounts: null,
    });
    expect(result.metadata.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("reports stable PB failure data without reflecting invalid provider output", async () => {
    const invalidProviderResult = {
      ...providerResult("INVALID PROVIDER CANDIDATE"),
      unexpected: "must not cross the Playground API",
    } as ProviderResult;
    const model = new FakeModelAdapter({
      detectIntent: [reflectionIntent],
      mapConstitution: [constitutionalMapping],
      generate: [invalidProviderResult],
      review: [],
    });

    const result = await processPlaygroundMessage(
      model,
      { message: "Help me examine this." },
      runtime,
    );
    const serialized = JSON.stringify(result);

    expect(result.stages.providerRequest.status).toBe("completed");
    expect(result.stages.providerResponse).toEqual({
      status: "failed",
      value: null,
      error: { code: "PROVIDER_OBSERVATION_UNAVAILABLE" },
    });
    expect(result.stages.providerValidation).toEqual({
      status: "failed",
      value: null,
      error: { providerFailure: "PB-FAIL-004" },
    });
    expect(result.learnerResponse).toEqual({
      kind: "fallback",
      text: preApprovedFallbacks.TECHNICAL_LIMITATION.text,
      revisions: 0,
    });
    expect(serialized).not.toContain("INVALID PROVIDER CANDIDATE");
    expect(serialized).not.toContain("must not cross the Playground API");
    expect(model.reviewRequests).toHaveLength(0);
  });

  it("rejects stateful or malformed Playground requests before execution", async () => {
    const model = createLocalDemoFakeModel("Hello");

    await expect(
      processPlaygroundMessage(
        model,
        { message: "Hello", history: [] },
        runtime,
      ),
    ).rejects.toMatchObject({ code: "INVALID_MESSAGE_REQUEST" });
    expect(model.calls).toHaveLength(0);
  });

  it("serializes the full privileged result and final response for copying", async () => {
    const prompt = "Help me examine this.";
    const result = await processPlaygroundMessage(
      createLocalDemoFakeModel(prompt),
      { message: prompt },
      runtime,
    );

    const copied = JSON.parse(serializePlaygroundTrace(result)) as {
      learnerResponse: unknown;
      stages: Record<string, unknown>;
      metadata: unknown;
    };

    expect(copied.learnerResponse).toEqual(result.learnerResponse);
    expect(copied.stages).toEqual(result.stages);
    expect(copied.metadata).toEqual(result.metadata);
    expect(copied.stages).toHaveProperty("constitutionalReview");
    expect(copied.stages).toHaveProperty("providerRequest");
  });
});
