/**
 * Closed registry of constitutional sections the conversation engine may cite.
 * Values are descriptive metadata only; authority remains in the source files.
 */
export const constitutionalSections = {
  "CA-001:purpose": { document: "CA-001", section: "Purpose" },
  "CA-001:meaning": { document: "CA-001", section: "Meaning" },
  "CA-001:constitutional-authority": {
    document: "CA-001",
    section: "Constitutional Authority",
  },
  "CA-001:commitment": { document: "CA-001", section: "Commitment" },
  "LS-001:purpose-relationship": {
    document: "LS-001",
    section: "Purpose Relationship",
  },
  "LS-001:what-life-school-does-not-do": {
    document: "LS-001",
    section: "What Life School Does Not Do",
  },
  "LS-002:self-understanding": {
    document: "LS-002",
    section: "Self-Understanding",
  },
  "LS-002:lifelong-learning": {
    document: "LS-002",
    section: "Lifelong Learning",
  },
  "LS-002:human-dignity": { document: "LS-002", section: "Human Dignity" },
  "LS-002:human-freedom": { document: "LS-002", section: "Human Freedom" },
  "LS-002:human-responsibility": {
    document: "LS-002",
    section: "Human Responsibility",
  },
  "LS-002:relationship-between-protections": {
    document: "LS-002",
    section: "Relationship Between These Protections",
  },
  "LS-003:how-life-school-serves": {
    document: "LS-003",
    section: "How Life School Serves",
  },
  "LS-003:how-learning-happens": {
    document: "LS-003",
    section: "How Learning Happens",
  },
  "LS-003:the-learner": { document: "LS-003", section: "The Learner" },
  "LS-003:constitutional-responsibility": {
    document: "LS-003",
    section: "Constitutional Responsibility",
  },
  "LS-004:the-limits-of-life-school": {
    document: "LS-004",
    section: "The Limits of Life School",
  },
  "LS-004:learning-remains-voluntary": {
    document: "LS-004",
    section: "Learning Remains Voluntary",
  },
  "LS-004:responsibility-remains-human": {
    document: "LS-004",
    section: "Responsibility Remains Human",
  },
  "LS-004:humility": { document: "LS-004", section: "Humility" },
  "LS-004:constitutional-authority": {
    document: "LS-004",
    section: "Constitutional Authority",
  },
  "LS-005:the-constitutional-question": {
    document: "LS-005",
    section: "The Constitutional Question",
  },
  "LS-005:principles-of-decision-making": {
    document: "LS-005",
    section: "Principles of Decision Making",
  },
  "LS-005:examination-before-adoption": {
    document: "LS-005",
    section: "Examination Before Adoption",
  },
  "LS-005:human-responsibility": {
    document: "LS-005",
    section: "Human Responsibility",
  },
  "LS-006:purpose": { document: "LS-006", section: "Purpose" },
  "LS-006:principles": { document: "LS-006", section: "Principles" },
  "LS-006:purpose-review": { document: "LS-006", section: "Purpose Review" },
  "LS-006:constitutional-review": {
    document: "LS-006",
    section: "Constitutional Review",
  },
  "LS-006:challenge": { document: "LS-006", section: "Challenge" },
  "LS-006:improvement": { document: "LS-006", section: "Improvement" },
  "LS-006:human-decision": { document: "LS-006", section: "Human Decision" },
  "LS-007:constitutional-examination": {
    document: "LS-007",
    section: "Constitutional Examination",
  },
  "LS-007:human-responsibility": {
    document: "LS-007",
    section: "Human Responsibility",
  },
  "LS-008:constitutional-stewardship": {
    document: "LS-008",
    section: "Constitutional Stewardship",
  },
  "LS-008:limitations": { document: "LS-008", section: "Limitations" },
  "LS-008:accountability": { document: "LS-008", section: "Accountability" },
  "ST-001:identity": { document: "ST-001", section: "Part I — Identity" },
  "ST-001:purpose": { document: "ST-001", section: "Part II — Purpose" },
  "ST-001:core-principles": {
    document: "ST-001",
    section: "Part III — Core Principles",
  },
  "ST-001:conversation": {
    document: "ST-001",
    section: "Part IV — Conversation",
  },
  "ST-001:questions": { document: "ST-001", section: "Part V — Questions" },
  "ST-001:explanations": {
    document: "ST-001",
    section: "Part VI — Explanations",
  },
  "ST-001:learning": { document: "ST-001", section: "Part VII — Learning" },
  "ST-001:decision-support": {
    document: "ST-001",
    section: "Part VIII — Decision Support",
  },
  "ST-001:boundaries": {
    document: "ST-001",
    section: "Part IX — Boundaries",
  },
  "ST-001:human-authority": {
    document: "ST-001",
    section: "Part X — Human Authority",
  },
  "ST-001:continuous-improvement": {
    document: "ST-001",
    section: "Part XI — Continuous Improvement",
  },
  "ST-001:success": { document: "ST-001", section: "Part XII — Success" },
} as const;

export type ConstitutionalSectionId = keyof typeof constitutionalSections;

const sectionIds = new Set<string>(Object.keys(constitutionalSections));

export const conversationStageAuthority = {
  strategySelection: [
    "LS-003:how-life-school-serves",
    "ST-001:conversation",
    "ST-001:core-principles",
  ],
  intentDetection: [
    "ST-001:conversation",
    "ST-001:questions",
    "ST-001:explanations",
  ],
  constitutionalMapping: [
    "LS-005:the-constitutional-question",
    "LS-006:constitutional-review",
  ],
  behaviorPlanning: [
    "LS-003:how-life-school-serves",
    "ST-001:core-principles",
    "ST-001:questions",
    "ST-001:explanations",
    "ST-001:decision-support",
    "ST-001:boundaries",
  ],
  responseGeneration: [
    "LS-003:how-life-school-serves",
    "ST-001:conversation",
    "ST-001:explanations",
    "ST-001:decision-support",
  ],
  constitutionalReview: [
    "LS-004:the-limits-of-life-school",
    "LS-006:challenge",
    "ST-001:boundaries",
  ],
  revision: [
    "LS-006:improvement",
    "ST-001:continuous-improvement",
  ],
  fallback: [
    "CA-001:commitment",
    "LS-004:learning-remains-voluntary",
    "LS-004:humility",
    "ST-001:explanations",
  ],
} as const satisfies Record<string, readonly ConstitutionalSectionId[]>;

export function isConstitutionalSectionId(
  value: unknown,
): value is ConstitutionalSectionId {
  return typeof value === "string" && sectionIds.has(value);
}
