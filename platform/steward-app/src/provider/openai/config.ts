import type { GenerationProvider } from "../contract.js";
import { ProviderBoundaryError } from "../failure.js";
import { createOpenAIProviderFromEnvironment } from "./adapter.js";

export type ProviderMode = "fake" | "openai";
export type OpenAIProviderFactory = (
  environment: NodeJS.ProcessEnv,
) => GenerationProvider;

export function configuredProviderMode(
  environment: NodeJS.ProcessEnv = process.env,
): ProviderMode {
  const value = environment.STEWARD_PROVIDER?.trim().toLowerCase();
  if (value === undefined || value === "" || value === "fake") return "fake";
  if (value === "openai") return "openai";
  throw new ProviderBoundaryError(
    "PB-FAIL-006",
    "UNSUPPORTED_PROVIDER_CONFIGURATION",
  );
}

export function createConfiguredGenerationProvider(
  environment: NodeJS.ProcessEnv = process.env,
  openAIFactory: OpenAIProviderFactory = createOpenAIProviderFromEnvironment,
): GenerationProvider | null {
  return configuredProviderMode(environment) === "openai"
    ? openAIFactory(environment)
    : null;
}
