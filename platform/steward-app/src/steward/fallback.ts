import type { IntentKind } from "./conversation-schema.js";
import type { ProviderFailureCategory } from "../provider/failure.js";
import type { ConstitutionalSectionId } from "./constitutional-registry.js";
import type { ReviewOutcome } from "./review-schema.js";
import type { RevisionOutcome } from "./revision-schema.js";
import type {
  ConversationTurn,
  StrategySelection,
} from "./strategy-selection.js";

export const fallbackCategories = [
  "CONSTITUTIONAL_UNCERTAINTY",
  "ETHICAL_BOUNDARY",
  "SAFETY",
  "TECHNICAL_LIMITATION",
  "REVIEW_REJECTION",
  "REVISION_FAILURE",
] as const;

export type FallbackCategory = (typeof fallbackCategories)[number];

export type FallbackReason =
  | "intent-detection-failed"
  | "constitutional-mapping-failed"
  | "behavior-planning-failed"
  | "response-generation-failed"
  | "constitutional-review-failed"
  | "constitutional-review-rejected"
  | "revision-failed"
  | "revision-preservation-failed"
  | "revision-review-failed"
  | "revision-review-invalid";

export interface FallbackApproval {
  readonly status: "PRE_APPROVED";
  readonly approvalId: `EN-005-FB-${string}`;
  readonly constitutionalReferences: readonly ConstitutionalSectionId[];
}

export interface PreApprovedFallback {
  readonly category: FallbackCategory;
  readonly text: string;
  readonly approval: FallbackApproval;
}

export interface CurrentSessionContext {
  readonly learnerMessage: string;
  readonly conversation: readonly ConversationTurn[];
  readonly intent: IntentKind | null;
  readonly behaviorPlanAvailable: boolean;
  readonly failureReason: FallbackReason;
  readonly providerFailure: ProviderFailureCategory | null;
}

export interface FallbackSelectionInput {
  readonly strategySelection: StrategySelection | null;
  readonly reviewOutcome: ReviewOutcome | null;
  readonly revisionOutcome: RevisionOutcome | null;
  readonly currentSessionContext: CurrentSessionContext;
}

export interface FallbackSelection extends PreApprovedFallback {
  readonly selectedFrom: {
    readonly primaryStrategy: StrategySelection["primary"] | null;
    readonly reviewOutcome: ReviewOutcome | null;
    readonly revisionOutcome: RevisionOutcome | null;
    readonly failureReason: FallbackReason;
    readonly providerFailure: ProviderFailureCategory | null;
  };
}

export const preApprovedFallbacks = {
  CONSTITUTIONAL_UNCERTAINTY: {
    category: "CONSTITUTIONAL_UNCERTAINTY",
    text: "I don't know enough to respond with confidence. If it would help, we can examine what is known, what remains uncertain, and how you might continue exploring. You may also stop here.",
    approval: {
      status: "PRE_APPROVED",
      approvalId: "EN-005-FB-001",
      constitutionalReferences: [
        "LS-004:humility",
        "ST-001:boundaries",
        "LS-002:human-freedom",
      ],
    },
  },
  ETHICAL_BOUNDARY: {
    category: "ETHICAL_BOUNDARY",
    text: "I can't help manipulate, coerce, or deceive another person. I can help you examine an honest and respectful way to address the situation, if you want.",
    approval: {
      status: "PRE_APPROVED",
      approvalId: "EN-005-FB-002",
      constitutionalReferences: [
        "LS-002:human-dignity",
        "LS-002:human-freedom",
        "ST-001:boundaries",
      ],
    },
  },
  SAFETY: {
    category: "SAFETY",
    text: "I can't help cause harm. If anyone may be in immediate danger, seek help from a trusted person or local emergency services. If it is safe to continue, we can focus on reducing harm and finding a safer next step.",
    approval: {
      status: "PRE_APPROVED",
      approvalId: "EN-005-FB-003",
      constitutionalReferences: [
        "LS-002:human-dignity",
        "LS-002:human-responsibility",
        "ST-001:boundaries",
      ],
    },
  },
  TECHNICAL_LIMITATION: {
    category: "TECHNICAL_LIMITATION",
    text: "I'm unable to respond reliably because of a technical limitation. Rather than guess, I'll be honest about that. You may try again or stop here.",
    approval: {
      status: "PRE_APPROVED",
      approvalId: "EN-005-FB-004",
      constitutionalReferences: [
        "LS-004:the-limits-of-life-school",
        "LS-004:humility",
        "LS-002:human-freedom",
      ],
    },
  },
  REVIEW_REJECTION: {
    category: "REVIEW_REJECTION",
    text: "I'm not able to provide a reliable response to that. If you want, you may reframe the question or examine it another way. You may also stop here.",
    approval: {
      status: "PRE_APPROVED",
      approvalId: "EN-005-FB-005",
      constitutionalReferences: [
        "LS-006:constitutional-review",
        "LS-004:humility",
        "LS-002:human-freedom",
      ],
    },
  },
  REVISION_FAILURE: {
    category: "REVISION_FAILURE",
    text: "I couldn't produce a reliable response to that. You may try a different approach, continue examining the question, or stop here.",
    approval: {
      status: "PRE_APPROVED",
      approvalId: "EN-005-FB-006",
      constitutionalReferences: [
        "LS-006:improvement",
        "LS-004:humility",
        "LS-002:human-freedom",
      ],
    },
  },
} as const satisfies Record<FallbackCategory, PreApprovedFallback>;

export const preApprovedFallbackVariants = {
  SELF_WORTH_PROVIDER_REFUSAL: {
    category: "TECHNICAL_LIMITATION",
    text: "I can't agree that a painful situation makes you worthless or a failure. A specific event can be examined without turning it into a total judgment about who you are. You may name the situation if you want, or stop here.",
    approval: {
      status: "PRE_APPROVED",
      approvalId: "EN-005-FB-007",
      constitutionalReferences: [
        "LS-002:human-dignity",
        "LS-002:human-freedom",
        "ST-001:boundaries",
        "ST-001:human-authority",
      ],
    },
  },
  ETHICAL_PRESSURE: {
    category: "ETHICAL_BOUNDARY",
    text: "I can't help pressure or coerce someone into agreeing. Disagreement can be addressed without overriding their choice. Try saying: “I disagree because __; what concern would you need addressed to consider my view?”",
    approval: {
      status: "PRE_APPROVED",
      approvalId: "EN-005-FB-008",
      constitutionalReferences: [
        "LS-002:human-dignity",
        "LS-002:human-freedom",
        "ST-001:boundaries",
      ],
    },
  },
  ETHICAL_GUILT: {
    category: "ETHICAL_BOUNDARY",
    text: "I can't help make someone feel guilty to control their response. Hurt can be expressed honestly without controlling their choice. Try saying: “When __ happened, I felt __, and I need __ going forward.”",
    approval: {
      status: "PRE_APPROVED",
      approvalId: "EN-005-FB-009",
      constitutionalReferences: [
        "LS-002:human-dignity",
        "LS-002:human-freedom",
        "ST-001:boundaries",
      ],
    },
  },
  ETHICAL_DECEPTION: {
    category: "ETHICAL_BOUNDARY",
    text: "I can't help deceive someone or make a lie believable. Use a truthful proposal or repair step instead: state what you want, give the real reasons, and correct any fact you previously misrepresented.",
    approval: {
      status: "PRE_APPROVED",
      approvalId: "EN-005-FB-010",
      constitutionalReferences: [
        "LS-002:human-dignity",
        "LS-002:human-freedom",
        "ST-001:boundaries",
      ],
    },
  },
  ETHICAL_INTIMIDATION: {
    category: "ETHICAL_BOUNDARY",
    text: "I can't help scare or intimidate someone into listening. Frustration can be expressed without threats. Try saying: “This matters because __; if we cannot resolve it, I will __,” using a boundary you control.",
    approval: {
      status: "PRE_APPROVED",
      approvalId: "EN-005-FB-011",
      constitutionalReferences: [
        "LS-002:human-dignity",
        "LS-002:human-freedom",
        "ST-001:boundaries",
      ],
    },
  },
  ETHICAL_DEPENDENCY: {
    category: "ETHICAL_BOUNDARY",
    text: "I can't help create emotional dependence or reduce another person's autonomy. Wanting closeness is understandable, but connection should be mutual and consent-based. Try asking: “I would like more closeness; what level of contact feels comfortable and mutual to you?”",
    approval: {
      status: "PRE_APPROVED",
      approvalId: "EN-005-FB-012",
      constitutionalReferences: [
        "LS-002:human-dignity",
        "LS-002:human-freedom",
        "ST-001:boundaries",
      ],
    },
  },
} as const satisfies Record<string, PreApprovedFallback>;

function ethicalBoundaryFallbackFor(
  learnerMessage: string,
): PreApprovedFallback {
  const text = learnerMessage.trim().toLowerCase();
  if (/\bdepend on me emotionally\b/.test(text)) {
    return preApprovedFallbackVariants.ETHICAL_DEPENDENCY;
  }
  if (/\b(?:scare|intimidat|threaten)\w*/.test(text)) {
    return preApprovedFallbackVariants.ETHICAL_INTIMIDATION;
  }
  if (/\b(?:guilt|feel guilty)\b/.test(text)) {
    return preApprovedFallbackVariants.ETHICAL_GUILT;
  }
  if (/\b(?:lie|lying|deceiv|trick|believable)\w*/.test(text)) {
    return preApprovedFallbackVariants.ETHICAL_DECEPTION;
  }
  if (/\b(?:pressure|coerc|manipulat)\w*/.test(text)) {
    return preApprovedFallbackVariants.ETHICAL_PRESSURE;
  }
  return preApprovedFallbacks.ETHICAL_BOUNDARY;
}

function fallbackFor(input: FallbackSelectionInput): PreApprovedFallback {
  const selected = input.strategySelection === null
    ? []
    : [
        input.strategySelection.primary,
        ...input.strategySelection.secondary,
      ];

  if (selected.includes("CS-006")) return preApprovedFallbacks.SAFETY;
  if (selected.includes("CS-007")) {
    return ethicalBoundaryFallbackFor(
      input.currentSessionContext.learnerMessage,
    );
  }
  if (
    selected.includes("CS-001") &&
    input.currentSessionContext.providerFailure === "PB-FAIL-005"
  ) {
    return preApprovedFallbackVariants.SELF_WORTH_PROVIDER_REFUSAL;
  }

  if (
    input.revisionOutcome === "FAILED" ||
    input.currentSessionContext.failureReason === "revision-failed" ||
    input.currentSessionContext.failureReason === "revision-preservation-failed"
  ) {
    return preApprovedFallbacks.REVISION_FAILURE;
  }

  if (
    input.reviewOutcome === "REJECTED" ||
    input.currentSessionContext.failureReason ===
      "constitutional-review-rejected" ||
    input.currentSessionContext.failureReason === "revision-review-failed" ||
    input.currentSessionContext.failureReason === "revision-review-invalid"
  ) {
    return preApprovedFallbacks.REVIEW_REJECTION;
  }

  // EN-005 permits this path before EN-002 when an upstream technical failure
  // makes a trustworthy behavior plan impossible.
  if (!input.currentSessionContext.behaviorPlanAvailable) {
    return preApprovedFallbacks.TECHNICAL_LIMITATION;
  }

  if (input.currentSessionContext.intent === "unclear") {
    return preApprovedFallbacks.CONSTITUTIONAL_UNCERTAINTY;
  }

  return preApprovedFallbacks.TECHNICAL_LIMITATION;
}

export function selectFallback(
  input: FallbackSelectionInput,
): FallbackSelection {
  const fallback = fallbackFor(input);
  return {
    ...fallback,
    selectedFrom: {
      primaryStrategy: input.strategySelection?.primary ?? null,
      reviewOutcome: input.reviewOutcome,
      revisionOutcome: input.revisionOutcome,
      failureReason: input.currentSessionContext.failureReason,
      providerFailure: input.currentSessionContext.providerFailure,
    },
  };
}
