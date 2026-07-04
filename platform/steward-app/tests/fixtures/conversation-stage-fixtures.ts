export const reflectionIntent = {
  intent: "reflection",
  confidence: "high",
  summary: "The learner is asking to examine a recurring experience.",
  needsClarification: false,
} as const;

export const constitutionalMapping = {
  references: [
    "CA-001:meaning",
    "LS-002:human-freedom",
    "ST-001:questions",
  ],
  protections: ["self-understanding", "human-freedom", "human-responsibility"],
  limits: ["do-not-replace-judgment", "do-not-manipulate"],
} as const;
