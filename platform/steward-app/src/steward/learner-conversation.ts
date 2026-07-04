import type { ModelAdapter } from "../model/client.js";
import {
  runConstitutionalConversation,
  type LearnerSafeResponse,
} from "./conversation-engine.js";

/**
 * Learner-facing boundary. It deliberately returns no inspection trace,
 * rejected candidate, review result, plan, mapping, or internal error.
 */
export async function runLearnerConversation(
  model: ModelAdapter,
  userPrompt: string,
): Promise<LearnerSafeResponse> {
  const result = await runConstitutionalConversation(model, userPrompt);
  return result.learnerResponse;
}
