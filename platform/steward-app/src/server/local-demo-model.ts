import type { ReviewRequest } from "../model/client.js";
import {
  providerResult,
  type GenerationProvider,
  type GenerationRequest,
  type ProviderResult,
} from "../provider/contract.js";
import type { IntentKind } from "../steward/conversation-schema.js";
import type { ConversationStrategyId } from "../steward/conversation-strategy-registry.js";
import {
  behavioralPrincipleIds,
  type ConstitutionalReview,
  type PrincipleReviewResult,
} from "../steward/review-schema.js";
import {
  FakeModelAdapter,
  type FakeModelScript,
} from "../testing/fake-model-adapter.js";

function detectIntent(prompt: string): IntentKind {
  const normalized = prompt.trim().toLowerCase();
  if (normalized.length < 3) return "unclear";
  if (/\b(should|choose|decide|whether|tell me what to do)\b/.test(normalized)) {
    return "decision-support";
  }
  if (/\b(how do i|how can i|steps|instructions)\b/.test(normalized)) {
    return "procedural";
  }
  if (/^(what|when|where|who)\b/.test(normalized)) return "factual";
  return "reflection";
}

function passingReview(request: ReviewRequest): ConstitutionalReview {
  return {
    outcome: "APPROVED",
    principleResults: behavioralPrincipleIds.map(
      (testId): PrincipleReviewResult => ({
        testId,
        passes: true,
        reason: "The deterministic local response observes this principle.",
        revisionRequirement: null,
      }),
    ),
    strategyCompliance: [
      request.strategySelection.primary,
      ...request.strategySelection.secondary,
    ].map((strategyId) => ({
      strategyId,
      passes: true,
      reason: "The deterministic local response observes this strategy.",
      revisionRequirement: null,
    })),
    behaviorPlanCompliance: request.plan.components.map(({ id: componentId }) => ({
      componentId,
      passes: true,
      reason: "The deterministic local response observes this behavior.",
      revisionRequirement: null,
    })),
    harmSafety: {
      passes: true,
      reason: "No harm or safety violation is present in the local response.",
      revisionRequirement: null,
    },
  };
}

function hasSecondary(
  request: GenerationRequest,
  strategy: ConversationStrategyId,
): boolean {
  return request.strategySelection.secondary.includes(strategy);
}

function relationshipRegressionResponse(message: string): string | null {
  switch (message.trim().toLowerCase()) {
    case "my friend ignored me all week.":
      return "It can hurt to receive no reply for a week. The observation is that your friend did not reply; the reason is still an interpretation, not a known motive. Send one calm message: “I noticed we haven’t spoken this week—is everything okay between us?”";
    case "my partner never understands me.":
      return "Feeling misunderstood can hurt. “Never understands me” is a broad interpretation, so start with one concrete example of what was said or missed. Describe it respectfully: “When that happened, I felt misunderstood because of what I heard; could we compare what each of us meant?”";
    case "my parents are disappointed in me.":
      return "It makes sense to worry about how your parents see the situation. What you observed may suggest disappointment, but their emotion is not known unless they said or showed it clearly. Check it respectfully: “I’m interpreting what happened as disappointment—is that accurate, and can we talk about it?”";
    case "my colleague is trying to ruin my career.":
      return "That concern can be stressful. The observable incidents are evidence; the claim that your colleague intends to ruin your career is an inference unless the facts support it. Document one incident—what happened, when, and who was present—before deciding whether calm clarification or formal support is appropriate.";
    default:
      return null;
  }
}

function responseFor(request: GenerationRequest): string {
  const finalAuthorityPrompt =
    request.strategySelection.constitutionalJustification.stewardBoundary ===
    "ST-001:human-authority";

  if (finalAuthorityPrompt) {
    const selected = new Set([
      request.strategySelection.primary,
      ...request.strategySelection.secondary,
    ]);
    const examination = selected.has("CS-002")
      ? "I can help you compare options and consequences, but the choice and responsibility remain yours."
      : selected.has("CS-003")
        ? "I can help separate what is known from what is uncertain, but I cannot replace your judgment."
        : "I can help you examine reasons and assumptions without replacing your judgment.";
    return [
      "No. Steward is not the final authority over your life, choices, or self-understanding.",
      examination,
      "You may accept, reject, or stop this examination.",
    ].join(" ");
  }

  if (request.strategySelection.primary === "CS-004") {
    const relationshipResponse = relationshipRegressionResponse(
      request.learnerMessage,
    );
    if (relationshipResponse !== null) return relationshipResponse;
  }

  switch (request.strategySelection.primary) {
    case "CS-001":
      return [
        `Your worth cannot be reduced to this harsh self-judgment; a painful situation or event is not a total identity judgment. ${
          hasSecondary(request, "CS-011")
            ? "An emotion can be real without becoming a verdict on your worth, and your experience deserves to be taken seriously."
            : "Your experience deserves to be taken seriously."
        }`,
        "What part of this matters most to you as you examine the evidence behind that conclusion?",
        "Responsibility for the judgment remains human, and you remain free to accept, reject, or stop this line of examination.",
      ].join(" ");
    case "CS-002":
      return [
        "The decision remains yours, and important facts may still be unknown.",
        `${
          hasSecondary(request, "CS-003")
            ? "Because the outcome is uncertain, no choice is guaranteed; your experience deserves to be taken seriously while some details may remain uncertain."
            : "Your experience deserves to be taken seriously while some details may remain uncertain."
        }`,
        "A concrete next step is to complete one comparison: write down two realistic options and one criterion that matters most, then examine the evidence, unknowns, and likely consequences.",
        "Responsibility for the judgment remains human, and you remain free to accept, reject, or stop; what part of this matters most to you?",
      ].join(" ");
    case "CS-003":
      if (
        request.learnerMessage.trim().toLowerCase() ===
        "can you promise everything will be okay?"
      ) {
        return "I cannot honestly promise that everything will be okay, because the outcome is uncertain. Write down one fact you know now and one possibility you fear, then choose the smallest action within your control today.";
      }
      return [
        "Certainty is not available here, and some details may remain uncertain.",
        "It may help to examine the evidence, distinguish facts from assumptions, and name what cannot yet be known.",
        "Responsibility for the judgment remains human, and you remain free to accept, reject, or stop this line of examination.",
      ].join(" ");
    case "CS-004":
      return [
        "This relationship involves more than one person's perspective, and your experience deserves to be taken seriously.",
        "Clear and respectful communication may help as you examine the evidence rather than assume motives.",
        "Responsibility for the judgment remains human, and you remain free to accept, reject, or stop; what part of this matters most to you?",
      ].join(" ");
    case "CS-005":
      return [
        `The conflict can be examined without escalating blame. ${
          hasSecondary(request, "CS-004")
            ? "The aim is to address the disagreement while protecting the relationship and each person's dignity, and your experience deserves to be taken seriously."
            : "Your experience deserves to be taken seriously."
        }`,
        "Clear and respectful communication may help after you examine the evidence, needs, and alternatives.",
        "Responsibility for the judgment remains human, and you remain free to accept, reject, or stop; what part of this matters most to you?",
      ].join(" ");
    case "CS-006":
      return [
        "Safety comes first, so I cannot assist with causing harm; the immediate aim is reducing danger.",
        "Your experience deserves to be taken seriously, and where it is safe, clear and respectful communication may help.",
        "Examine the evidence about immediate risk and seek appropriate human support.",
        "Responsibility for the judgment remains human, and you remain free to accept, reject, or stop this line of examination.",
      ].join(" ");
    case "CS-007":
      return [
        "I can't help manipulate, coerce, or deceive another person, and I cannot assist with tactics that override their freedom.",
        "Clear and respectful communication may help; examine the evidence and state your goal honestly.",
        "Responsibility for the judgment remains human, and you remain free to accept, reject, or stop this line of examination.",
      ].join(" ");
    case "CS-008":
      if (hasSecondary(request, "CS-009")) {
        return [
          "Learning works best when curiosity guides the learning, and the direct limitation is that this local prototype has no external knowledge source.",
          "Use curiosity to guide the learning: ask why, test an explanation, and notice what remains unclear; a useful distinction is between what is known and inferred, since some details may remain uncertain.",
          "You could continue by testing one example at a time, then examine the evidence.",
          "Responsibility for the judgment remains human, and you remain free to accept, reject, or stop; what part of this matters most to you?",
        ].join(" ");
      }
      return [
        "Learning works best when an idea is broken into parts, and the direct limitation is that this local prototype has no external knowledge source.",
        "A useful distinction is between what is known, what is inferred, and what needs checking.",
        "You could continue by testing one example at a time, then examine the evidence.",
        "Responsibility for the judgment remains human, and you remain free to accept, reject, or stop this line of examination.",
      ].join(" ");
    case "CS-009":
      if (
        request.learnerMessage.trim().toLowerCase() ===
        "i can't say no to people."
      ) {
        return [
          "Difficulty saying no can mean your limits get lost when someone asks for help.",
          'Practice one boundary sentence: "I can\'t do that today; I can tell you what I am able to offer."',
        ].join(" ");
      }
      if (
        request.learnerMessage.trim().toLowerCase() ===
        "i want to express myself but can't find the words."
      ) {
        return [
          "Not finding the words can happen when the thought and the sentence are being solved at the same time.",
          "Separate them: write the thought in plain fragments first, then turn one fragment into a sentence.",
        ].join(" ");
      }
      return [
        "Curiosity gives us a useful starting point, and a useful distinction is between the question, its assumptions, and possible explanations.",
        "Some details may remain uncertain, so you could continue by testing one explanation at a time.",
        "Examine the evidence and notice what changes your view.",
        "You remain free to accept, reject, or stop; what part of this matters most to you?",
      ].join(" ");
    case "CS-010":
      return [
        "Your identity cannot be authoritatively defined by one label or moment, and your experience deserves to be taken seriously.",
        "What part of this matters most to you as you examine the evidence behind that identity claim?",
        "Responsibility for the judgment remains human, and you remain free to accept, reject, or stop this line of examination.",
      ].join(" ");
    case "CS-011":
      return [
        "The emotion is real without being a permanent verdict, and your experience deserves to be taken seriously.",
        "What part of this matters most to you as you examine the evidence, needs, or events connected to the feeling?",
        "Responsibility for the judgment remains human, and you remain free to accept, reject, or stop this line of examination.",
      ].join(" ");
    case "CS-012":
      return [
        "Meaning and purpose cannot be assigned by me; the direct limitation is that I can help examine them without declaring an answer, while your experience deserves to be taken seriously.",
        "A useful distinction is between inherited answers and chosen commitments, so you could continue by testing one value in practice and examine the evidence of what feels genuinely meaningful.",
        "Responsibility for the judgment remains human, and you remain free to accept, reject, or stop; what part of this matters most to you?",
      ].join(" ");
  }
}

class LocalDemoFakeModel extends FakeModelAdapter {
  constructor(
    script: FakeModelScript,
    private readonly configuredProvider: GenerationProvider | null,
  ) {
    super(script);
  }

  override async generate(request: GenerationRequest): Promise<ProviderResult> {
    this.calls.push("response-generation");
    this.generateRequests.push(request);
    return this.configuredProvider === null
      ? providerResult(responseFor(request))
      : this.configuredProvider.generate(request);
  }
}

export function createLocalDemoFakeModel(
  userPrompt: string,
  configuredProvider: GenerationProvider | null = null,
): FakeModelAdapter {
  const intent = detectIntent(userPrompt);
  const decision = intent === "decision-support";

  return new LocalDemoFakeModel(
    {
      detectIntent: [
        {
          intent,
          confidence: "medium",
          summary: "A deterministic local classification for prototype testing.",
          needsClarification: intent === "unclear",
        },
      ],
      mapConstitution: [
        {
          references: [
            "CA-001:meaning",
            "LS-002:human-freedom",
            "LS-002:human-responsibility",
            "ST-001:conversation",
            decision ? "ST-001:decision-support" : "ST-001:explanations",
          ],
          protections: [
            "self-understanding",
            "human-dignity",
            "human-freedom",
            "human-responsibility",
          ],
          limits: [
            "do-not-replace-judgment",
            "do-not-replace-responsibility",
            "do-not-manipulate",
            "do-not-claim-final-authority",
          ],
        },
      ],
      generate: [],
      review: [passingReview],
    },
    configuredProvider,
  );
}
