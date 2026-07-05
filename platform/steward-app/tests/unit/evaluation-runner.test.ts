import { describe, expect, it } from "vitest";
import { loadEvaluationFixtures } from "../../src/evaluation/fixtures.js";
import {
  runEvaluationCertification,
  runEvaluationConversation,
} from "../../src/evaluation/runner.js";
import type {
  EvaluationConversationFixture,
  EvaluationRuntime,
} from "../../src/evaluation/types.js";
import { createLocalDemoFakeModel } from "../../src/server/local-demo-model.js";
import { runConstitutionalConversation } from "../../src/steward/conversation-engine.js";
import type { FakeModelAdapter } from "../../src/testing/fake-model-adapter.js";

function localRuntime(models: FakeModelAdapter[] = []): EvaluationRuntime {
  return {
    provider: "fake",
    model: "local-demo",
    createModel: (conversation) => {
      const model = createLocalDemoFakeModel(conversation.learnerPrompt);
      models.push(model);
      return model;
    },
  };
}

async function firstConversation(): Promise<EvaluationConversationFixture> {
  const conversation = (await loadEvaluationFixtures())[0]?.conversations[0];
  if (conversation === undefined) {
    throw new TypeError("EW-001-001 fixture is unavailable.");
  }
  return conversation;
}

describe("canonical evaluation runner", () => {
  it("delegates execution to the unchanged production pipeline", async () => {
    const fixture = await firstConversation();
    const models: FakeModelAdapter[] = [];
    const result = await runEvaluationConversation(
      fixture,
      localRuntime(models),
      { developerMode: true },
    );

    expect(models).toHaveLength(1);
    expect(models[0]?.calls).toEqual([
      "intent-detection",
      "constitutional-mapping",
      "response-generation",
      "constitutional-review",
    ]);
    expect(result.finalResponse.kind).toBe("accepted");
    expect(result.status).toBe("UNSCORED");
    expect(result.humanScore).toBeNull();
    expect(result.developerTrace.strategySelection.primary).toBe("CS-001");
    expect(result.developerTrace.reviewResult).toBe("APPROVED");
    expect(result.developerTrace.fallback.used).toBe(false);
  });

  it("returns safe results by default and privileged summaries only in developer mode", async () => {
    const fixture = await firstConversation();
    const safe = await runEvaluationConversation(fixture, localRuntime());
    const developer = await runEvaluationConversation(
      fixture,
      localRuntime(),
      { developerMode: true },
    );
    const safeSerialized = JSON.stringify(safe);

    expect(Object.keys(safe).sort()).toEqual([
      "durationMs",
      "finalResponse",
      "humanScore",
      "id",
      "learnerPrompt",
      "model",
      "provider",
      "status",
    ]);
    expect(safeSerialized).not.toMatch(
      /developerTrace|strategySelection|reviewResult|fallback|principleResults|candidate|inspection/,
    );
    expect(developer).toHaveProperty("developerTrace.strategySelection");
    expect(developer).toHaveProperty("developerTrace.reviewResult");
    expect(developer).toHaveProperty("developerTrace.fallback");
    expect(JSON.stringify(developer)).not.toMatch(
      /principleResults|behaviorPlanCompliance|revisionSummary|rawError|internalPrompt/,
    );
  });

  it("does not change learner output or constitutional stage results", async () => {
    const fixture = await firstConversation();
    const baselineModel = createLocalDemoFakeModel(fixture.learnerPrompt);
    const baseline = await runConstitutionalConversation(
      baselineModel,
      fixture.learnerPrompt,
    );
    const runnerModels: FakeModelAdapter[] = [];
    const evaluated = await runEvaluationConversation(
      fixture,
      localRuntime(runnerModels),
      { developerMode: true },
    );

    expect(evaluated.finalResponse).toEqual(baseline.learnerResponse);
    expect(evaluated.developerTrace.strategySelection).toEqual(
      baseline.inspection.strategySelection.value,
    );
    expect(evaluated.developerTrace.reviewResult).toBe(
      baseline.inspection.constitutionalReview.value?.attempts.at(-1)?.review
        .outcome,
    );
    expect(runnerModels[0]?.calls).toEqual(baselineModel.calls);
  });

  it("executes all fixtures without inventing automatic scores", async () => {
    const fixtures = await loadEvaluationFixtures();
    const result = await runEvaluationCertification(
      fixtures,
      localRuntime(),
      { developerMode: true },
    );

    expect(result.totalSets).toBe(12);
    expect(result.totalConversations).toBe(72);
    expect(result.status).toBe("UNSCORED");
    expect(result.setsUnscored).toBe(12);
    expect(result.conversationsUnscored).toBe(72);
    expect(result.setsPassed).toBe(0);
    expect(result.conversationsPassed).toBe(0);
    expect(
      result.sets.every((set) =>
        set.conversations.every(
          (conversation) =>
            conversation.humanScore === null &&
            conversation.status === "UNSCORED",
        ),
      ),
    ).toBe(true);
  });
});
