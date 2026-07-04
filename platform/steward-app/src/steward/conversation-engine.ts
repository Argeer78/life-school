import type { ModelAdapter } from "../model/client.js";
import {
  providerContractVersion,
  providerOutputSchemaVersion,
  type GenerationRequest,
} from "../provider/contract.js";
import {
  classifyProviderFailure,
  type ProviderFailureCategory,
} from "../provider/failure.js";
import { validateProviderResult } from "../provider/validation.js";
import {
  selectFallback,
  type FallbackCategory,
  type FallbackReason,
} from "./fallback.js";
import {
  parseConstitutionalMapping,
  parseIntentDetection,
  type ConstitutionalMapping,
  type IntentDetection,
  type IntentKind,
} from "./conversation-schema.js";
import {
  planFromStrategySelection,
  type BehaviorPlan,
} from "./behavior-planning.js";
import {
  parseConstitutionalReview,
  type ConstitutionalReview,
} from "./review-schema.js";
import { requireLanguageConsistencyRevision } from "./language-consistency.js";
import { rejectAssignedPurpose } from "./purpose-authority-review.js";
import {
  selectConversationStrategies,
  type ConversationTurn,
  type StrategySelection,
} from "./strategy-selection.js";
import {
  parseRevisionRecord,
  type RevisionRecord,
} from "./revision-schema.js";
import {
  verifyRevisionPreservation,
  type RevisionPreservationVerification,
} from "./revision-preservation.js";
import { conversationStrategyIds } from "./conversation-strategy-registry.js";

export type StepStatus = "completed" | "failed" | "skipped" | "not-required";

export interface InspectionError {
  readonly code: EngineErrorCode;
  readonly providerFailure?: ProviderFailureCategory;
}

export type EngineErrorCode =
  | "INTENT_DETECTION_ERROR"
  | "CONSTITUTIONAL_MAPPING_ERROR"
  | "BEHAVIOR_PLANNING_ERROR"
  | "RESPONSE_GENERATION_ERROR"
  | "CONSTITUTIONAL_REVIEW_ERROR"
  | "REVISION_ERROR"
  | "REVISION_PRESERVATION_ERROR"
  | "REVISION_REVIEW_ERROR";

export interface StepTrace<T> {
  readonly status: StepStatus;
  readonly value: T | null;
  readonly error: InspectionError | null;
}

export interface ReviewAttempt {
  readonly target: "candidate" | "revision";
  readonly response: string;
  readonly review: ConstitutionalReview;
}

export interface ConversationInspection {
  readonly strategySelection: StepTrace<StrategySelection>;
  readonly intentDetection: StepTrace<IntentDetection>;
  readonly constitutionalMapping: StepTrace<ConstitutionalMapping>;
  readonly behaviorPlanning: StepTrace<BehaviorPlan>;
  readonly responseGeneration: StepTrace<{ readonly candidate: string }>;
  readonly constitutionalReview: StepTrace<{
    readonly attempts: readonly ReviewAttempt[];
  }>;
  readonly revision: StepTrace<RevisionRecord>;
  readonly revisionVerification: StepTrace<RevisionPreservationVerification>;
  readonly fallback: {
    readonly used: boolean;
    readonly reason: FallbackReason | null;
    readonly category: FallbackCategory | null;
    readonly approvalId: `EN-005-FB-${string}` | null;
    readonly approvalStatus: "PRE_APPROVED" | null;
  };
}

export interface LearnerSafeResponse {
  readonly kind: "accepted" | "fallback";
  readonly text: string;
  readonly revisions: 0 | 1;
}

export interface PrivilegedConversationResult {
  readonly learnerResponse: LearnerSafeResponse;
  /**
   * Diagnostic data for local constitutional examination. A future learner UI
   * must not receive this object or rejected response candidates.
   */
  readonly inspection: ConversationInspection;
}

const skipped = <T>(): StepTrace<T> => ({
  status: "skipped",
  value: null,
  error: null,
});

const notRequired = <T>(): StepTrace<T> => ({
  status: "not-required",
  value: null,
  error: null,
});

const completed = <T>(value: T): StepTrace<T> => ({
  status: "completed",
  value,
  error: null,
});

function failed<T>(
  code: EngineErrorCode,
  value: T | null = null,
): StepTrace<T> {
  return {
    status: "failed",
    value,
    error: { code },
  };
}

function providerFailed<T>(
  category: ProviderFailureCategory,
  value: T | null = null,
): StepTrace<T> {
  return {
    status: "failed",
    value,
    error: {
      code: "RESPONSE_GENERATION_ERROR",
      providerFailure: category,
    },
  };
}

function fallbackResult(
  inspection: ConversationInspection,
  reason: FallbackReason,
  revisions: 0 | 1,
  learnerMessage: string,
  currentConversation: readonly ConversationTurn[],
  intent: IntentKind | null,
): PrivilegedConversationResult {
  const attempts = inspection.constitutionalReview.value?.attempts ?? [];
  const fallback = selectFallback({
    strategySelection: inspection.strategySelection.value,
    reviewOutcome: attempts.at(-1)?.review.outcome ?? null,
    revisionOutcome: inspection.revision.value?.outcome ?? null,
    currentSessionContext: {
      learnerMessage,
      conversation: currentConversation,
      intent,
      behaviorPlanAvailable: inspection.behaviorPlanning.status === "completed",
      failureReason: reason,
      providerFailure:
        inspection.responseGeneration.error?.providerFailure ?? null,
    },
  });
  return {
    learnerResponse: {
      kind: "fallback",
      text: fallback.text,
      revisions,
    },
    inspection: {
      ...inspection,
      fallback: {
        used: true,
        reason,
        category: fallback.category,
        approvalId: fallback.approval.approvalId,
        approvalStatus: fallback.approval.status,
      },
    },
  };
}

function initialInspection(): ConversationInspection {
  return {
    strategySelection: skipped(),
    intentDetection: skipped(),
    constitutionalMapping: skipped(),
    behaviorPlanning: skipped(),
    responseGeneration: skipped(),
    constitutionalReview: skipped(),
    revision: skipped(),
    revisionVerification: skipped(),
    fallback: {
      used: false,
      reason: null,
      category: null,
      approvalId: null,
      approvalStatus: null,
    },
  };
}

/**
 * Runs one user message through the complete constitutional pipeline.
 * It is stateless and retains no prompt, response, account, or learner profile.
 */
export async function runConstitutionalConversation(
  model: ModelAdapter,
  userPrompt: string,
  currentConversation: readonly ConversationTurn[] = [],
): Promise<PrivilegedConversationResult> {
  let inspection = initialInspection();
  const strategySelection = selectConversationStrategies({
    learnerMessage: userPrompt,
    currentConversation,
    availableStrategies: conversationStrategyIds,
  });
  inspection = {
    ...inspection,
    strategySelection: completed(strategySelection),
  };

  let intent: IntentDetection;
  try {
    intent = parseIntentDetection(
      await model.detectIntent({ userPrompt, strategySelection }),
    );
    inspection = { ...inspection, intentDetection: completed(intent) };
  } catch {
    inspection = {
      ...inspection,
      intentDetection: failed("INTENT_DETECTION_ERROR"),
    };
    return fallbackResult(
      inspection,
      "intent-detection-failed",
      0,
      userPrompt,
      currentConversation,
      null,
    );
  }

  let mapping: ConstitutionalMapping;
  try {
    mapping = parseConstitutionalMapping(
      await model.mapConstitution({ userPrompt, strategySelection, intent }),
    );
    inspection = {
      ...inspection,
      constitutionalMapping: completed(mapping),
    };
  } catch {
    inspection = {
      ...inspection,
      constitutionalMapping: failed("CONSTITUTIONAL_MAPPING_ERROR"),
    };
    return fallbackResult(
      inspection,
      "constitutional-mapping-failed",
      0,
      userPrompt,
      currentConversation,
      intent.intent,
    );
  }

  const plan = planFromStrategySelection(userPrompt, strategySelection);
  inspection = { ...inspection, behaviorPlanning: completed(plan) };

  const context = { userPrompt, strategySelection, intent, mapping, plan };
  const generationRequest: GenerationRequest = {
    learnerMessage: userPrompt,
    currentConversation,
    strategySelection,
    behaviorPlan: plan,
    constitutionalConstraints: {
      references: mapping.references,
      protections: mapping.protections,
      limits: mapping.limits,
    },
    providerContractVersion,
    outputSchemaVersion: providerOutputSchemaVersion,
  };

  let candidate: string;
  try {
    const providerResponse = validateProviderResult(
      await model.generate(generationRequest),
      generationRequest.outputSchemaVersion,
    );
    candidate = providerResponse.response;
    inspection = {
      ...inspection,
      responseGeneration: completed({ candidate }),
    };
  } catch (error) {
    inspection = {
      ...inspection,
      responseGeneration: providerFailed(classifyProviderFailure(error)),
    };
    return fallbackResult(
      inspection,
      "response-generation-failed",
      0,
      userPrompt,
      currentConversation,
      intent.intent,
    );
  }

  const attempts: ReviewAttempt[] = [];
  let firstReview: ConstitutionalReview;
  try {
    firstReview = rejectAssignedPurpose(
      requireLanguageConsistencyRevision(
        parseConstitutionalReview(
          await model.review({ ...context, response: candidate }),
          { strategySelection, plan },
        ),
        userPrompt,
        candidate,
      ),
      candidate,
    );
    attempts.push({ target: "candidate", response: candidate, review: firstReview });
    inspection = {
      ...inspection,
      constitutionalReview: completed({ attempts: [...attempts] }),
    };
  } catch {
    inspection = {
      ...inspection,
      constitutionalReview: failed("CONSTITUTIONAL_REVIEW_ERROR", {
        attempts: [...attempts],
      }),
    };
    return fallbackResult(
      inspection,
      "constitutional-review-failed",
      0,
      userPrompt,
      currentConversation,
      intent.intent,
    );
  }

  if (firstReview.outcome === "APPROVED") {
    inspection = {
      ...inspection,
      revision: notRequired(),
      revisionVerification: notRequired(),
    };
    return {
      learnerResponse: { kind: "accepted", text: candidate, revisions: 0 },
      inspection,
    };
  }

  if (firstReview.outcome === "REJECTED") {
    inspection = {
      ...inspection,
      revision: notRequired(),
      revisionVerification: notRequired(),
    };
    return fallbackResult(
      inspection,
      "constitutional-review-rejected",
      0,
      userPrompt,
      currentConversation,
      intent.intent,
    );
  }

  let revisionRecord: RevisionRecord;
  try {
    const revisionRequest = {
      ...context,
      response: candidate,
      review: firstReview,
    };
    revisionRecord = parseRevisionRecord(
      await model.revise(revisionRequest),
      {
        learnerMessage: userPrompt,
        strategySelection,
        plan,
        review: firstReview,
      },
    );
    inspection = {
      ...inspection,
      revision: completed(revisionRecord),
    };
  } catch {
    inspection = {
      ...inspection,
      revision: failed("REVISION_ERROR"),
    };
    return fallbackResult(
      inspection,
      "revision-failed",
      1,
      userPrompt,
      currentConversation,
      intent.intent,
    );
  }

  if (revisionRecord.outcome === "FAILED") {
    inspection = {
      ...inspection,
      revisionVerification: notRequired(),
    };
    return fallbackResult(
      inspection,
      "revision-failed",
      1,
      userPrompt,
      currentConversation,
      intent.intent,
    );
  }

  const revision = revisionRecord.revisedResponse;
  const preservationVerification = verifyRevisionPreservation({
    learnerMessage: userPrompt,
    strategySelection,
    behaviorPlan: plan,
    failedCandidate: candidate,
    revisedResponse: revision,
    revisionSummary: revisionRecord.revisionSummary,
    correctedViolations: revisionRecord.correctedViolations,
  });
  inspection = {
    ...inspection,
    revisionVerification: preservationVerification.verified
      ? completed(preservationVerification)
      : failed(
          "REVISION_PRESERVATION_ERROR",
          preservationVerification,
        ),
  };
  if (!preservationVerification.verified) {
    return fallbackResult(
      inspection,
      "revision-preservation-failed",
      1,
      userPrompt,
      currentConversation,
      intent.intent,
    );
  }

  try {
    const secondReview = rejectAssignedPurpose(
      requireLanguageConsistencyRevision(
        parseConstitutionalReview(
          await model.review({ ...context, response: revision }),
          { strategySelection, plan },
        ),
        userPrompt,
        revision,
      ),
      revision,
    );
    attempts.push({
      target: "revision",
      response: revision,
      review: secondReview,
    });
    inspection = {
      ...inspection,
      constitutionalReview: completed({ attempts: [...attempts] }),
    };

    if (secondReview.outcome === "APPROVED") {
      return {
        learnerResponse: { kind: "accepted", text: revision, revisions: 1 },
        inspection,
      };
    }

    return fallbackResult(
      inspection,
      "revision-review-failed",
      1,
      userPrompt,
      currentConversation,
      intent.intent,
    );
  } catch {
    inspection = {
      ...inspection,
      constitutionalReview: failed("REVISION_REVIEW_ERROR", {
        attempts: [...attempts],
      }),
    };
    return fallbackResult(
      inspection,
      "revision-review-invalid",
      1,
      userPrompt,
      currentConversation,
      intent.intent,
    );
  }
}
