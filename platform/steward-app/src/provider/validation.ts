import {
  maximumProviderResponseCharacters,
  providerOutputSchemaVersion,
  type ProviderResult,
} from "./contract.js";
import { ProviderBoundaryError } from "./failure.js";

const providerResultFields = [
  "response",
  "confidence",
  "uncertainty",
  "refusal",
  "notes",
  "schemaVersion",
] as const;

const prohibitedFieldPattern =
  /chain.?of.?thought|internal.?reasoning|reasoning|analysis|internal.?prompt|audit|review|revision|inspection/i;
const prohibitedContentPattern =
  /chain.?of.?thought|internal reasoning|internal prompt|privileged audit|review (?:result|finding|detail)|revision (?:record|result|detail)|inspection data|engine implementation/i;
const negativeReasoningAttestationPattern =
  /\b(?:did not|does not|do not|doesn't|didn't|no)\s+(?:include|contain|provide|expose|return)?\s*(?:chain.?of.?thought|internal reasoning)(?:\s+or\s+(?:chain.?of.?thought|internal reasoning))?\b/gi;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasUnpairedSurrogate(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (next < 0xdc00 || next > 0xdfff) return true;
      index += 1;
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      return true;
    }
  }
  return false;
}

function parseRawProviderOutput(value: unknown): unknown {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    throw new ProviderBoundaryError(
      "PB-FAIL-003",
      "MALFORMED_PROVIDER_OUTPUT",
    );
  }
}

function noteContainsProhibitedContent(note: string): boolean {
  return prohibitedContentPattern.test(
    note.replace(negativeReasoningAttestationPattern, ""),
  );
}

export function validateProviderResult(
  rawValue: unknown,
  expectedSchemaVersion: string,
): ProviderResult {
  const value = parseRawProviderOutput(rawValue);
  if (!isRecord(value)) {
    throw new ProviderBoundaryError("PB-FAIL-003", "INVALID_PROVIDER_OBJECT");
  }

  const keys = Object.keys(value);
  if (
    keys.some((key) => prohibitedFieldPattern.test(key)) ||
    keys.length !== providerResultFields.length ||
    !providerResultFields.every((field) => keys.includes(field))
  ) {
    throw new ProviderBoundaryError("PB-FAIL-004", "PROVIDER_SCHEMA_FIELDS");
  }

  if (
    typeof value.response !== "string" ||
    typeof value.confidence !== "number" ||
    !Number.isFinite(value.confidence) ||
    value.confidence < 0 ||
    value.confidence > 1 ||
    typeof value.uncertainty !== "boolean" ||
    typeof value.refusal !== "boolean" ||
    !Array.isArray(value.notes) ||
    !value.notes.every((note) => typeof note === "string") ||
    typeof value.schemaVersion !== "string"
  ) {
    throw new ProviderBoundaryError("PB-FAIL-004", "PROVIDER_SCHEMA_TYPES");
  }

  if (
    value.schemaVersion !== providerOutputSchemaVersion ||
    value.schemaVersion !== expectedSchemaVersion
  ) {
    throw new ProviderBoundaryError("PB-FAIL-004", "PROVIDER_SCHEMA_VERSION");
  }

  if (
    value.response.length > maximumProviderResponseCharacters ||
    value.notes.some((note) => note.length > 1_000)
  ) {
    throw new ProviderBoundaryError("PB-FAIL-004", "PROVIDER_OUTPUT_OVERSIZED");
  }

  if (
    hasUnpairedSurrogate(value.response) ||
    value.notes.some(hasUnpairedSurrogate)
  ) {
    throw new ProviderBoundaryError("PB-FAIL-004", "PROVIDER_OUTPUT_ENCODING");
  }

  if (
    prohibitedContentPattern.test(value.response) ||
    value.notes.some(noteContainsProhibitedContent)
  ) {
    throw new ProviderBoundaryError(
      "PB-FAIL-004",
      "PROHIBITED_PROVIDER_CONTENT",
    );
  }

  try {
    JSON.stringify(value);
  } catch {
    throw new ProviderBoundaryError(
      "PB-FAIL-003",
      "UNSERIALIZABLE_PROVIDER_OUTPUT",
    );
  }

  if (value.refusal) {
    throw new ProviderBoundaryError("PB-FAIL-005", "PROVIDER_REFUSAL");
  }
  if (value.response.trim().length === 0) {
    throw new ProviderBoundaryError("PB-FAIL-004", "EMPTY_PROVIDER_RESPONSE");
  }

  return {
    response: value.response,
    confidence: value.confidence,
    uncertainty: value.uncertainty,
    refusal: value.refusal,
    notes: [...value.notes],
    schemaVersion: providerOutputSchemaVersion,
  };
}
