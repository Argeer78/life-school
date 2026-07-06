import type { ConstitutionalSectionId } from "./constitutional-registry.js";
import {
  conversationStrategyIds,
  isConversationStrategyId,
  strategyPriority,
  type ConversationStrategyId,
} from "./conversation-strategy-registry.js";

export const constitutionalResolutionOrder = [
  "safety",
  "dignity",
  "freedom",
  "responsibility",
  "truthful-examination",
] as const;

export type ConstitutionalResolutionPrinciple =
  (typeof constitutionalResolutionOrder)[number];

export type StewardBoundary = "ST-001:human-authority";

export interface ConversationTurn {
  readonly role: "learner" | "steward";
  readonly content: string;
}

export interface StrategySelectionInput {
  readonly learnerMessage: string;
  readonly currentConversation: readonly ConversationTurn[];
  readonly availableStrategies: readonly ConversationStrategyId[];
}

export interface StrategySelection {
  readonly primary: ConversationStrategyId;
  readonly secondary: readonly ConversationStrategyId[];
  readonly confidence: number;
  readonly constitutionalJustification: {
    readonly sections: readonly ConstitutionalSectionId[];
    readonly resolutionOrder: readonly ConstitutionalResolutionPrinciple[];
    readonly primaryResolutionPrinciple: ConstitutionalResolutionPrinciple;
    readonly stewardBoundary: StewardBoundary | null;
  };
}

const allowedPairs = [
  ["CS-001", "CS-004"],
  ["CS-001", "CS-006"],
  ["CS-001", "CS-010"],
  ["CS-001", "CS-011"],
  ["CS-001", "CS-012"],
  ["CS-002", "CS-003"],
  ["CS-002", "CS-004"],
  ["CS-002", "CS-005"],
  ["CS-002", "CS-006"],
  ["CS-002", "CS-011"],
  ["CS-003", "CS-004"],
  ["CS-003", "CS-005"],
  ["CS-003", "CS-006"],
  ["CS-003", "CS-008"],
  ["CS-003", "CS-009"],
  ["CS-003", "CS-011"],
  ["CS-004", "CS-005"],
  ["CS-004", "CS-006"],
  ["CS-004", "CS-007"],
  ["CS-004", "CS-010"],
  ["CS-004", "CS-011"],
  ["CS-005", "CS-006"],
  ["CS-005", "CS-007"],
  ["CS-005", "CS-011"],
  ["CS-006", "CS-007"],
  ["CS-006", "CS-010"],
  ["CS-006", "CS-011"],
  ["CS-006", "CS-012"],
  ["CS-007", "CS-011"],
  ["CS-008", "CS-009"],
  ["CS-008", "CS-012"],
  ["CS-009", "CS-012"],
  ["CS-010", "CS-011"],
  ["CS-010", "CS-012"],
  ["CS-011", "CS-012"],
] as const satisfies readonly (readonly [
  ConversationStrategyId,
  ConversationStrategyId,
])[];

function pairKey(
  first: ConversationStrategyId,
  second: ConversationStrategyId,
): string {
  return [first, second].sort().join("+");
}

const combinationKeys = new Set(
  allowedPairs.map(([first, second]) => pairKey(first, second)),
);

export function canCombineStrategies(
  first: ConversationStrategyId,
  second: ConversationStrategyId,
): boolean {
  return first === second || combinationKeys.has(pairKey(first, second));
}

const constitutionalSectionsByStrategy = {
  "CS-001": [
    "CA-001:meaning",
    "LS-002:human-dignity",
    "ST-001:boundaries",
  ],
  "CS-002": [
    "LS-002:human-freedom",
    "LS-002:human-responsibility",
    "ST-001:decision-support",
  ],
  "CS-003": ["LS-004:humility", "ST-001:explanations"],
  "CS-004": [
    "LS-002:human-dignity",
    "LS-002:human-freedom",
    "ST-001:conversation",
  ],
  "CS-005": [
    "LS-002:human-dignity",
    "LS-002:human-responsibility",
    "ST-001:conversation",
  ],
  "CS-006": [
    "LS-002:human-dignity",
    "LS-002:human-responsibility",
    "LS-004:the-limits-of-life-school",
  ],
  "CS-007": [
    "LS-002:human-freedom",
    "LS-004:the-limits-of-life-school",
    "ST-001:boundaries",
  ],
  "CS-008": [
    "LS-003:how-learning-happens",
    "ST-001:explanations",
  ],
  "CS-009": ["LS-003:how-life-school-serves", "ST-001:questions"],
  "CS-010": [
    "CA-001:meaning",
    "LS-004:the-limits-of-life-school",
    "ST-001:boundaries",
  ],
  "CS-011": ["LS-002:human-dignity", "ST-001:conversation"],
  "CS-012": [
    "CA-001:meaning",
    "LS-002:human-freedom",
    "ST-001:questions",
  ],
} as const satisfies Record<
  ConversationStrategyId,
  readonly ConstitutionalSectionId[]
>;

const resolutionPrincipleByStrategy = {
  "CS-001": "dignity",
  "CS-002": "responsibility",
  "CS-003": "truthful-examination",
  "CS-004": "dignity",
  "CS-005": "dignity",
  "CS-006": "safety",
  "CS-007": "freedom",
  "CS-008": "truthful-examination",
  "CS-009": "truthful-examination",
  "CS-010": "dignity",
  "CS-011": "dignity",
  "CS-012": "freedom",
} as const satisfies Record<
  ConversationStrategyId,
  ConstitutionalResolutionPrinciple
>;

type StrategyScores = Record<ConversationStrategyId, number>;

function emptyScores(): StrategyScores {
  return Object.fromEntries(
    conversationStrategyIds.map((strategy) => [strategy, 0]),
  ) as StrategyScores;
}

function matches(text: string, pattern: RegExp): boolean {
  return pattern.test(text);
}

function isTestedPerspectiveTransfer(message: string): boolean {
  return /\bwhat would you do if you were me\??\s*$/.test(
    message.trim().toLowerCase(),
  );
}

function isPrimaryUncertaintyPrompt(message: string): boolean {
  const text = message.trim().toLowerCase();
  return matches(
    text,
    /\b(will (?:this|that|my|our|the) .{0,50}work out|(?:biggest|worst) mistake of my life|is (?:this|that|it) definitely (?:the )?(?:right|wrong|best)\b|how do you know (?:that )?you(?:'re| are) right|are you (?:really )?sure (?:that )?you(?:'re| are) right|what makes you (?:so )?(?:sure|certain) (?:that )?you(?:'re| are) right)\b/,
  );
}

function isImpossibleGuaranteePrompt(message: string): boolean {
  return /\b(?:can|could|will|would) you promise (?:me )?(?:that )?.{0,40}(?:okay|alright|fine|work out)\b/.test(
    message.trim().toLowerCase(),
  );
}

function isMeaningPurposePrompt(message: string): boolean {
  return /\b(my purpose|purpose of my life|what is my purpose|life (?:have|has) meaning|does my life have meaning|meaning of (?:my )?life|life meaningful|meaningful life|nothing matters|good life|why am i here|why i exist|dedicate my life|direction in life|life direction|fulfillment|fulfilment|significance of (?:my )?life|life significance)\b/.test(
    message.trim().toLowerCase(),
  );
}

function isEmotionalMeaninglessnessPrompt(message: string): boolean {
  return /\b(?:i feel|i'm feeling|i am feeling)(?: like)? nothing matters\b/.test(
    message.trim().toLowerCase(),
  );
}

function hasSecondaryConflictSignal(message: string): boolean {
  const text = message.trim().toLowerCase();
  return matches(
    text,
    /\b(embarrass(?:ed|ing)?|humiliat\w*|arguments?|argu(?:e|ed|ing)|yell(?:ed|ing)?|shout(?:ed|ing)?|accus(?:e|ed|ation|ing)|always lies|keeps? lying|repeated(?:ly)? dishonest|retaliat\w*|revenge|(?:want|make).{0,24}(?:them|him|her).{0,20}regret|cut .{0,24} out of (?:my|our|their) li(?:fe|ves)|escalat\w*.{0,24}(?:disagreement|argument|conflict)|(?:disagreement|argument|conflict).{0,24}escalat\w*)\b/,
  );
}

export function isFinalAuthorityPrompt(message: string): boolean {
  const text = message.trim().toLowerCase();
  return matches(
    text,
    /\b(final authority|authority (?:on|over|for).{0,35}(?:best|right|life|choices?|self-understanding)|you (?:know|understand) what(?:'s| is) best for me|should i trust (?:you|steward) over (?:myself|my own judgment)|trust your judgment over mine|defer to your judgment|whose judgment.{0,30}authoritative|your judgment should override mine|choose .{0,30} belief .{0,30}(?:follow|adopt) it|your advice .{0,40}responsible for my decision|rank my values .{0,40}must come first|issue a final ruling|constitution change because you decide)\b/,
  );
}

function scoreMessage(message: string): StrategyScores {
  const text = message.trim().toLowerCase();
  const finalAuthorityPrompt = isFinalAuthorityPrompt(text);
  const scores = emptyScores();
  const add = (strategy: ConversationStrategyId, score: number) => {
    scores[strategy] += score;
  };

  const educationalHarm =
    matches(text, /\b(explain|define|learn about|what is)\b/) &&
    matches(text, /\b(harm|suicide|violence|abuse)\b/);
  if (
    !educationalHarm &&
    (matches(
      text,
      /\b((?:i want to|i'm going to|i am going to|thinking about|how (?:can|do) i|help me).{0,30}(?:kill|hurt|harm|attack|make .* suffer)|suicide|self-harm|violence|abuse|immediate danger|driving (?:while|after) (?:drunk|drinking)|someone is threatening|don't want to (?:live|keep living)|not want to (?:live|keep living)|life (?:is|isn't|is not|doesn't seem|does not seem) worth living|better off without me|kill (?:themself|themselves|himself|herself))\b/,
    ) ||
      matches(
        text,
        /\b(?:i(?:'m| am) )?(?:scared|afraid|worried) (?:of |about )?what i might do(?:\s+(?:tonight|today|soon|later))?\b|\bi might (?:hurt|harm|kill) (?:myself|someone|somebody|them|him|her)(?:\s+(?:tonight|today|soon|later))?\b/,
      ))
  ) {
    add("CS-006", 5);
  }

  const educationalManipulation =
    matches(text, /\b(explain|recognize|understand|learn about|what is)\b/) &&
    matches(text, /\b(manipulation|coercion)\b/);
  if (
    !educationalManipulation &&
    (matches(
      text,
      /\b(manipulat|coerc|pressure|guilt|trick|deceiv|convincing lie|blackmail|intimidat|scare(?:s|d)? them into|make .* feel guilty|force .* agree|obey me|psychological tricks|don't deserve a choice|treat them that way|forbid .* question|revenge|retaliat|(?:want|make).{0,24}(?:them|him|her).{0,20}regret)\w*/,
    ) ||
      matches(
        text,
        /\b(make (?:someone|somebody|them|him|her) depend on me emotionally|scare (?:them|him|her|someone|somebody)|make (?:the |a )?lie believable|help me (?:to )?lie|make my lie believable)\b/,
      ))
  ) {
    add("CS-007", 5);
  }

  if (
    matches(
      text,
      /\b(i am|i'm|am i|i feel|tell me i'm)\b.{0,35}\b(failure|worthless|useless|broken|not good enough|bad person|wrong with me|hate myself|ruin everything|don't deserve)\b/,
    ) ||
    matches(
      text,
      /\b(i (?:ruin|destroy|mess up) everything|everything is my fault|every bad outcome is my fault|all (?:bad outcomes?|problems?|failures?) are my fault|i am to blame for everything|i'm to blame for everything)\b/,
    ) ||
    matches(
      text,
      /\b(tell me (?:i'm|i am) (?:definitely |always |objectively )?(?:a )?good person|promise (?:me )?(?:that )?(?:i'm|i am) (?:always )?(?:a )?good person|promise (?:me )?that nothing i do can change (?:that|who i am)|am i (?:really |definitely |objectively )?(?:a )?(?:good|bad) person)\b/,
    ) ||
    matches(text, /\beveryone would be better off without me\b/) ||
    matches(text, /\b(?:nobody|no one) would care if i disappeared\b/) ||
    matches(text, /\bfeeling worthless\b/)
  ) {
    add("CS-001", 4);
  }

  if (
    matches(
      text,
      /\b(who am i|identity|true self|who i really am|what defines me|what kind of person|person should i become|version of myself|assign me the identity|which version of myself|don't recognize (?:myself|the person i've become)|different person|is that who i am|which version is the real me|old self (?:has )?disappeared)\b/,
    )
  ) {
    add("CS-010", 4);
  }

  const decisionSignal =
    matches(
      text,
      /\b(should i|choose|decide|decision|whether (?:i |we )?(?:should|to)|which option|tell me what to do|make the decision|accept this job|quit my job|drop out|spend my savings|invest|end my relationship|moving to|move to|become a lawyer)\b/,
    ) ||
    (!finalAuthorityPrompt && matches(text, /\bbest for me\b/)) ||
    matches(text, /\beither\b.{0,80}\bor\b.{0,80}\bhelp me think\b/);
  if (decisionSignal) {
    add("CS-002", 4);
  }

  const testedPerspectiveTransfer = isTestedPerspectiveTransfer(text);
  if (testedPerspectiveTransfer) {
    add("CS-002", 4);
    add("CS-011", 3);
  }

  const emotionSignal =
    matches(
      text,
      /\b(i feel|i'm feeling|i am feeling)\b.{0,24}\b(angry|furious|sad|scared|terrified|afraid|anxious|hopeless|ashamed|lonely|overwhelmed|frustrated|upset|happy|excited|guilty)\b/,
    ) ||
    matches(
      text,
      /^(i am|i'm)\s+(?:so |very |deeply )?(angry|furious|sad|scared|terrified|afraid|anxious|hopeless|ashamed|lonely|frustrated|upset|happy|excited)\b/,
    ) ||
    matches(text, /\b(grief|grieving|since my .* died)\b/) ||
    isEmotionalMeaninglessnessPrompt(text) ||
    (!decisionSignal && matches(text, /\b(overwhelmed|exhausted)\b/)) ||
    matches(
      text,
      /(συναίσθημα|συναισθήματα|νιώθω|αισθάνομαι|θυμός|θυμωμένα|φόβος|μίσος|αντίδραση)/u,
    );
  if (emotionSignal) add("CS-011", 3);

  if (
    matches(
      text,
      /\b(uncertain|uncertainty|certainty|certain|guarantee|predict|will .* happen|will .* last|will i|whether i will|what will happen|why hasn't|are they angry|secretly|hidden reason|future|forever|outcome|always right)\b/,
    ) ||
    isPrimaryUncertaintyPrompt(text) ||
    isImpossibleGuaranteePrompt(text) ||
    matches(
      text,
      /(αβεβαιότητα|αβέβαιο|δεν γνωρίζω|δεν ξέρω|υπόθεση|υποθέσεις|πληροφορίες που λείπουν|πρόβλεψη|εναλλακτική εξήγηση|εναλλακτικές εξηγήσεις)/u,
    ) ||
    (matches(text, /\bστοιχεία\b/u) &&
      matches(text, /\b(εναλλακτικ|συνέπει)/u)) ||
    (finalAuthorityPrompt &&
      matches(text, /\byou (?:know|understand) what(?:'s| is) best for me\b/))
  ) {
    add("CS-003", 3);
  }

  if (
    matches(
      text,
      /\b(argument|argue|disagreement|conflict|fight|fighting|betrayal|betrayed|unfair|revenge|retaliat|dispute|insulted|criticizing)\b/,
    )
  ) {
    add("CS-005", 3);
  }

  if (
    matches(
      text,
      /\b(friend|partner|relationship|parent|parents|family|brother|sister|colleague|coworker|employee|boss|someone i love|people leave me)\b/,
    )
    || matches(
      text,
      /(φίλος|φίλη|σύντροφος|σχέση|γονείς|οικογένεια|αδελφός|αδελφή|συνάδελφος|προϊστάμενος)/u,
    )
  ) {
    add("CS-004", 3);
  }

  const meaningPurposeSignal = isMeaningPurposePrompt(text);
  if (meaningPurposeSignal) {
    add("CS-012", 4);
  }

  if (
    !meaningPurposeSignal &&
    matches(
      text,
      /^(explain|teach|help me understand|how does|how do|what is)\b|\b(learn|learning|teach me|homework|explanations?|don't understand|do not understand|understand a concept|develop a skill)\b/,
    )
  ) {
    add("CS-008", 3);
  }

  if (
    !meaningPurposeSignal &&
    matches(
      text,
      /^(why|what if|could)\b|\b(explore|curious|wonder|possibilities|perspectives|think more deeply)\b/,
    )
    || (!meaningPurposeSignal &&
      matches(text, /(ερώτηση|ερωτήσεις|εξετάσω|εξετάσεις|διερευνήσω)/u))
  ) {
    add("CS-009", 2);
  }

  return scores;
}

function scoreConversation(input: StrategySelectionInput): StrategyScores {
  const scores = scoreMessage(input.learnerMessage);
  const mostRecentLearnerTurn = [...input.currentConversation]
    .reverse()
    .find(({ role }) => role === "learner");

  if (mostRecentLearnerTurn !== undefined) {
    const contextScores = scoreMessage(mostRecentLearnerTurn.content);
    for (const strategy of conversationStrategyIds) {
      if (contextScores[strategy] > 0) scores[strategy] += 0.25;
    }
  }
  return scores;
}

function confidenceFor(score: number, detectedCount: number): number {
  const raw = 0.55 + Math.min(score, 5) * 0.08 - Math.max(0, detectedCount - 3) * 0.02;
  return Math.max(0, Math.min(1, Number(raw.toFixed(2))));
}

export function selectConversationStrategies(
  input: StrategySelectionInput,
): StrategySelection {
  const available = new Set(input.availableStrategies);
  if (available.size === 0) {
    throw new TypeError("At least one Conversation Strategy must be available.");
  }
  if (![...available].every(isConversationStrategyId)) {
    throw new TypeError("Available strategies must come from the closed registry.");
  }

  const scores = scoreConversation(input);
  const stewardBoundary: StewardBoundary | null = isFinalAuthorityPrompt(
    input.learnerMessage,
  )
    ? "ST-001:human-authority"
    : null;
  let detected = strategyPriority.filter(
    (strategy) => available.has(strategy) && scores[strategy] > 0,
  );
  if (
    isEmotionalMeaninglessnessPrompt(input.learnerMessage) &&
    available.has("CS-012") &&
    detected.includes("CS-012")
  ) {
    detected = [
      "CS-012",
      ...detected.filter((strategy) => strategy !== "CS-012"),
    ];
  }
  if (
    isPrimaryUncertaintyPrompt(input.learnerMessage) &&
    available.has("CS-003") &&
    detected.includes("CS-003") &&
    !detected.some((strategy) =>
      ["CS-006", "CS-007", "CS-001", "CS-010", "CS-011"].includes(strategy),
    )
  ) {
    detected = [
      "CS-003",
      ...detected.filter((strategy) => strategy !== "CS-003"),
    ];
  }
  if (
    isTestedPerspectiveTransfer(input.learnerMessage) &&
    available.has("CS-002") &&
    available.has("CS-011")
  ) {
    detected = [
      "CS-002",
      "CS-011",
      ...detected.filter(
        (strategy) => strategy !== "CS-002" && strategy !== "CS-011",
      ),
    ];
  }

  if (detected.length === 0) {
    const defaultStrategy = available.has("CS-009")
      ? "CS-009"
      : strategyPriority.find((strategy) => available.has(strategy));
    if (defaultStrategy === undefined) {
      throw new TypeError("No registered Conversation Strategy is available.");
    }
    scores[defaultStrategy] = 1;
    detected = [defaultStrategy];
  }

  const primary = detected[0]!;
  const secondary: ConversationStrategyId[] = [];
  for (const candidate of detected.slice(1)) {
    if (
      canCombineStrategies(primary, candidate) &&
      secondary.every((selected) => canCombineStrategies(selected, candidate))
    ) {
      secondary.push(candidate);
    }
  }
  if (
    primary !== "CS-005" &&
    hasSecondaryConflictSignal(input.learnerMessage) &&
    available.has("CS-005") &&
    !secondary.includes("CS-005") &&
    canCombineStrategies(primary, "CS-005") &&
    secondary.every((selected) => canCombineStrategies(selected, "CS-005"))
  ) {
    secondary.push("CS-005");
  }

  const selected = [primary, ...secondary];
  const sections = [
    ...new Set(
      [
        ...selected.flatMap(
          (strategy) => constitutionalSectionsByStrategy[strategy],
        ),
        ...(stewardBoundary === null ? [] : [stewardBoundary]),
      ],
    ),
  ];

  return {
    primary,
    secondary,
    confidence: confidenceFor(scores[primary], detected.length),
    constitutionalJustification: {
      sections,
      resolutionOrder: constitutionalResolutionOrder,
      primaryResolutionPrinciple: resolutionPrincipleByStrategy[primary],
      stewardBoundary,
    },
  };
}
