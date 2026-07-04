import type {
  ConstitutionalMappingRequest,
  IntentDetectionRequest,
  ModelAdapter,
  ReviewRequest,
  ReviseRequest,
} from "../model/client.js";
import {
  providerResult,
  type GenerationRequest,
  type ProviderResult,
} from "../provider/contract.js";

type ScriptedValue<T> = T | Error;

export interface FakeModelScript {
  readonly detectIntent?: readonly ScriptedValue<unknown>[];
  readonly mapConstitution?: readonly ScriptedValue<unknown>[];
  readonly generate: readonly ScriptedValue<unknown>[];
  readonly review: readonly unknown[];
  readonly revise?: readonly unknown[];
}

export class FakeModelAdapter implements ModelAdapter {
  readonly calls: string[] = [];
  readonly intentRequests: IntentDetectionRequest[] = [];
  readonly mappingRequests: ConstitutionalMappingRequest[] = [];
  readonly generateRequests: GenerationRequest[] = [];
  readonly reviewRequests: ReviewRequest[] = [];
  readonly reviseRequests: ReviseRequest[] = [];

  private intentIndex = 0;
  private mappingIndex = 0;
  private generateIndex = 0;
  private reviewIndex = 0;
  private reviseIndex = 0;

  constructor(private readonly script: FakeModelScript) {}

  async detectIntent(request: IntentDetectionRequest): Promise<unknown> {
    this.calls.push("intent-detection");
    this.intentRequests.push(request);
    return this.take(
      this.script.detectIntent ?? [],
      this.intentIndex++,
      "detectIntent",
    );
  }

  async mapConstitution(
    request: ConstitutionalMappingRequest,
  ): Promise<unknown> {
    this.calls.push("constitutional-mapping");
    this.mappingRequests.push(request);
    return this.take(
      this.script.mapConstitution ?? [],
      this.mappingIndex++,
      "mapConstitution",
    );
  }

  async generate(request: GenerationRequest): Promise<ProviderResult> {
    this.calls.push("response-generation");
    this.generateRequests.push(request);
    const value = await this.take(
      this.script.generate,
      this.generateIndex++,
      "generate",
    );
    return (typeof value === "string"
      ? providerResult(value)
      : value) as ProviderResult;
  }

  async review(request: ReviewRequest): Promise<unknown> {
    this.calls.push("constitutional-review");
    this.reviewRequests.push(request);
    const index = this.reviewIndex++;
    const value = this.script.review[index];
    if (value === undefined) {
      throw new Error(`No scripted review result at index ${index}.`);
    }
    if (value instanceof Error) throw value;
    if (typeof value === "function") {
      return await (
        value as (reviewRequest: ReviewRequest) => unknown | Promise<unknown>
      )(request);
    }
    return value;
  }

  async revise(request: ReviseRequest): Promise<unknown> {
    this.calls.push("revision");
    this.reviseRequests.push(request);
    const index = this.reviseIndex++;
    const value = (this.script.revise ?? [])[index];
    if (value === undefined) {
      throw new Error(`No scripted revise result at index ${index}.`);
    }
    if (value instanceof Error) throw value;
    if (typeof value === "function") {
      return await (
        value as (reviseRequest: ReviseRequest) => unknown | Promise<unknown>
      )(request);
    }
    return value;
  }

  private async take<T>(
    values: readonly ScriptedValue<T>[],
    index: number,
    method: string,
  ): Promise<T> {
    const value = values[index];
    if (value === undefined) {
      throw new Error(`No scripted ${method} result at index ${index}.`);
    }
    if (value instanceof Error) throw value;
    return value;
  }
}
