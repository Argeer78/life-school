import type { ConstitutionalReview } from "../steward/review-schema.js";
import type {
  ConstitutionalMapping,
  IntentDetection,
} from "../steward/conversation-schema.js";
import type { StrategySelection } from "../steward/strategy-selection.js";
import type { BehaviorPlan } from "../steward/behavior-planning.js";
import type { GenerationProvider } from "../provider/contract.js";

export interface IntentDetectionRequest {
  readonly userPrompt: string;
  readonly strategySelection: StrategySelection;
}

export interface ConstitutionalMappingRequest extends IntentDetectionRequest {
  readonly intent: IntentDetection;
}

export interface ReviewRequest extends ConstitutionalMappingRequest {
  readonly mapping: ConstitutionalMapping;
  readonly plan: BehaviorPlan;
  readonly response: string;
}

export interface ReviseRequest extends ReviewRequest {
  readonly review: ConstitutionalReview;
}

/**
 * Provider-neutral boundary used by the Phase B harness.
 * No real provider implementation belongs in this phase.
 */
export interface ModelAdapter extends GenerationProvider {
  detectIntent(request: IntentDetectionRequest): Promise<unknown>;
  mapConstitution(request: ConstitutionalMappingRequest): Promise<unknown>;
  review(request: ReviewRequest): Promise<unknown>;
  revise(request: ReviseRequest): Promise<unknown>;
}
