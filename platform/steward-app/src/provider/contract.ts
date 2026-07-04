import type { BehaviorPlan } from "../steward/behavior-planning.js";
import type {
  ConstitutionalLimit,
  ConstitutionalProtection,
} from "../steward/conversation-schema.js";
import type { ConstitutionalSectionId } from "../steward/constitutional-registry.js";
import type {
  ConversationTurn,
  StrategySelection,
} from "../steward/strategy-selection.js";

export const providerContractVersion = "PB-001/1.0" as const;
export const providerOutputSchemaVersion = "PB-001-OUTPUT/1.0" as const;
export const maximumProviderResponseCharacters = 8_000;

export interface ConstitutionalConstraints {
  readonly references: readonly ConstitutionalSectionId[];
  readonly protections: readonly ConstitutionalProtection[];
  readonly limits: readonly ConstitutionalLimit[];
}

/**
 * PB-001's complete generation input. No privileged audit, review, revision,
 * fallback, identity, persistence, or provider-specific fields are permitted.
 */
export interface GenerationRequest {
  readonly learnerMessage: string;
  readonly currentConversation: readonly ConversationTurn[];
  readonly strategySelection: StrategySelection;
  readonly behaviorPlan: BehaviorPlan;
  readonly constitutionalConstraints: ConstitutionalConstraints;
  readonly providerContractVersion: typeof providerContractVersion;
  readonly outputSchemaVersion: typeof providerOutputSchemaVersion;
}

export interface ProviderResult {
  readonly response: string;
  readonly confidence: number;
  readonly uncertainty: boolean;
  readonly refusal: boolean;
  readonly notes: readonly string[];
  readonly schemaVersion: typeof providerOutputSchemaVersion;
}

export interface GenerationProvider {
  generate(request: GenerationRequest): Promise<ProviderResult>;
}

export function providerResult(response: string): ProviderResult {
  return {
    response,
    confidence: 1,
    uncertainty: false,
    refusal: false,
    notes: [],
    schemaVersion: providerOutputSchemaVersion,
  };
}
