import {
  runEvaluationCertification,
  runEvaluationSet,
} from "../evaluation/runner.js";
import {
  evaluationSetIds,
  type DeveloperEvaluationConversationResult,
  type EvaluationConversationResult,
  type EvaluationRuntime,
  type EvaluationSetFixture,
  type EvaluationSetId,
  type EvaluationSetResult,
  type EvaluationResultStatus,
} from "../evaluation/types.js";

export interface BenchmarkSetSummary {
  readonly id: EvaluationSetId;
  readonly title: string;
  readonly description: string;
  readonly totalConversations: number;
}

export interface BenchmarkRunRequest {
  readonly scope: "selected" | "all";
  readonly setId?: EvaluationSetId;
  readonly developerMode: boolean;
}

export interface BenchmarkRunResult<
  ConversationResult extends
    EvaluationConversationResult = EvaluationConversationResult,
> {
  readonly status: EvaluationResultStatus;
  readonly provider: string;
  readonly model: string;
  readonly durationMs: number;
  readonly sets: readonly EvaluationSetResult<ConversationResult>[];
}

export class InvalidBenchmarkRequest extends TypeError {
  readonly code = "INVALID_BENCHMARK_REQUEST";
}

export function benchmarkSetSummaries(
  fixtures: readonly EvaluationSetFixture[],
): readonly BenchmarkSetSummary[] {
  return fixtures.map(({ id, title, description, conversations }) => ({
    id,
    title,
    description,
    totalConversations: conversations.length,
  }));
}

function isEvaluationSetId(value: unknown): value is EvaluationSetId {
  return (
    typeof value === "string" &&
    evaluationSetIds.includes(value as EvaluationSetId)
  );
}

export function parseBenchmarkRunRequest(body: unknown): BenchmarkRunRequest {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new InvalidBenchmarkRequest();
  }

  const request = body as Record<string, unknown>;
  const allowedKeys = new Set(["scope", "setId", "developerMode"]);
  if (Object.keys(request).some((key) => !allowedKeys.has(key))) {
    throw new InvalidBenchmarkRequest();
  }

  const developerMode = request.developerMode ?? false;
  if (typeof developerMode !== "boolean") {
    throw new InvalidBenchmarkRequest();
  }

  if (request.scope === "all" && request.setId === undefined) {
    return { scope: "all", developerMode };
  }
  if (request.scope === "selected" && isEvaluationSetId(request.setId)) {
    return {
      scope: "selected",
      setId: request.setId,
      developerMode,
    };
  }
  throw new InvalidBenchmarkRequest();
}

function selectedFixture(
  fixtures: readonly EvaluationSetFixture[],
  setId: EvaluationSetId,
): EvaluationSetFixture {
  const fixture = fixtures.find(({ id }) => id === setId);
  if (fixture === undefined) throw new InvalidBenchmarkRequest();
  return fixture;
}

export async function processBenchmarkRun(
  fixtures: readonly EvaluationSetFixture[],
  runtime: EvaluationRuntime,
  request: BenchmarkRunRequest & { readonly developerMode: true },
): Promise<BenchmarkRunResult<DeveloperEvaluationConversationResult>>;
export async function processBenchmarkRun(
  fixtures: readonly EvaluationSetFixture[],
  runtime: EvaluationRuntime,
  request: BenchmarkRunRequest & { readonly developerMode: false },
): Promise<BenchmarkRunResult>;
export async function processBenchmarkRun(
  fixtures: readonly EvaluationSetFixture[],
  runtime: EvaluationRuntime,
  request: BenchmarkRunRequest,
): Promise<
  | BenchmarkRunResult
  | BenchmarkRunResult<DeveloperEvaluationConversationResult>
> {
  if (request.scope === "all") {
    if (request.developerMode) {
      const result = await runEvaluationCertification(fixtures, runtime, {
        developerMode: true,
      });
      return {
        status: result.status,
        provider: result.provider,
        model: result.model,
        durationMs: result.durationMs,
        sets: result.sets,
      };
    }
    const result = await runEvaluationCertification(fixtures, runtime);
    return {
      status: result.status,
      provider: result.provider,
      model: result.model,
      durationMs: result.durationMs,
      sets: result.sets,
    };
  }

  if (request.setId === undefined) throw new InvalidBenchmarkRequest();
  const fixture = selectedFixture(fixtures, request.setId);
  if (request.developerMode) {
    const result = await runEvaluationSet(fixture, runtime, {
      developerMode: true,
    });
    return {
      status: result.status,
      provider: result.provider,
      model: result.model,
      durationMs: result.durationMs,
      sets: [result],
    };
  }
  const result = await runEvaluationSet(fixture, runtime);
  return {
    status: result.status,
    provider: result.provider,
    model: result.model,
    durationMs: result.durationMs,
    sets: [result],
  };
}
