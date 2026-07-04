import type {
  BehaviorComponentId,
  BehaviorPlan,
} from "./behavior-planning.js";
import type { ConversationStrategyId } from "./conversation-strategy-registry.js";
import type { CorrectedViolation } from "./revision-schema.js";
import type { StrategySelection } from "./strategy-selection.js";

export const preservationCheckIds = [
  "SAME_LEARNER_REQUEST",
  "SAME_SELECTED_STRATEGIES",
  "SAME_BEHAVIOR_OBJECTIVE",
  "NO_NEW_TOPIC_AUTHORITY_DECISION_OR_CLAIM",
  "ACCURATE_REVISION_SUMMARY",
] as const;

export type PreservationCheckId = (typeof preservationCheckIds)[number];

export interface PreservationCheck {
  readonly id: PreservationCheckId;
  readonly passes: boolean;
  readonly reasonCode:
    | "VERIFIED"
    | "MISSING_TOPIC_ANCHOR"
    | "MISSING_STRATEGY_SIGNAL"
    | "INSUFFICIENT_BEHAVIOR_COVERAGE"
    | "NEW_TOPIC_OR_AUTHORITY"
    | "UNCHANGED_RESPONSE"
    | "INACCURATE_SUMMARY";
}

export interface RevisionPreservationVerification {
  readonly verified: boolean;
  readonly checks: readonly PreservationCheck[];
}

export interface RevisionPreservationVerificationInput {
  readonly learnerMessage: string;
  readonly strategySelection: StrategySelection;
  readonly behaviorPlan: BehaviorPlan;
  readonly failedCandidate: string;
  readonly revisedResponse: string;
  readonly revisionSummary: string;
  readonly correctedViolations: readonly CorrectedViolation[];
}

const stopWords = new Set([
  "a", "about", "an", "and", "are", "as", "at", "be", "because", "but", "by", "can",
  "do", "for", "from", "how", "i", "if", "in", "is", "it", "me", "my", "of",
  "on", "or", "please", "should", "so", "that", "the", "their", "them", "this",
  "they", "their", "theirs", "to", "us", "was", "we", "what", "when", "where", "whether", "which", "who",
  "why", "will", "with", "would", "you", "your",
]);

const canonicalTerms: Readonly<Record<string, string>> = {
  choose: "decision",
  chooses: "decision",
  choosing: "decision",
  choice: "decision",
  choices: "decision",
  decide: "decision",
  decides: "decision",
  deciding: "decision",
  decisions: "decision",
  quit: "leave-work",
  quitting: "leave-work",
  leaving: "leave-work",
  resign: "leave-work",
  resigning: "leave-work",
  stay: "leave-work",
  staying: "leave-work",
  job: "work",
  jobs: "work",
  working: "work",
  moved: "move",
  moving: "move",
  relocate: "move",
  relocating: "move",
  feelings: "emotion",
  feeling: "emotion",
  emotions: "emotion",
};

function words(text: string): string[] {
  return text
    .normalize("NFKC")
    .toLowerCase()
    .match(/[\p{L}\p{N}']+/gu)
    ?.map((word) => canonicalTerms[word] ?? word)
    .filter((word) => word.length > 2 && !stopWords.has(word)) ?? [];
}

function hasAny(text: string, patterns: readonly RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

const strategySignals = {
  "CS-001": [/\bworth\b/i, /\bvalue\b/i, /\bdignity\b/i, /\bdeserv/i],
  "CS-002": [
    /\bdecision\b/i,
    /\bchoice\b/i,
    /\boption/i,
    /\bconsequence/i,
    /\bresponsib/i,
    /\bremains yours\b/i,
  ],
  "CS-003": [
    /\buncertain/i,
    /\bmight\b/i,
    /\bmay\b/i,
    /\bcould\b/i,
    /\bnot know\b/i,
    /\bcan't guarantee\b/i,
    /\bcannot guarantee\b/i,
  ],
  "CS-004": [
    /\brelation/i,
    /\bcommunicat/i,
    /\blisten/i,
    /\btalk\b/i,
    /\bperson\b/i,
  ],
  "CS-005": [
    /\bconflict\b/i,
    /\bdisagree/i,
    /\btension\b/i,
    /\bresolve\b/i,
    /\bcommunicat/i,
  ],
  "CS-006": [
    /\bsafe/i,
    /\bharm\b/i,
    /\bdanger\b/i,
    /\bemergency\b/i,
    /\bsupport\b/i,
    /\bhelp\b/i,
  ],
  "CS-007": [
    /\bmanipulat/i,
    /\bcoerc/i,
    /\bdeceiv/i,
    /\bhonest/i,
    /\brespect/i,
    /\bboundar/i,
  ],
  "CS-008": [
    /\blearn/i,
    /\bexplain/i,
    /\bunderstand/i,
    /\bpractice\b/i,
    /\bexample\b/i,
  ],
  "CS-009": [
    /\bexamin/i,
    /\bquestion/i,
    /\bnotice\b/i,
    /\bconsider\b/i,
    /\bcurious/i,
  ],
  "CS-010": [
    /\bidentity\b/i,
    /\bdefine\b/i,
    /\bwho you are\b/i,
    /\bperson\b/i,
  ],
  "CS-011": [
    /\bfeel/i,
    /\bemotion/i,
    /\bexperience\b/i,
    /\bupset\b/i,
    /\bsad\b/i,
    /\bangry\b/i,
  ],
  "CS-012": [
    /\bmeaning\b/i,
    /\bpurpose\b/i,
    /\bmatter/i,
    /\bvalue/i,
    /\bexamin/i,
  ],
} as const satisfies Record<ConversationStrategyId, readonly RegExp[]>;

const behaviorSignals = {
  "acknowledge-experience": [
    /\bunderstand\b/i,
    /\bsounds\b/i,
    /\bexperience\b/i,
    /\bfeel/i,
  ],
  "answer-directly": [/\bis\b/i, /\bmeans\b/i, /\banswer\b/i],
  "explain-concepts": [/\bexplain/i, /\bmeans\b/i, /\bbecause\b/i],
  "ask-reflective-questions": [
    /\?/,
    /\bconsider\b/i,
    /\bnotice\b/i,
    /\bexamin/i,
  ],
  "clarify-uncertainty": [
    /\buncertain/i,
    /\bmay\b/i,
    /\bmight\b/i,
    /\bcould\b/i,
    /\bnot know\b/i,
  ],
  "establish-ethical-boundaries": [
    /\bcan't help\b/i,
    /\bcannot help\b/i,
    /\bboundar/i,
    /\bharm\b/i,
    /\bmanipulat/i,
  ],
  "encourage-learning": [/\blearn/i, /\bexplore\b/i, /\bpractice\b/i],
  "encourage-communication": [
    /\bcommunicat/i,
    /\btalk\b/i,
    /\blisten/i,
    /\bsay\b/i,
  ],
  "encourage-examination": [
    /\bexamin/i,
    /\bconsider\b/i,
    /\breflect/i,
    /\breason/i,
    /\boption/i,
  ],
  "preserve-responsibility": [
    /\bresponsib/i,
    /\bdecision\b/i,
    /\bchoice\b/i,
    /\bconsequence/i,
  ],
  "preserve-freedom": [
    /\bremains yours\b/i,
    /\byou may\b/i,
    /\bif you want\b/i,
    /\bchoice\b/i,
    /\bdecision\b/i,
  ],
} as const satisfies Record<BehaviorComponentId, readonly RegExp[]>;

const summarySignals = {
  HARM_SAFETY: [/\bharm\b/i, /\bsafe/i],
  MANIPULATION_COERCION: [/\bmanipulat/i, /\bcoerc/i, /\bdeceiv/i],
  DIGNITY: [/\bdignity\b/i, /\brespect/i, /\bexperience\b/i],
  FREEDOM: [/\bfreedom\b/i, /\bchoice\b/i, /\bdecision\b/i],
  RESPONSIBILITY: [/\bresponsib/i, /\bchoice\b/i, /\bdecision\b/i],
  TRUTHFUL_EXAMINATION: [/\btruth/i, /\buncertain/i, /\bexamin/i],
  INTELLECTUAL_HONESTY: [/\bhonest/i, /\bcertainty\b/i, /\bexplain/i],
  CONVERSATIONAL_QUALITY: [
    /\bclar/i,
    /\bword/i,
    /\bconversation/i,
    /\bdirect/i,
  ],
} as const;

const forbiddenIntroductionPatterns = [
  /\b(?:forget|ignore|unrelated to) (?:the|that|this|your) (?:question|request|topic)\b/i,
  /\b(?:instead|now),? (?:let's|let us) (?:discuss|talk about)\b/i,
  /\bas (?:the|your) (?:final )?authority\b/i,
  /\bthe constitution (?:commands|requires) you\b/i,
  /\bi (?:command|order) you\b/i,
  /\byou (?:must|have to|need to) (?:quit|leave|stay|choose|decide|accept|reject)\b/i,
  /\b(?:definitely|certainly|guaranteed|without doubt)\b/i,
  /\bthe fact is\b/i,
];

const permittedRevisionTerms = new Set([
  "acknowledge", "answer", "boundary", "choice", "clarify", "communicate",
  "communication", "consequence", "consequences", "consider", "continue",
  "could", "decision", "dignity", "emotion", "examine", "experience", "explain",
  "explore", "feel", "freedom", "harm", "help", "honest", "know", "learn",
  "learner", "may", "meaning", "might", "notice", "option", "options", "purpose",
  "question", "reason", "reasons", "reflect", "relationship", "remains",
  "respect", "responsibility", "safe", "safety", "support", "talk", "truth",
  "uncertain", "understand", "value", "want", "worth", "yours",
]);

function check(
  id: PreservationCheckId,
  passes: boolean,
  failure: Exclude<PreservationCheck["reasonCode"], "VERIFIED">,
): PreservationCheck {
  return { id, passes, reasonCode: passes ? "VERIFIED" : failure };
}

export function verifyRevisionPreservation(
  input: RevisionPreservationVerificationInput,
): RevisionPreservationVerification {
  const sourceTerms = new Set([
    ...words(input.learnerMessage),
    ...words(input.failedCandidate),
  ]);
  const revisedTerms = new Set(words(input.revisedResponse));
  const hasTopicAnchor = [...sourceTerms].some((term) => revisedTerms.has(term));

  const strategies = [
    input.strategySelection.primary,
    ...input.strategySelection.secondary,
  ];
  const strategiesPreserved = strategies.every((strategy) =>
    hasAny(input.revisedResponse, strategySignals[strategy]),
  );

  const matchedComponents = input.behaviorPlan.components.filter((component) =>
    hasAny(input.revisedResponse, behaviorSignals[component.id]),
  ).length;
  const requiredComponentCoverage = Math.max(
    1,
    Math.ceil(input.behaviorPlan.components.length * 0.4),
  );
  const behaviorObjectivePreserved =
    matchedComponents >= requiredComponentCoverage;

  const unchanged =
    input.failedCandidate.trim().toLowerCase() ===
    input.revisedResponse.trim().toLowerCase();
  const introducedForbiddenContent = hasAny(
    input.revisedResponse,
    forbiddenIntroductionPatterns,
  );
  const introducedTopicTerms = [...revisedTerms].filter(
    (term) => !sourceTerms.has(term) && !permittedRevisionTerms.has(term),
  );

  const summaryDescribesChange =
    /\b(?:add|clarif|correct|improv|preserv|remov|replac|return|strengthen)\w*\b/i.test(
      input.revisionSummary,
    ) &&
    input.correctedViolations.every((violation) =>
      hasAny(input.revisionSummary, summarySignals[violation.category]),
    );

  const checks = [
    check("SAME_LEARNER_REQUEST", hasTopicAnchor, "MISSING_TOPIC_ANCHOR"),
    check(
      "SAME_SELECTED_STRATEGIES",
      strategiesPreserved,
      "MISSING_STRATEGY_SIGNAL",
    ),
    check(
      "SAME_BEHAVIOR_OBJECTIVE",
      behaviorObjectivePreserved,
      "INSUFFICIENT_BEHAVIOR_COVERAGE",
    ),
    check(
      "NO_NEW_TOPIC_AUTHORITY_DECISION_OR_CLAIM",
      !introducedForbiddenContent && introducedTopicTerms.length === 0,
      "NEW_TOPIC_OR_AUTHORITY",
    ),
    check(
      "ACCURATE_REVISION_SUMMARY",
      !unchanged && summaryDescribesChange,
      unchanged ? "UNCHANGED_RESPONSE" : "INACCURATE_SUMMARY",
    ),
  ] as const;

  return {
    verified: checks.every(({ passes }) => passes),
    checks,
  };
}
