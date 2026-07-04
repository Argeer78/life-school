import {
  isConstitutionalSectionId,
  type ConstitutionalSectionId,
} from "./constitutional-registry.js";

export const intentKinds = [
  "factual",
  "procedural",
  "reflection",
  "decision-support",
  "unclear",
] as const;

export type IntentKind = (typeof intentKinds)[number];
export type Confidence = "low" | "medium" | "high";

export interface IntentDetection {
  readonly intent: IntentKind;
  readonly confidence: Confidence;
  readonly summary: string;
  readonly needsClarification: boolean;
}

export const constitutionalProtections = [
  "self-understanding",
  "lifelong-learning",
  "human-dignity",
  "human-freedom",
  "human-responsibility",
] as const;

export const constitutionalLimits = [
  "do-not-define-worth",
  "do-not-determine-who-to-become",
  "do-not-replace-judgment",
  "do-not-replace-responsibility",
  "do-not-demand-agreement",
  "do-not-manipulate",
  "do-not-present-uncertainty-as-certainty",
  "do-not-claim-final-authority",
] as const;

export type ConstitutionalProtection =
  (typeof constitutionalProtections)[number];
export type ConstitutionalLimit = (typeof constitutionalLimits)[number];

export interface ConstitutionalMapping {
  readonly references: readonly ConstitutionalSectionId[];
  readonly protections: readonly ConstitutionalProtection[];
  readonly limits: readonly ConstitutionalLimit[];
}

const confidenceValues = new Set<string>(["low", "medium", "high"]);
const intentValues = new Set<string>(intentKinds);
const protectionValues = new Set<string>(constitutionalProtections);
const limitValues = new Set<string>(constitutionalLimits);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isNonEmptyStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every(isNonEmptyString)
  );
}

function isEnumArray(value: unknown, values: Set<string>): value is string[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((entry) => typeof entry === "string" && values.has(entry))
  );
}

export function parseIntentDetection(value: unknown): IntentDetection {
  if (
    !isRecord(value) ||
    typeof value.intent !== "string" ||
    !intentValues.has(value.intent) ||
    typeof value.confidence !== "string" ||
    !confidenceValues.has(value.confidence) ||
    !isNonEmptyString(value.summary) ||
    typeof value.needsClarification !== "boolean"
  ) {
    throw new TypeError("Intent detection does not match schema.");
  }
  return value as unknown as IntentDetection;
}

export function parseConstitutionalMapping(
  value: unknown,
): ConstitutionalMapping {
  if (
    !isRecord(value) ||
    !isNonEmptyStringArray(value.references) ||
    !value.references.every(isConstitutionalSectionId) ||
    !isEnumArray(value.protections, protectionValues) ||
    !isEnumArray(value.limits, limitValues)
  ) {
    throw new TypeError("Constitutional mapping does not match schema.");
  }
  return value as unknown as ConstitutionalMapping;
}
