import { describe, expect, it } from "vitest";
import { compareTraceJson } from "../../src/client/trace-comparison.js";

function trace() {
  return {
    learnerResponse: {
      kind: "accepted",
      text: "Examine the available evidence.",
      revisions: 0,
    },
    stages: {
      strategySelection: {
        status: "completed",
        value: {
          primary: "CS-003",
          secondary: [],
          confidence: "high",
        },
        error: null,
      },
      behaviorPlanning: {
        status: "completed",
        value: {
          objective: "Clarify uncertainty.",
          components: [],
        },
        error: null,
      },
      providerResponse: {
        status: "completed",
        value: { response: "Examine the available evidence." },
        error: null,
      },
      providerValidation: {
        status: "completed",
        value: { valid: true, schemaVersion: "1" },
        error: null,
      },
      constitutionalReview: {
        status: "completed",
        value: { attempts: [{ review: { outcome: "APPROVED" } }] },
        error: null,
      },
      revision: {
        record: { status: "not-required", value: null, error: null },
        preservation: { status: "not-required", value: null, error: null },
      },
      fallback: {
        used: false,
        category: null as string | null,
        response: null,
      },
    },
    metadata: {
      provider: "fake",
      model: "local-demo",
      durationMs: 1,
      revisionCount: 0,
      fallbackStatus: "not-used",
      reviewResult: "APPROVED",
      tokenCounts: null,
    },
  };
}

function comparison(left: unknown, right: unknown) {
  const result = compareTraceJson(
    JSON.stringify(left),
    JSON.stringify(right),
  );
  if (!result.ok) throw new TypeError("Expected valid comparison.");
  return result;
}

describe("privileged trace comparison", () => {
  it("shows no differences for identical traces", () => {
    const value = trace();
    const result = comparison(value, structuredClone(value));

    expect(result.changedSectionCount).toBe(0);
    expect(result.sections).toHaveLength(9);
    expect(result.sections.every(({ status }) => status === "same")).toBe(true);
  });

  it("detects strategy selection changes", () => {
    const left = trace();
    const right = structuredClone(left);
    right.stages.strategySelection.value.primary = "CS-002";
    const result = comparison(left, right);
    const section = result.sections.find(
      ({ id }) => id === "strategySelection",
    );

    expect(section).toMatchObject({ status: "changed" });
    expect(section?.changedPaths).toContain("value.primary");
    expect(
      result.sections.find(({ id }) => id === "learnerResponse")?.status,
    ).toBe("same");
  });

  it("detects final learner response changes", () => {
    const left = trace();
    const right = structuredClone(left);
    right.learnerResponse.text = "A different learner response.";
    const result = comparison(left, right);
    const section = result.sections.find(({ id }) => id === "learnerResponse");

    expect(section).toMatchObject({ status: "changed" });
    expect(section?.changedPaths).toContain("text");
  });

  it("detects fallback changes", () => {
    const left = trace();
    const right = structuredClone(left);
    right.stages.fallback.used = true;
    right.stages.fallback.category = "TECHNICAL_LIMITATION";
    const result = comparison(left, right);
    const section = result.sections.find(({ id }) => id === "fallback");

    expect(section).toMatchObject({ status: "changed" });
    expect(section?.changedPaths).toEqual(
      expect.arrayContaining(["used", "category"]),
    );
  });

  it("handles invalid JSON and non-object roots without throwing", () => {
    expect(compareTraceJson("{not json", JSON.stringify(trace()))).toEqual({
      ok: false,
      errors: { traceA: "INVALID_JSON", traceB: null },
    });
    expect(compareTraceJson("[]", "null")).toEqual({
      ok: false,
      errors: {
        traceA: "INVALID_TRACE_ROOT",
        traceB: "INVALID_TRACE_ROOT",
      },
    });
  });
});
