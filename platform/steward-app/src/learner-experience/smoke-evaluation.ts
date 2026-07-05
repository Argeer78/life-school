import type { ModelAdapter } from "../model/client.js";
import type { LearnerSafeResponse } from "../steward/conversation-engine.js";
import { processLearnerMessage } from "../server/message-api.js";
import {
  learnerExperienceSmokePrompts,
  type LearnerExperienceSmokePrompt,
} from "./smoke-fixtures.js";

export const learnerExperienceReferenceWordLimit = 120;
export const learnerExperienceListItemThreshold = 3;

export interface LearnerExperienceResponseObservation {
  readonly responseLength: {
    readonly characters: number;
    readonly words: number;
    readonly sentences: number;
  };
  readonly usefulNextStep: "HUMAN_REVIEW_REQUIRED";
  readonly appearsToExposeInternalMetadata: boolean;
  readonly listItemCount: number;
  readonly appearsListHeavy: boolean;
  readonly exceedsReferenceWordLimit: boolean;
}

export interface LearnerExperienceSmokeResult {
  readonly id: LearnerExperienceSmokePrompt["id"];
  readonly learnerPrompt: string;
  readonly response: LearnerSafeResponse;
  readonly observation: LearnerExperienceResponseObservation;
}

export type LearnerExperienceModelFactory = (
  fixture: LearnerExperienceSmokePrompt,
) => ModelAdapter;

const internalMetadataPattern =
  /\b(?:developerTrace|strategySelection|behaviorPlanning|providerRequest|providerResponse|principleResults|reviewResult|internalPrompt|rawError|PB-FAIL-\d+|CS-\d{3}|EN-\d{3})\b/i;

function wordCount(text: string): number {
  return text.trim().length === 0 ? 0 : text.trim().split(/\s+/).length;
}

function sentenceCount(text: string): number {
  return (text.match(/[.!?]+(?:["'”’)\]]+)?(?=\s|$)/g) ?? []).length;
}

function listItemCount(text: string): number {
  return text
    .split(/\r?\n/)
    .filter((line) => /^\s*(?:[-*]|\d+[.)])\s+/.test(line)).length;
}

/**
 * Records deterministic surface indicators only. Whether a response contains
 * one genuinely useful next step remains a human LX-001 judgment.
 */
export function observeLearnerExperienceResponse(
  response: LearnerSafeResponse,
): LearnerExperienceResponseObservation {
  const words = wordCount(response.text);
  const listItems = listItemCount(response.text);
  return {
    responseLength: {
      characters: response.text.length,
      words,
      sentences: sentenceCount(response.text),
    },
    usefulNextStep: "HUMAN_REVIEW_REQUIRED",
    appearsToExposeInternalMetadata: internalMetadataPattern.test(response.text),
    listItemCount: listItems,
    appearsListHeavy: listItems >= learnerExperienceListItemThreshold,
    exceedsReferenceWordLimit: words > learnerExperienceReferenceWordLimit,
  };
}

/**
 * Executes the LX smoke fixtures through the production learner-safe API.
 * It does not score constitutional or semantic response quality.
 */
export async function runLearnerExperienceSmokeSet(
  createModel: LearnerExperienceModelFactory,
): Promise<readonly LearnerExperienceSmokeResult[]> {
  const results: LearnerExperienceSmokeResult[] = [];
  for (const fixture of learnerExperienceSmokePrompts) {
    const response = await processLearnerMessage(createModel(fixture), {
      message: fixture.learnerPrompt,
    });
    results.push({
      id: fixture.id,
      learnerPrompt: fixture.learnerPrompt,
      response,
      observation: observeLearnerExperienceResponse(response),
    });
  }
  return results;
}
