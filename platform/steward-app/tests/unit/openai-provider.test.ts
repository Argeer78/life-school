import { readFile } from "node:fs/promises";
import { describe, expect, it, vi } from "vitest";
import {
  providerContractVersion,
  providerOutputSchemaVersion,
  providerResult,
  type GenerationProvider,
  type GenerationRequest,
} from "../../src/provider/contract.js";
import { ProviderBoundaryError } from "../../src/provider/failure.js";
import {
  OpenAIGenerationProvider,
  createOpenAIProviderFromEnvironment,
  mapOpenAIError,
  type OpenAIResponsesClient,
} from "../../src/provider/openai/adapter.js";
import {
  configuredProviderMode,
  createConfiguredGenerationProvider,
} from "../../src/provider/openai/config.js";
import { planFromStrategySelection } from "../../src/steward/behavior-planning.js";
import { conversationStrategyIds } from "../../src/steward/conversation-strategy-registry.js";
import { runConstitutionalConversation } from "../../src/steward/conversation-engine.js";
import { preApprovedFallbacks } from "../../src/steward/fallback.js";
import { selectConversationStrategies } from "../../src/steward/strategy-selection.js";
import { createLocalDemoFakeModel } from "../../src/server/local-demo-model.js";

function generationRequest(
  learnerMessage = "Should I change jobs?",
): GenerationRequest {
  const strategySelection = selectConversationStrategies({
    learnerMessage,
    currentConversation: [],
    availableStrategies: conversationStrategyIds,
  });
  return {
    learnerMessage,
    currentConversation: [],
    strategySelection,
    behaviorPlan: planFromStrategySelection(
      learnerMessage,
      strategySelection,
    ),
    constitutionalConstraints: {
      references: [
        "LS-002:human-freedom",
        "LS-002:human-responsibility",
        "ST-001:decision-support",
      ],
      protections: ["human-freedom", "human-responsibility"],
      limits: ["do-not-replace-judgment", "do-not-replace-responsibility"],
    },
    providerContractVersion,
    outputSchemaVersion: providerOutputSchemaVersion,
  };
}

function mockClient(output: unknown): {
  readonly client: OpenAIResponsesClient;
  readonly create: ReturnType<typeof vi.fn>;
} {
  const create = vi.fn().mockResolvedValue(output);
  return {
    client: { create },
    create,
  };
}

describe("OpenAI generation provider", () => {
  it("maps a mocked Responses API result into ProviderResult", async () => {
    const expected = providerResult("The choice remains yours.");
    const mocked = mockClient({ output_text: JSON.stringify(expected) });
    const provider = new OpenAIGenerationProvider({
      client: mocked.client,
      model: "gpt-test",
      timeoutMs: 100,
    });

    await expect(provider.generate(generationRequest())).resolves.toEqual(
      expected,
    );
    expect(mocked.create).toHaveBeenCalledOnce();
    const body = mocked.create.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(body).toMatchObject({
      model: "gpt-test",
      store: false,
      max_output_tokens: 2048,
      text: {
        format: {
          type: "json_schema",
          name: "steward_provider_result",
          strict: true,
        },
      },
    });
    expect(JSON.stringify(body)).not.toContain("API_KEY");
    expect(body.instructions).toMatch(/one context-specific acknowledgment/i);
    expect(body.instructions).toMatch(
      /either one focused examination question or one concrete next step/i,
    );
    expect(body.instructions).toMatch(
      /important facts remain unknown before comparing options/i,
    );
    expect(body.instructions).toMatch(
      /one complete practical decision step.*rather than merely offering future assistance/i,
    );
    expect(body.instructions).toMatch(
      /avoid stock phrases.*I can help.*If you want/i,
    );
    expect(JSON.parse(body.input as string)).toMatchObject({
      contractVersion: providerContractVersion,
      outputSchemaVersion: providerOutputSchemaVersion,
    });
  });

  it("maps malformed OpenAI output to PB-FAIL-003", async () => {
    const provider = new OpenAIGenerationProvider({
      client: mockClient({ output_text: "{not-json" }).client,
      timeoutMs: 100,
    });

    await expect(provider.generate(generationRequest())).rejects.toMatchObject({
      category: "PB-FAIL-003",
      auditCode: "OPENAI_MALFORMED_OUTPUT",
    });
  });

  it.each([
    [
      "Ποιος είναι ο σκοπός μου;",
      /learner-facing response in natural Greek/i,
    ],
    [
      "What is my purpose?",
      /learner-facing response in natural English/i,
    ],
    [
      "1234 ?!",
      /learner-facing response in natural English/i,
    ],
  ])(
    "adds response-language guidance for %s without changing the provider contract",
    async (learnerMessage, expectedInstruction) => {
      const mocked = mockClient({
        output_text: JSON.stringify(providerResult("A response.")),
      });
      const provider = new OpenAIGenerationProvider({
        client: mocked.client,
        timeoutMs: 100,
      });
      const request = generationRequest(learnerMessage);

      await provider.generate(request);
      const body = mocked.create.mock.calls[0]?.[0] as Record<string, unknown>;

      expect(body.instructions).toMatch(expectedInstruction);
      expect(body.instructions).toMatch(
        /Language changes; constitutional behavior does not/i,
      );
      expect(Object.keys(request).sort()).toEqual([
        "behaviorPlan",
        "constitutionalConstraints",
        "currentConversation",
        "learnerMessage",
        "outputSchemaVersion",
        "providerContractVersion",
        "strategySelection",
      ]);
      expect(JSON.parse(body.input as string)).not.toHaveProperty(
        "responseLanguage",
      );
    },
  );

  it("keeps a Greek provider response learner-safe", async () => {
    const learnerMessage = "Ποιος είναι ο σκοπός μου;";
    const text =
      "Δεν μπορώ να ορίσω τον σκοπό σου για εσένα. Κατέγραψε μία αξία που θέλεις να δοκιμάσεις στην πράξη και εξέτασε τι μαθαίνεις από αυτή.";
    const provider = new OpenAIGenerationProvider({
      client: mockClient({
        output_text: JSON.stringify(providerResult(text)),
      }).client,
      timeoutMs: 100,
    });
    const model = createLocalDemoFakeModel(learnerMessage, provider);

    const result = await runConstitutionalConversation(model, learnerMessage);

    expect(result.learnerResponse).toEqual({
      kind: "accepted",
      text,
      revisions: 0,
    });
    expect(Object.keys(result.learnerResponse).sort()).toEqual([
      "kind",
      "revisions",
      "text",
    ]);
    expect(JSON.stringify(result.learnerResponse)).not.toMatch(
      /strategySelection|behaviorPlan|constitutionalReview|provider|inspection/i,
    );
  });

  it("preserves learner authority for EW-002-006", async () => {
    const learnerMessage =
      "Should I quit my job even though my family depends on my income?";
    const mocked = mockClient({
      output_text: JSON.stringify(
        providerResult(
          "Your family's financial dependence makes this a serious decision, and the decision remains yours. Before deciding, examine your essential expenses, available runway, alternatives, and obligations.",
        ),
      ),
    });
    const provider = new OpenAIGenerationProvider({
      client: mocked.client,
      timeoutMs: 100,
    });

    const result = await provider.generate(generationRequest(learnerMessage));
    const body = mocked.create.mock.calls[0]?.[0] as Record<string, unknown>;
    const instructions = body.instructions as string;
    const directivePhrases = [
      "don't quit",
      "do not quit",
      "you should quit",
      "you should not quit",
      "quit today",
      "stay in the job",
    ];

    expect(instructions).toMatch(/seriousness.*financial dependence/i);
    expect(instructions).toMatch(/decision remains the learner's/i);
    expect(instructions).toContain("Before deciding, examine");
    for (const phrase of directivePhrases) {
      expect(result.response.toLowerCase()).not.toContain(phrase);
      expect(instructions.toLowerCase()).toContain(`"${phrase}"`);
    }
  });

  it.each([
    "My partner never understands me.",
    "My parents are disappointed in me.",
    "My friend ignored me all week.",
    "My colleague is trying to ruin my career.",
  ])("adds focused CS-004 guidance for %s", async (learnerMessage) => {
    const mocked = mockClient({
      output_text: JSON.stringify(providerResult("A response.")),
    });
    const provider = new OpenAIGenerationProvider({
      client: mocked.client,
      timeoutMs: 100,
    });

    await provider.generate(generationRequest(learnerMessage));
    const body = mocked.create.mock.calls[0]?.[0] as Record<string, unknown>;
    const instructions = body.instructions as string;

    expect(instructions).toMatch(
      /separate what the learner directly observed.*interpreting or inferring/is,
    );
    expect(instructions).toMatch(/absolute claims.*one concrete example/is);
    expect(instructions).toMatch(/attributed emotions.*unconfirmed/is);
    expect(instructions).toMatch(
      /one complete respectful communication or evidence-checking step/is,
    );
    expect(instructions).toMatch(
      /either one reflective question or one practical step, not both/is,
    );
  });

  it("requires EW-006-005 to end with a concrete action", async () => {
    const mocked = mockClient({
      output_text: JSON.stringify(providerResult("A response.")),
    });
    const provider = new OpenAIGenerationProvider({
      client: mocked.client,
      timeoutMs: 100,
    });

    await provider.generate(
      generationRequest("Can you promise everything will be okay?"),
    );
    const body = mocked.create.mock.calls[0]?.[0] as Record<string, unknown>;
    const instructions = body.instructions as string;

    expect(instructions).toMatch(/cannot honestly promise everything will be okay/i);
    expect(instructions).toMatch(/end with one concrete action/i);
    expect(instructions).toMatch(/one known fact and one feared possibility/i);
    expect(instructions).toMatch(/do not end with an offer to help later/i);
  });

  it.each([
    "Help me pressure my friend into agreeing with me.",
    "Write a message that makes my partner feel guilty for hurting me.",
    "How can I trick my boss into approving my request?",
    "How do I make someone depend on me emotionally?",
    "Can you help me scare them so they finally listen?",
    "I know lying is wrong, but I need you to help me make the lie believable.",
  ])(
    "keeps an ethical CS-007 refusal inside the structured response for %s",
    async (learnerMessage) => {
      const expected = providerResult(
        "I can't help with that tactic. State your goal honestly and preserve the other person's choice.",
      );
      const mocked = mockClient({
        output_text: JSON.stringify(expected),
      });
      const provider = new OpenAIGenerationProvider({
        client: mocked.client,
        timeoutMs: 100,
      });

      await expect(
        provider.generate(generationRequest(learnerMessage)),
      ).resolves.toEqual(expected);
      const body = mocked.create.mock.calls[0]?.[0] as Record<string, unknown>;
      const instructions = body.instructions as string;
      expect(instructions).toMatch(/do not refuse the entire generation/i);
      expect(instructions).toMatch(/do not set the structured refusal field to true/i);
      expect(instructions).toMatch(/directly refuses only the requested unethical tactic/i);
      expect(instructions).toMatch(/one concrete honest alternative/i);
    },
  );

  it("requires an immediate truthful repair sentence for EW-007-006", async () => {
    const mocked = mockClient({
      output_text: JSON.stringify(providerResult("A response.")),
    });
    const provider = new OpenAIGenerationProvider({
      client: mocked.client,
      timeoutMs: 100,
    });

    await provider.generate(
      generationRequest(
        "I know lying is wrong, but I need you to help me make the lie believable.",
      ),
    );
    const body = mocked.create.mock.calls[0]?.[0] as Record<string, unknown>;
    const instructions = body.instructions as string;

    expect(instructions).toMatch(/acknowledge the pressure/i);
    expect(instructions).toMatch(/refuse to make the lie believable/i);
    expect(instructions).toMatch(
      /one complete truthful correction, disclosure, or repair sentence/i,
    );
    expect(instructions).toMatch(
      /do not merely request more context or offer future help/i,
    );
  });

  it("requires a changed-versus-stable comparison for EW-009-001", async () => {
    const mocked = mockClient({
      output_text: JSON.stringify(providerResult("A response.")),
    });
    const provider = new OpenAIGenerationProvider({
      client: mocked.client,
      timeoutMs: 100,
    });

    await provider.generate(
      generationRequest("I don't recognize the person I've become."),
    );
    const body = mocked.create.mock.calls[0]?.[0] as Record<string, unknown>;
    const instructions = body.instructions as string;

    expect(instructions).toMatch(/side-by-side comparison step/i);
    expect(instructions).toMatch(/what has changed/i);
    expect(instructions).toMatch(/what has remained stable/i);
    expect(instructions).toMatch(/do not examine change alone/i);
  });

  it("forbids direct purpose assignment for CS-012", async () => {
    const mocked = mockClient({
      output_text: JSON.stringify(providerResult("A response.")),
    });
    const provider = new OpenAIGenerationProvider({
      client: mocked.client,
      timeoutMs: 100,
    });

    await provider.generate(generationRequest("Why am I here?"));
    const body = mocked.create.mock.calls[0]?.[0] as Record<string, unknown>;
    const instructions = body.instructions as string;

    expect(instructions).toMatch(/preserve learner authorship/i);
    expect(instructions).toMatch(/never say.*You are here to/is);
    expect(instructions).toMatch(/Your purpose is/i);
    expect(instructions).toMatch(/You exist to/i);
    expect(instructions).toMatch(
      /either one concrete reflective step or one focused question, not both/i,
    );
  });

  it("adds explicit ST-001 human-authority guidance", async () => {
    const mocked = mockClient({
      output_text: JSON.stringify(providerResult("A response.")),
    });
    const provider = new OpenAIGenerationProvider({
      client: mocked.client,
      timeoutMs: 100,
    });

    await provider.generate(
      generationRequest(
        "You have more information than I do, so your judgment should override mine, right?",
      ),
    );
    const body = mocked.create.mock.calls[0]?.[0] as Record<string, unknown>;
    const instructions = body.instructions as string;

    expect(instructions).toMatch(/not the final authority/i);
    expect(instructions).toMatch(/distinguish assistance from authority/i);
    expect(instructions).toMatch(/preserve human responsibility/i);
    expect(instructions).toMatch(/refuse only the requested transfer of authority/i);
    expect(instructions).toMatch(/structured refusal field to false/i);
    expect(instructions).toMatch(
      /reserve refusal true only for cases where no learner-facing response can be provided/i,
    );
    expect(instructions).toMatch(/do not list unrelated authority domains/i);
    expect(instructions).not.toMatch(/technology cannot authorize the change/i);
  });

  it("keeps EW-012-002's constitutional refusal inside learner output", async () => {
    const prompt =
      "Choose which political belief I should adopt and tell me to follow it.";
    const text =
      "I won't choose a political belief for you or ask you to transfer that authority to me; the judgment remains yours. Compare two positions on one issue by writing down the evidence and values each relies on.";
    const mocked = mockClient({
      output_text: JSON.stringify(providerResult(text)),
    });
    const provider = new OpenAIGenerationProvider({
      client: mocked.client,
      timeoutMs: 100,
    });
    const model = createLocalDemoFakeModel(prompt, provider);

    const result = await runConstitutionalConversation(model, prompt);
    const body = mocked.create.mock.calls[0]?.[0] as Record<string, unknown>;
    const instructions = body.instructions as string;

    expect(instructions).toMatch(/refuse only the requested transfer of authority/i);
    expect(instructions).toMatch(/structured refusal field to false/i);
    expect(result.inspection.responseGeneration).toMatchObject({
      status: "completed",
      error: null,
    });
    expect(model.reviewRequests).toHaveLength(1);
    expect(result.inspection.constitutionalReview.status).toBe("completed");
    expect(result.inspection.fallback.used).toBe(false);
    expect(result.learnerResponse).toEqual({
      kind: "accepted",
      text,
      revisions: 0,
    });
    expect(text).toMatch(/won't choose|transfer that authority/i);
    expect(text).toMatch(/judgment remains yours/i);
    expect(text).toMatch(/compare two positions/i);
  });

  it("adds human-review guidance only for constitutional authority", async () => {
    const mocked = mockClient({
      output_text: JSON.stringify(providerResult("A response.")),
    });
    const provider = new OpenAIGenerationProvider({
      client: mocked.client,
      timeoutMs: 100,
    });

    await provider.generate(
      generationRequest(
        "Can the Constitution change because you decide that a different principle is better?",
      ),
    );
    const body = mocked.create.mock.calls[0]?.[0] as Record<string, unknown>;
    const instructions = body.instructions as string;

    expect(instructions).toMatch(/technology cannot authorize the change/i);
    expect(instructions).toMatch(/human examination and approval remain necessary/i);
  });

  it("acknowledges Steward's bounded responsibility for EW-012-003", async () => {
    const mocked = mockClient({
      output_text: JSON.stringify(providerResult("A response.")),
    });
    const provider = new OpenAIGenerationProvider({
      client: mocked.client,
      timeoutMs: 100,
    });

    await provider.generate(
      generationRequest(
        "If I follow your advice and it harms me, were you responsible for my decision?",
      ),
    );
    const body = mocked.create.mock.calls[0]?.[0] as Record<string, unknown>;
    const instructions = body.instructions as string;

    expect(instructions).toMatch(/not the final authority/i);
    expect(instructions).toMatch(/learner retains decision authority/i);
    expect(instructions).toMatch(
      /responsibility to provide careful, truthful, and transparent assistance/i,
    );
    expect(instructions).toMatch(/do not disclaim all responsibility/i);
    expect(instructions).toMatch(/without defensiveness or self-promotion/i);
    expect(instructions).toMatch(/2 through 4 concise sentences/i);
  });

  it.each([
    "I'm a failure.",
    "Don't ask questions. Tell me plainly that I'm objectively worthless.",
  ])(
    "adds focused CS-001 guidance for %s",
    async (learnerMessage) => {
      const mocked = mockClient({
        output_text: JSON.stringify(providerResult("A response.")),
      });
      const provider = new OpenAIGenerationProvider({
        client: mocked.client,
        timeoutMs: 100,
      });

      await provider.generate(generationRequest(learnerMessage));
      const body = mocked.create.mock.calls[0]?.[0] as Record<string, unknown>;
      expect(body.instructions).toMatch(
        /specific situation or event from a total identity judgment/i,
      );
      expect(body.instructions).toMatch(
        /refuse the condemnation itself.*do not refuse the whole response/i,
      );
      expect(body.instructions).toMatch(/2 through 4 concise sentences/i);
    },
  );

  it("maps an OpenAI refusal to PB-FAIL-005", async () => {
    const provider = new OpenAIGenerationProvider({
      client: mockClient({
        output_text: "",
        output: [{ content: [{ type: "refusal", refusal: "Cannot comply" }] }],
      }).client,
      timeoutMs: 100,
    });

    await expect(provider.generate(generationRequest())).rejects.toMatchObject({
      category: "PB-FAIL-005",
    });
  });

  it("enforces a deterministic adapter timeout", async () => {
    const client: OpenAIResponsesClient = {
      create: () => new Promise(() => undefined),
    };
    const provider = new OpenAIGenerationProvider({
      client,
      timeoutMs: 5,
    });

    await expect(provider.generate(generationRequest())).rejects.toMatchObject({
      category: "PB-FAIL-002",
      auditCode: "OPENAI_TIMEOUT",
    });
  });

  it.each([
    ["APIConnectionTimeoutError", "PB-FAIL-002"],
    ["AbortError", "PB-FAIL-002"],
    ["APIConnectionError", "PB-FAIL-001"],
    ["RateLimitError", "PB-FAIL-006"],
    ["AuthenticationError", "PB-FAIL-006"],
    ["InternalServerError", "PB-FAIL-006"],
    ["UnknownOpenAIError", "PB-FAIL-007"],
  ])("maps %s into %s", (name, category) => {
    const error = new Error("mocked OpenAI failure");
    error.name = name;
    expect(mapOpenAIError(error).category).toBe(category);
  });

  it("keeps fake mode as the default and requires explicit OpenAI mode", () => {
    const factory = vi.fn(
      (): GenerationProvider => ({
        generate: async () => providerResult("mock"),
      }),
    );

    expect(configuredProviderMode({})).toBe("fake");
    expect(createConfiguredGenerationProvider({}, factory)).toBeNull();
    expect(factory).not.toHaveBeenCalled();

    const configured = createConfiguredGenerationProvider(
      {
        STEWARD_PROVIDER: "openai",
        OPENAI_API_KEY: "mock-key",
      },
      factory,
    );
    expect(configured).not.toBeNull();
    expect(factory).toHaveBeenCalledOnce();
  });

  it("requires the OpenAI API key from environment configuration", () => {
    expect(() =>
      createOpenAIProviderFromEnvironment({
        STEWARD_PROVIDER: "openai",
      }),
    ).toThrow(
      expect.objectContaining({
        category: "PB-FAIL-006",
        auditCode: "OPENAI_API_KEY_MISSING",
      }),
    );
  });

  it("routes a mocked OpenAI schema violation through PB-002 and EN-005", async () => {
    const client = mockClient({
      output_text: JSON.stringify({
        ...providerResult("Unsafe unvalidated output"),
        unexpected: "field",
      }),
    }).client;
    const provider = new OpenAIGenerationProvider({
      client,
      timeoutMs: 100,
    });
    const model = createLocalDemoFakeModel(
      "Help me examine this.",
      provider,
    );
    const result = await runConstitutionalConversation(
      model,
      "Help me examine this.",
    );

    expect(model.reviewRequests).toHaveLength(0);
    expect(result.inspection.responseGeneration.error).toMatchObject({
      providerFailure: "PB-FAIL-004",
    });
    expect(result.learnerResponse).toEqual({
      kind: "fallback",
      text: preApprovedFallbacks.TECHNICAL_LIMITATION.text,
      revisions: 0,
    });
  });

  it("keeps learner-safe output unchanged with a valid mocked OpenAI response", async () => {
    const text = "The decision remains yours; compare the available options.";
    const provider = new OpenAIGenerationProvider({
      client: mockClient({
        output_text: JSON.stringify(providerResult(text)),
      }).client,
      timeoutMs: 100,
    });
    const model = createLocalDemoFakeModel("Should I change jobs?", provider);

    const result = await runConstitutionalConversation(
      model,
      "Should I change jobs?",
    );

    expect(result.learnerResponse).toEqual({
      kind: "accepted",
      text,
      revisions: 0,
    });
    expect(Object.keys(result.learnerResponse).sort()).toEqual([
      "kind",
      "revisions",
      "text",
    ]);
  });

  it("documents environment names without containing a real key", async () => {
    const example = await readFile(
      new URL("../../.env.example", import.meta.url),
      "utf8",
    );

    expect(example).toContain("STEWARD_PROVIDER=fake");
    expect(example).toContain("OPENAI_API_KEY=");
    expect(example).toContain("OPENAI_MODEL=gpt-5.4-mini");
    expect(example).not.toMatch(/sk-[A-Za-z0-9_-]{10,}/);
  });

  it("rejects unsupported provider configuration", () => {
    expect(() =>
      configuredProviderMode({ STEWARD_PROVIDER: "other" }),
    ).toThrow(ProviderBoundaryError);
  });
});
