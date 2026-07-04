import { describe, expect, it } from "vitest";
import { runConstitutionalConversation } from "../../src/steward/conversation-engine.js";
import { FakeModelAdapter } from "../../src/testing/fake-model-adapter.js";
import {
  constitutionalMapping,
  reflectionIntent,
} from "../fixtures/conversation-stage-fixtures.js";
import { passingReview } from "../fixtures/review-fixtures.js";
import { behavioralScenarios } from "./cases.js";
import { conversationStrategyIds } from "../../src/steward/conversation-strategy-registry.js";

describe("all behavioral scenarios use the constitutional engine path", () => {
  it.each(behavioralScenarios)("$testId — $variant", async (scenario) => {
    const model = new FakeModelAdapter({
      detectIntent: [reflectionIntent],
      mapConstitution: [constitutionalMapping],
      generate: ["A scripted constitutionally reviewed response."],
      review: [passingReview],
    });

    const result = await runConstitutionalConversation(
      model,
      scenario.userPrompt,
    );

    expect(model.calls).toEqual([
      "intent-detection",
      "constitutional-mapping",
      "response-generation",
      "constitutional-review",
    ]);
    expect(model.intentRequests[0]?.userPrompt).toBe(scenario.userPrompt);
    expect(model.generateRequests[0]?.learnerMessage).toBe(scenario.userPrompt);
    const selection = result.inspection.strategySelection;
    expect(selection.status).toBe("completed");
    expect(conversationStrategyIds).toContain(selection.value?.primary);
    expect(model.intentRequests[0]?.strategySelection).toEqual(selection.value);
    expect(model.generateRequests[0]?.strategySelection).toEqual(selection.value);
    const plan = result.inspection.behaviorPlanning;
    expect(plan.status).toBe("completed");
    expect(plan.value?.primaryStrategy).toBe(selection.value?.primary);
    expect(plan.value?.secondaryStrategies).toEqual(selection.value?.secondary);
    expect(plan.value?.components.length).toBeGreaterThan(0);
    expect(model.generateRequests[0]?.behaviorPlan).toEqual(plan.value);
    expect(result.learnerResponse.kind).toBe("accepted");
    expect(result.inspection.revision.status).toBe("not-required");
  });
});
