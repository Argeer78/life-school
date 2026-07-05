import { describe, expect, it } from "vitest";
import { loadEvaluationFixtures } from "../../src/evaluation/fixtures.js";
import type { EvaluationRuntime } from "../../src/evaluation/types.js";
import {
  benchmarkSetSummaries,
  processBenchmarkRun,
} from "../../src/server/benchmark-api.js";
import { createLocalDemoFakeModel } from "../../src/server/local-demo-model.js";
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

describe("Steward Certification Dashboard foundation", () => {
  it("represents all 12 sets and 72 canonical conversations", async () => {
    const fixtures = await loadEvaluationFixtures();
    const summaries = benchmarkSetSummaries(fixtures);

    expect(summaries).toHaveLength(12);
    expect(
      summaries.reduce(
        (total, { totalConversations }) => total + totalConversations,
        0,
      ),
    ).toBe(72);
  });

  it("executes certification through the canonical production runner", async () => {
    const fixtures = await loadEvaluationFixtures();
    const models: FakeModelAdapter[] = [];
    const result = await processBenchmarkRun(
      fixtures,
      localRuntime(models),
      { scope: "all", developerMode: true },
    );

    expect(result.sets).toHaveLength(12);
    expect(
      result.sets.flatMap(({ conversations }) => conversations),
    ).toHaveLength(72);
    expect(models).toHaveLength(72);
    expect(models.every(({ calls }) =>
      calls.includes("response-generation") &&
      calls.includes("constitutional-review")
    )).toBe(true);
  });

  it("does not invent automatic PASS or FAIL certification", async () => {
    const fixtures = await loadEvaluationFixtures();
    const result = await processBenchmarkRun(fixtures, localRuntime(), {
      scope: "all",
      developerMode: false,
    });
    const conversations = result.sets.flatMap(
      ({ conversations: setConversations }) => setConversations,
    );

    expect(result.status).toBe("UNSCORED");
    expect(result.sets.every(({ status }) => status === "UNSCORED")).toBe(true);
    expect(
      conversations.every(
        ({ status, humanScore }) =>
          status === "UNSCORED" && humanScore === null,
      ),
    ).toBe(true);
  });

  it("hides privileged summaries in safe mode and exposes them in developer mode", async () => {
    const fixtures = await loadEvaluationFixtures();
    const safe = await processBenchmarkRun(fixtures, localRuntime(), {
      scope: "all",
      developerMode: false,
    });
    const developer = await processBenchmarkRun(fixtures, localRuntime(), {
      scope: "all",
      developerMode: true,
    });
    const safeConversation = safe.sets[0]?.conversations[0];
    const developerConversation = developer.sets[0]?.conversations[0];

    expect(safeConversation).not.toHaveProperty("developerTrace");
    expect(JSON.stringify(safeConversation)).not.toMatch(
      /strategySelection|reviewResult|fallback/,
    );
    expect(developerConversation).toHaveProperty(
      "developerTrace.strategySelection",
    );
    expect(developerConversation).toHaveProperty(
      "developerTrace.reviewResult",
    );
    expect(developerConversation).toHaveProperty("developerTrace.fallback");
  });
});
