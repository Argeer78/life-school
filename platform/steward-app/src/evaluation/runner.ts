import { runConstitutionalConversation } from "../steward/conversation-engine.js";
import type {
  DeveloperEvaluationConversationResult,
  EvaluationCertificationResult,
  EvaluationConversationFixture,
  EvaluationConversationResult,
  EvaluationResultStatus,
  EvaluationRuntime,
  EvaluationSetFixture,
  EvaluationSetResult,
} from "./types.js";

export interface EvaluationRunnerOptions {
  readonly developerMode?: boolean;
}

function aggregateStatus(
  passed: number,
  failed: number,
  unscored: number,
): EvaluationResultStatus {
  if (failed > 0) return "FAIL";
  if (unscored > 0) return "UNSCORED";
  return passed > 0 ? "PASS" : "UNSCORED";
}

function safeResult(
  fixture: EvaluationConversationFixture,
  runtime: EvaluationRuntime,
  durationMs: number,
  finalResponse: Awaited<
    ReturnType<typeof runConstitutionalConversation>
  >["learnerResponse"],
): EvaluationConversationResult {
  return {
    id: fixture.id,
    learnerPrompt: fixture.learnerPrompt,
    finalResponse,
    provider: runtime.provider,
    model: runtime.model,
    durationMs,
    humanScore: null,
    status: "UNSCORED",
  };
}

export async function runEvaluationConversation(
  fixture: EvaluationConversationFixture,
  runtime: EvaluationRuntime,
  options: { readonly developerMode: true },
): Promise<DeveloperEvaluationConversationResult>;
export async function runEvaluationConversation(
  fixture: EvaluationConversationFixture,
  runtime: EvaluationRuntime,
  options?: { readonly developerMode?: false },
): Promise<EvaluationConversationResult>;
export async function runEvaluationConversation(
  fixture: EvaluationConversationFixture,
  runtime: EvaluationRuntime,
  options: EvaluationRunnerOptions = {},
): Promise<
  EvaluationConversationResult | DeveloperEvaluationConversationResult
> {
  const model = runtime.createModel(fixture);
  const startedAt = performance.now();
  const result = await runConstitutionalConversation(
    model,
    fixture.learnerPrompt,
  );
  const durationMs = Number((performance.now() - startedAt).toFixed(2));
  const base = safeResult(
    fixture,
    runtime,
    durationMs,
    result.learnerResponse,
  );

  if (!options.developerMode) return base;

  const strategySelection = result.inspection.strategySelection.value;
  if (strategySelection === null) {
    throw new TypeError(
      `Production pipeline did not record Strategy Selection for ${fixture.id}.`,
    );
  }
  return {
    ...base,
    developerTrace: {
      strategySelection,
      reviewResult:
        result.inspection.constitutionalReview.value?.attempts.at(-1)?.review
          .outcome ?? null,
      fallback: {
        used: result.inspection.fallback.used,
        category: result.inspection.fallback.category,
      },
    },
  };
}

export async function runEvaluationSet(
  fixture: EvaluationSetFixture,
  runtime: EvaluationRuntime,
  options: { readonly developerMode: true },
): Promise<EvaluationSetResult<DeveloperEvaluationConversationResult>>;
export async function runEvaluationSet(
  fixture: EvaluationSetFixture,
  runtime: EvaluationRuntime,
  options?: { readonly developerMode?: false },
): Promise<EvaluationSetResult>;
export async function runEvaluationSet(
  fixture: EvaluationSetFixture,
  runtime: EvaluationRuntime,
  options: EvaluationRunnerOptions = {},
): Promise<
  | EvaluationSetResult
  | EvaluationSetResult<DeveloperEvaluationConversationResult>
> {
  const startedAt = performance.now();
  const conversations = [];
  for (const conversation of fixture.conversations) {
    conversations.push(
      options.developerMode
        ? await runEvaluationConversation(conversation, runtime, {
            developerMode: true,
          })
        : await runEvaluationConversation(conversation, runtime),
    );
  }
  const casesPassed = conversations.filter(
    ({ status }) => status === "PASS",
  ).length;
  const casesFailed = conversations.filter(
    ({ status }) => status === "FAIL",
  ).length;
  const casesUnscored = conversations.filter(
    ({ status }) => status === "UNSCORED",
  ).length;

  return {
    id: fixture.id,
    title: fixture.title,
    sourceDocument: fixture.sourceDocument,
    provider: runtime.provider,
    model: runtime.model,
    durationMs: Number((performance.now() - startedAt).toFixed(2)),
    status: aggregateStatus(casesPassed, casesFailed, casesUnscored),
    casesPassed,
    casesFailed,
    casesUnscored,
    conversations,
  };
}

export async function runEvaluationCertification(
  fixtures: readonly EvaluationSetFixture[],
  runtime: EvaluationRuntime,
  options: { readonly developerMode: true },
): Promise<
  EvaluationCertificationResult<
    EvaluationSetResult<DeveloperEvaluationConversationResult>
  >
>;
export async function runEvaluationCertification(
  fixtures: readonly EvaluationSetFixture[],
  runtime: EvaluationRuntime,
  options?: { readonly developerMode?: false },
): Promise<EvaluationCertificationResult>;
export async function runEvaluationCertification(
  fixtures: readonly EvaluationSetFixture[],
  runtime: EvaluationRuntime,
  options: EvaluationRunnerOptions = {},
): Promise<EvaluationCertificationResult> {
  const startedAt = performance.now();
  const sets: EvaluationSetResult[] = [];
  for (const fixture of fixtures) {
    sets.push(
      (options.developerMode
        ? await runEvaluationSet(fixture, runtime, { developerMode: true })
        : await runEvaluationSet(fixture, runtime)) as EvaluationSetResult,
    );
  }

  const setsPassed = sets.filter(({ status }) => status === "PASS").length;
  const setsFailed = sets.filter(({ status }) => status === "FAIL").length;
  const setsUnscored = sets.filter(
    ({ status }) => status === "UNSCORED",
  ).length;
  const conversations = sets.flatMap((set) => set.conversations);
  const conversationsPassed = conversations.filter(
    ({ status }) => status === "PASS",
  ).length;
  const conversationsFailed = conversations.filter(
    ({ status }) => status === "FAIL",
  ).length;
  const conversationsUnscored = conversations.filter(
    ({ status }) => status === "UNSCORED",
  ).length;

  return {
    status: aggregateStatus(
      conversationsPassed,
      conversationsFailed,
      conversationsUnscored,
    ),
    provider: runtime.provider,
    model: runtime.model,
    durationMs: Number((performance.now() - startedAt).toFixed(2)),
    totalSets: sets.length,
    totalConversations: conversations.length,
    setsPassed,
    setsFailed,
    setsUnscored,
    conversationsPassed,
    conversationsFailed,
    conversationsUnscored,
    sets,
  };
}
