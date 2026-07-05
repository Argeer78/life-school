import type { ModelAdapter } from "../model/client.js";
import type { LearnerSafeResponse } from "../steward/conversation-engine.js";
import type { ConversationStrategyId } from "../steward/conversation-strategy-registry.js";
import type { FallbackCategory } from "../steward/fallback.js";
import type { ReviewOutcome } from "../steward/review-schema.js";
import type { StrategySelection } from "../steward/strategy-selection.js";

export const evaluationSetIds = [
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
] as const;

export type EvaluationSetId = (typeof evaluationSetIds)[number];
export type EvaluationConversationId = `${EvaluationSetId}-${string}`;
export type EvaluationCoverageId = ConversationStrategyId | "ST-001";

export interface EvaluationConversationFixture {
  readonly id: EvaluationConversationId;
  readonly learnerPrompt: string;
  readonly expectedQualities: readonly string[];
  readonly criticalFailureConditions: readonly string[];
  readonly expectedPrimaryStrategy: ConversationStrategyId | null;
  readonly expectedSecondaryStrategies: readonly ConversationStrategyId[];
}

export interface EvaluationSetFixture {
  readonly id: EvaluationSetId;
  readonly title: string;
  readonly description: string;
  readonly sourceDocument: string;
  readonly primaryCoverage: readonly EvaluationCoverageId[];
  readonly secondaryCoverage: readonly EvaluationCoverageId[];
  readonly conversations: readonly EvaluationConversationFixture[];
}

export const evaluationScoreCriteria = [
  "constitutionalFidelity",
  "humanDignity",
  "humanFreedom",
  "intellectualHonesty",
  "practicalHelpfulness",
  "naturalness",
] as const;

export type EvaluationScoreCriterion =
  (typeof evaluationScoreCriteria)[number];
export type HumanEvaluationScoreValue = 0 | 1 | 2 | 3 | 4;
export type HumanEvaluationOutcome = "PASS" | "FAIL";

export interface HumanEvaluationScore {
  readonly scores: Readonly<
    Record<EvaluationScoreCriterion, HumanEvaluationScoreValue>
  >;
  readonly outcome: HumanEvaluationOutcome;
  readonly reviewerNotes: string;
}

export type EvaluationResultStatus = HumanEvaluationOutcome | "UNSCORED";

export interface EvaluationRuntime {
  readonly provider: string;
  readonly model: string;
  readonly createModel: (
    conversation: EvaluationConversationFixture,
  ) => ModelAdapter;
}

export interface EvaluationConversationResult {
  readonly id: EvaluationConversationId;
  readonly learnerPrompt: string;
  readonly finalResponse: LearnerSafeResponse;
  readonly provider: string;
  readonly model: string;
  readonly durationMs: number;
  readonly humanScore: HumanEvaluationScore | null;
  readonly status: EvaluationResultStatus;
}

export interface DeveloperEvaluationTrace {
  readonly strategySelection: StrategySelection;
  readonly reviewResult: ReviewOutcome | null;
  readonly fallback: {
    readonly used: boolean;
    readonly category: FallbackCategory | null;
  };
}

export interface DeveloperEvaluationConversationResult
  extends EvaluationConversationResult {
  readonly developerTrace: DeveloperEvaluationTrace;
}

export interface EvaluationSetResult<
  ConversationResult extends
    EvaluationConversationResult = EvaluationConversationResult,
> {
  readonly id: EvaluationSetId;
  readonly title: string;
  readonly sourceDocument: string;
  readonly provider: string;
  readonly model: string;
  readonly durationMs: number;
  readonly status: EvaluationResultStatus;
  readonly casesPassed: number;
  readonly casesFailed: number;
  readonly casesUnscored: number;
  readonly conversations: readonly ConversationResult[];
}

export interface EvaluationCertificationResult<
  SetResult extends EvaluationSetResult = EvaluationSetResult,
> {
  readonly status: EvaluationResultStatus;
  readonly provider: string;
  readonly model: string;
  readonly durationMs: number;
  readonly totalSets: number;
  readonly totalConversations: number;
  readonly setsPassed: number;
  readonly setsFailed: number;
  readonly setsUnscored: number;
  readonly conversationsPassed: number;
  readonly conversationsFailed: number;
  readonly conversationsUnscored: number;
  readonly sets: readonly SetResult[];
}
