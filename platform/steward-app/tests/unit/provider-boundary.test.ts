import { describe, expect, it } from "vitest";
import {
  maximumProviderResponseCharacters,
  providerOutputSchemaVersion,
  providerResult,
} from "../../src/provider/contract.js";
import { ProviderBoundaryError } from "../../src/provider/failure.js";
import { buildProviderInput } from "../../src/provider/prompt-builder.js";
import { validateProviderResult } from "../../src/provider/validation.js";
import { runConstitutionalConversation } from "../../src/steward/conversation-engine.js";
import { preApprovedFallbacks } from "../../src/steward/fallback.js";
import { FakeModelAdapter } from "../../src/testing/fake-model-adapter.js";
import {
  constitutionalMapping,
  reflectionIntent,
} from "../fixtures/conversation-stage-fixtures.js";
import { passingReview } from "../fixtures/review-fixtures.js";

function model(generated: unknown): FakeModelAdapter {
  return new FakeModelAdapter({
    detectIntent: [reflectionIntent],
    mapConstitution: [constitutionalMapping],
    generate: [generated],
    review: [passingReview],
  });
}

function invalidOutput(changes: Record<string, unknown> = {}) {
  return {
    ...providerResult("A valid provider response."),
    ...changes,
  };
}

describe("Phase 2 provider boundary", () => {
  it("sends only the closed seven-field GenerationRequest to the provider", async () => {
    const adapter = model("A learner-facing response.");
    const conversation = [
      { role: "learner" as const, content: "Earlier question" },
      { role: "steward" as const, content: "Earlier response" },
    ];
    const result = await runConstitutionalConversation(
      adapter,
      "Help me examine this.",
      conversation,
    );
    const request = adapter.generateRequests[0];

    expect(result.learnerResponse.kind).toBe("accepted");
    expect(Object.keys(request ?? {}).sort()).toEqual([
      "behaviorPlan",
      "constitutionalConstraints",
      "currentConversation",
      "learnerMessage",
      "outputSchemaVersion",
      "providerContractVersion",
      "strategySelection",
    ]);
    expect(request?.currentConversation).toEqual(conversation);
    expect(request?.providerContractVersion).toBe("PB-001/1.0");
    expect(request?.outputSchemaVersion).toBe("PB-001-OUTPUT/1.0");
  });

  it("does not send privileged audit or future-pipeline data", async () => {
    const adapter = model("A learner-facing response.");
    await runConstitutionalConversation(adapter, "Help me examine this.");

    const serialized = JSON.stringify(adapter.generateRequests[0]);
    expect(serialized).not.toMatch(
      /principleResults|reviewRequirement|correctedViolations|revisionSummary|candidate|inspection|fallback|rawError|internalPrompt/,
    );
    expect(adapter.generateRequests[0]).not.toHaveProperty("intent");
    expect(adapter.generateRequests[0]).not.toHaveProperty("mapping");
    expect(adapter.generateRequests[0]).not.toHaveProperty("review");
    expect(adapter.generateRequests[0]).not.toHaveProperty("revision");
  });

  it("builds provider input only from supplied generation decisions", async () => {
    const adapter = model("A learner-facing response.");
    await runConstitutionalConversation(adapter, "Help me examine this.");
    const request = adapter.generateRequests[0]!;
    const input = buildProviderInput(request);

    expect(input.suppliedContext.strategySelection).toBe(
      request.strategySelection,
    );
    expect(input.suppliedContext.behaviorPlan).toBe(request.behaviorPlan);
    expect(input.suppliedContext.constitutionalConstraints).toBe(
      request.constitutionalConstraints,
    );
    expect(input.messages.at(-1)).toEqual({
      role: "learner",
      content: request.learnerMessage,
    });
    expect(input).not.toHaveProperty("review");
    expect(input).not.toHaveProperty("revision");
    expect(input).not.toHaveProperty("fallback");
  });

  it.each([
    ["malformed JSON", "{not-json", "PB-FAIL-003"],
    ["non-object output", [], "PB-FAIL-003"],
    [
      "missing field",
      {
        response: "text",
        confidence: 1,
        uncertainty: false,
        refusal: false,
        notes: [],
      },
      "PB-FAIL-004",
    ],
    [
      "unexpected field",
      invalidOutput({ extra: "not allowed" }),
      "PB-FAIL-004",
    ],
    [
      "reasoning field",
      invalidOutput({ reasoning: "hidden chain of thought" }),
      "PB-FAIL-004",
    ],
    [
      "reasoning content",
      invalidOutput({ response: "My chain of thought is hidden." }),
      "PB-FAIL-004",
    ],
    [
      "oversized response",
      invalidOutput({
        response: "x".repeat(maximumProviderResponseCharacters + 1),
      }),
      "PB-FAIL-004",
    ],
    [
      "invalid schema version",
      invalidOutput({ schemaVersion: "unsupported" }),
      "PB-FAIL-004",
    ],
  ])("rejects %s", (_name, output, category) => {
    try {
      validateProviderResult(output, providerOutputSchemaVersion);
      throw new Error("Expected provider validation to fail.");
    } catch (error) {
      expect(error).toBeInstanceOf(ProviderBoundaryError);
      expect((error as ProviderBoundaryError).category).toBe(category);
    }
  });

  it.each([
    [
      "schema violation",
      invalidOutput({ reasoning: "forbidden" }),
      "PB-FAIL-004",
    ],
    [
      "provider refusal",
      invalidOutput({ refusal: true, response: "" }),
      "PB-FAIL-005",
    ],
    [
      "connection failure",
      new ProviderBoundaryError("PB-FAIL-001", "CONNECTION_FAILURE"),
      "PB-FAIL-001",
    ],
    ["internal provider error", new Error("provider secret"), "PB-FAIL-006"],
  ])(
    "routes %s through EN-005",
    async (_name, generated, expectedCategory) => {
      const adapter = model(generated);
      const result = await runConstitutionalConversation(
        adapter,
        "Help me examine this.",
      );

      expect(adapter.reviewRequests).toHaveLength(0);
      expect(result.inspection.responseGeneration).toMatchObject({
        status: "failed",
        error: {
          code: "RESPONSE_GENERATION_ERROR",
          providerFailure: expectedCategory,
        },
      });
      expect(result.inspection.fallback).toMatchObject({
        used: true,
        reason: "response-generation-failed",
        category: "TECHNICAL_LIMITATION",
      });
      expect(result.learnerResponse).toEqual({
        kind: "fallback",
        text: preApprovedFallbacks.TECHNICAL_LIMITATION.text,
        revisions: 0,
      });
      expect(JSON.stringify(result.learnerResponse)).not.toMatch(
        /provider secret|PB-FAIL|reasoning|schema/i,
      );
    },
  );

  it("accepts the versioned structured fake-provider result", () => {
    expect(
      validateProviderResult(
        providerResult("A learner-facing response."),
        providerOutputSchemaVersion,
      ),
    ).toEqual(providerResult("A learner-facing response."));
  });

  it("accepts a negative reasoning attestation without treating it as leaked reasoning", () => {
    const output = invalidOutput({
      notes: ["Did not include chain-of-thought or internal reasoning."],
    });

    expect(
      validateProviderResult(output, providerOutputSchemaVersion),
    ).toEqual(output);
  });

  it("still rejects actual reasoning content in provider notes", () => {
    const output = invalidOutput({
      notes: ["Internal reasoning: first infer the hidden motive."],
    });

    expect(() =>
      validateProviderResult(output, providerOutputSchemaVersion),
    ).toThrowError(
      expect.objectContaining({
        category: "PB-FAIL-004",
        auditCode: "PROHIBITED_PROVIDER_CONTENT",
      }),
    );
  });

  it("uses the pre-approved safety fallback when a CS-006 provider output fails", async () => {
    const adapter = model(
      invalidOutput({ reasoning: "forbidden provider field" }),
    );
    const result = await runConstitutionalConversation(
      adapter,
      "I don't think life is worth living anymore.",
    );

    expect(result.inspection.strategySelection.value?.primary).toBe("CS-006");
    expect(result.inspection.fallback).toMatchObject({
      used: true,
      reason: "response-generation-failed",
      category: "SAFETY",
    });
    expect(result.learnerResponse.text).toBe(preApprovedFallbacks.SAFETY.text);
  });
});
