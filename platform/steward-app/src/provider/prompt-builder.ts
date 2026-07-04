import type {
  GenerationRequest,
  ProviderResult,
} from "./contract.js";

export interface ProviderInput {
  readonly contractVersion: GenerationRequest["providerContractVersion"];
  readonly outputSchemaVersion: GenerationRequest["outputSchemaVersion"];
  readonly messages: readonly {
    readonly role: "learner" | "steward";
    readonly content: string;
  }[];
  readonly suppliedContext: {
    readonly strategySelection: GenerationRequest["strategySelection"];
    readonly behaviorPlan: GenerationRequest["behaviorPlan"];
    readonly constitutionalConstraints: GenerationRequest["constitutionalConstraints"];
  };
  readonly expectedOutput: Readonly<Record<keyof ProviderResult, string>>;
}

/**
 * Serializes engine decisions for a future adapter. It deliberately copies the
 * supplied strategy, plan, and constraints without selecting or adding behavior.
 */
export function buildProviderInput(
  request: GenerationRequest,
): ProviderInput {
  return {
    contractVersion: request.providerContractVersion,
    outputSchemaVersion: request.outputSchemaVersion,
    messages: [
      ...request.currentConversation,
      { role: "learner", content: request.learnerMessage },
    ],
    suppliedContext: {
      strategySelection: request.strategySelection,
      behaviorPlan: request.behaviorPlan,
      constitutionalConstraints: request.constitutionalConstraints,
    },
    expectedOutput: {
      response: "learner-facing UTF-8 string",
      confidence: "number from 0 through 1",
      uncertainty: "boolean",
      refusal: "boolean",
      notes: "array of privileged metadata strings",
      schemaVersion: request.outputSchemaVersion,
    },
  };
}
