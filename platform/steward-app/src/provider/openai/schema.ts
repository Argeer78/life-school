import { providerOutputSchemaVersion } from "../contract.js";

export const openAIProviderResultSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "response",
    "confidence",
    "uncertainty",
    "refusal",
    "notes",
    "schemaVersion",
  ],
  properties: {
    response: { type: "string" },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    uncertainty: { type: "boolean" },
    refusal: { type: "boolean" },
    notes: {
      type: "array",
      items: { type: "string" },
    },
    schemaVersion: {
      type: "string",
      enum: [providerOutputSchemaVersion],
    },
  },
} as const;
