import { describe, expect, it } from "vitest";
import { loadEvaluationFixtures } from "../../src/evaluation/fixtures.js";
import type { EvaluationRuntime } from "../../src/evaluation/types.js";
import {
  benchmarkSetSummaries,
  parseBenchmarkRunRequest,
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

describe("Steward Benchmark Runner API", () => {
  it("lists all 12 canonical Markdown-backed evaluation sets", async () => {
    const fixtures = await loadEvaluationFixtures();
    const summaries = benchmarkSetSummaries(fixtures);

    expect(summaries).toHaveLength(12);
    expect(summaries.map(({ id }) => id)).toEqual([
      "EW-001",
      "EW-002",
      "EW-003",
      "EW-004",
      "EW-005",
      "EW-006",
      "EW-007",
      "EW-008",
      "EW-009",
      "EW-010",
      "EW-011",
      "EW-012",
    ]);
    expect(
      summaries.every(({ title, description, totalConversations }) =>
        title.length > 0 &&
        description.length > 0 &&
        totalConversations === 6
      ),
    ).toBe(true);
  });

  it("uses the canonical runner and unchanged production pipeline", async () => {
    const fixtures = await loadEvaluationFixtures();
    const models: FakeModelAdapter[] = [];
    const result = await processBenchmarkRun(
      fixtures,
      localRuntime(models),
      {
        scope: "selected",
        setId: "EW-001",
        developerMode: true,
      },
    );

    expect(result.sets).toHaveLength(1);
    expect(result.sets[0]?.conversations).toHaveLength(6);
    expect(models).toHaveLength(6);
    expect(models[0]?.calls).toEqual([
      "intent-detection",
      "constitutional-mapping",
      "response-generation",
      "constitutional-review",
    ]);
    expect(result.sets[0]?.conversations[0]).toHaveProperty(
      "developerTrace.strategySelection.primary",
      "CS-001",
    );
  });

  it("leaves every result unscored for manual human evaluation", async () => {
    const fixtures = await loadEvaluationFixtures();
    const result = await processBenchmarkRun(fixtures, localRuntime(), {
      scope: "selected",
      setId: "EW-002",
      developerMode: false,
    });

    expect(result.status).toBe("UNSCORED");
    expect(result.sets[0]).toMatchObject({
      status: "UNSCORED",
      casesPassed: 0,
      casesFailed: 0,
      casesUnscored: 6,
    });
    expect(
      result.sets[0]?.conversations.every(
        ({ status, humanScore }) =>
          status === "UNSCORED" && humanScore === null,
      ),
    ).toBe(true);
  });

  it("keeps privileged summaries out of safe mode and exposes them in developer mode", async () => {
    const fixtures = await loadEvaluationFixtures();
    const safe = await processBenchmarkRun(fixtures, localRuntime(), {
      scope: "selected",
      setId: "EW-003",
      developerMode: false,
    });
    const developer = await processBenchmarkRun(fixtures, localRuntime(), {
      scope: "selected",
      setId: "EW-003",
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

  it("accepts only stateless selected/all execution requests", () => {
    expect(
      parseBenchmarkRunRequest({
        scope: "selected",
        setId: "EW-012",
        developerMode: true,
      }),
    ).toEqual({
      scope: "selected",
      setId: "EW-012",
      developerMode: true,
    });
    expect(parseBenchmarkRunRequest({ scope: "all" })).toEqual({
      scope: "all",
      developerMode: false,
    });
    expect(() =>
      parseBenchmarkRunRequest({
        scope: "selected",
        setId: "EW-999",
      }),
    ).toThrow();
    expect(() =>
      parseBenchmarkRunRequest({
        scope: "all",
        history: [],
      }),
    ).toThrow();
  });
});
