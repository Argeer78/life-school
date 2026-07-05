import type {
  ConstitutionalMappingRequest,
  IntentDetectionRequest,
  ModelAdapter,
  ReviewRequest,
  ReviseRequest,
} from "../model/client.js";
import type {
  GenerationRequest,
  ProviderResult,
} from "../provider/contract.js";
import {
  runConstitutionalConversation,
  type ConversationInspection,
  type LearnerSafeResponse,
  type StepStatus,
} from "../steward/conversation-engine.js";
import { parseMessage } from "./message-api.js";

export interface PlaygroundRuntimeMetadata {
  readonly provider: string;
  readonly model: string;
}

export interface PlaygroundTokenCounts {
  readonly input: number;
  readonly output: number;
  readonly total: number;
}

export interface PlaygroundTrace<T> {
  readonly status: StepStatus;
  readonly value: T | null;
  readonly error: { readonly code: string } | null;
}

export interface PlaygroundResult {
  readonly learnerResponse: LearnerSafeResponse;
  readonly stages: {
    readonly strategySelection: ConversationInspection["strategySelection"];
    readonly behaviorPlanning: ConversationInspection["behaviorPlanning"];
    readonly providerRequest: PlaygroundTrace<GenerationRequest>;
    readonly providerResponse: PlaygroundTrace<ProviderResult>;
    readonly providerValidation: {
      readonly status: StepStatus;
      readonly value: {
        readonly valid: true;
        readonly schemaVersion: string;
      } | null;
      readonly error: {
        readonly providerFailure: string;
      } | null;
    };
    readonly constitutionalReview: ConversationInspection["constitutionalReview"];
    readonly revision: {
      readonly record: ConversationInspection["revision"];
      readonly preservation: ConversationInspection["revisionVerification"];
    };
    readonly fallback: ConversationInspection["fallback"];
  };
  readonly metadata: {
    readonly provider: string;
    readonly model: string;
    readonly durationMs: number;
    readonly revisionCount: 0 | 1;
    readonly fallbackStatus: "used" | "not-used";
    readonly reviewResult: string | null;
    readonly tokenCounts: PlaygroundTokenCounts | null;
  };
}

interface ProviderObservation {
  request: GenerationRequest | null;
  response: ProviderResult | null;
}

class ObservedModelAdapter implements ModelAdapter {
  constructor(
    private readonly delegate: ModelAdapter,
    private readonly observation: ProviderObservation,
  ) {}

  detectIntent(request: IntentDetectionRequest): Promise<unknown> {
    return this.delegate.detectIntent(request);
  }

  mapConstitution(request: ConstitutionalMappingRequest): Promise<unknown> {
    return this.delegate.mapConstitution(request);
  }

  async generate(request: GenerationRequest): Promise<ProviderResult> {
    this.observation.request = request;
    const response = await this.delegate.generate(request);
    this.observation.response = response;
    return response;
  }

  review(request: ReviewRequest): Promise<unknown> {
    return this.delegate.review(request);
  }

  revise(request: ReviseRequest): Promise<unknown> {
    return this.delegate.revise(request);
  }
}

function trace<T>(
  status: StepStatus,
  value: T | null,
  error: { readonly code: "PROVIDER_OBSERVATION_UNAVAILABLE" } | null = null,
): PlaygroundTrace<T> {
  return { status, value, error };
}

const providerNeutralReviewReasons = new Map([
  [
    "The deterministic local response observes this principle.",
    "The candidate response observes this principle.",
  ],
  [
    "The deterministic local response observes this strategy.",
    "The candidate response observes this strategy.",
  ],
  [
    "The deterministic local response observes this behavior.",
    "The candidate response observes this behavior.",
  ],
]);

function providerNeutralReason(reason: string): string {
  return providerNeutralReviewReasons.get(reason) ?? reason;
}

function projectConstitutionalReview(
  reviewTrace: ConversationInspection["constitutionalReview"],
): ConversationInspection["constitutionalReview"] {
  if (reviewTrace.value === null) return reviewTrace;

  return {
    ...reviewTrace,
    value: {
      attempts: reviewTrace.value.attempts.map((attempt) => ({
        ...attempt,
        review: {
          ...attempt.review,
          principleResults: attempt.review.principleResults.map((result) => ({
            ...result,
            reason: providerNeutralReason(result.reason),
          })),
          strategyCompliance: attempt.review.strategyCompliance.map(
            (result) => ({
              ...result,
              reason: providerNeutralReason(result.reason),
            }),
          ),
          behaviorPlanCompliance: attempt.review.behaviorPlanCompliance.map(
            (result) => ({
              ...result,
              reason: providerNeutralReason(result.reason),
            }),
          ),
        },
      })),
    },
  };
}

/**
 * Developer-only privileged projection of the production conversation path.
 * The observer delegates every operation without changing inputs or outputs.
 */
export async function processPlaygroundMessage(
  model: ModelAdapter,
  body: unknown,
  runtime: PlaygroundRuntimeMetadata,
): Promise<PlaygroundResult> {
  const message = parseMessage(body);
  const observation: ProviderObservation = {
    request: null,
    response: null,
  };
  const observedModel = new ObservedModelAdapter(model, observation);
  const startedAt = performance.now();
  const result = await runConstitutionalConversation(observedModel, message);
  const durationMs = Number((performance.now() - startedAt).toFixed(2));
  const generationPassed =
    result.inspection.responseGeneration.status === "completed";
  const providerFailure =
    result.inspection.responseGeneration.error?.providerFailure ?? null;
  const reviewResult =
    result.inspection.constitutionalReview.value?.attempts.at(-1)?.review
      .outcome ?? null;

  return {
    learnerResponse: result.learnerResponse,
    stages: {
      strategySelection: result.inspection.strategySelection,
      behaviorPlanning: result.inspection.behaviorPlanning,
      providerRequest:
        observation.request === null
          ? trace<GenerationRequest>("skipped", null)
          : trace("completed", observation.request),
      // Invalid provider content is not reflected back by the developer API.
      // The stable PB failure category remains available below.
      providerResponse: generationPassed
        ? trace("completed", observation.response)
        : trace<ProviderResult>(
            "failed",
            null,
            { code: "PROVIDER_OBSERVATION_UNAVAILABLE" },
          ),
      providerValidation: generationPassed
        ? {
            status: "completed",
            value: {
              valid: true,
              schemaVersion:
                observation.request?.outputSchemaVersion ?? "unknown",
            },
            error: null,
          }
        : {
            status:
              result.inspection.responseGeneration.status === "skipped"
                ? "skipped"
                : "failed",
            value: null,
            error:
              providerFailure === null
                ? null
                : { providerFailure },
          },
      constitutionalReview: projectConstitutionalReview(
        result.inspection.constitutionalReview,
      ),
      revision: {
        record: result.inspection.revision,
        preservation: result.inspection.revisionVerification,
      },
      fallback: result.inspection.fallback,
    },
    metadata: {
      provider: runtime.provider,
      model: runtime.model,
      durationMs,
      revisionCount: result.learnerResponse.revisions,
      fallbackStatus: result.inspection.fallback.used ? "used" : "not-used",
      reviewResult,
      tokenCounts: null,
    },
  };
}
