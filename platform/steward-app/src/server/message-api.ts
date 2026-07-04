import type { ModelAdapter } from "../model/client.js";
import type { LearnerSafeResponse } from "../steward/conversation-engine.js";
import { runLearnerConversation } from "../steward/learner-conversation.js";

export const maximumMessageLength = 4_000;

export class InvalidMessageRequest extends Error {
  readonly code = "INVALID_MESSAGE_REQUEST";
}

function parseMessage(body: unknown): string {
  if (
    typeof body !== "object" ||
    body === null ||
    Array.isArray(body) ||
    Object.keys(body).length !== 1 ||
    !("message" in body) ||
    typeof body.message !== "string"
  ) {
    throw new InvalidMessageRequest();
  }

  const message = body.message.trim();
  if (message.length === 0 || message.length > maximumMessageLength) {
    throw new InvalidMessageRequest();
  }
  return message;
}

/**
 * The only server operation available to a learner-facing client.
 * Its return type cannot include privileged engine inspection data.
 */
export async function processLearnerMessage(
  model: ModelAdapter,
  body: unknown,
): Promise<LearnerSafeResponse> {
  return runLearnerConversation(model, parseMessage(body));
}

export function learnerResponseBody(
  response: LearnerSafeResponse,
): LearnerSafeResponse {
  return {
    kind: response.kind,
    text: response.text,
    revisions: response.revisions,
  };
}
