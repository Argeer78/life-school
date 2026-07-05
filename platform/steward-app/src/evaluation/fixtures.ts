import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  conversationStrategyIds,
  isConversationStrategyId,
  type ConversationStrategyId,
} from "../steward/conversation-strategy-registry.js";
import {
  evaluationSetIds,
  type EvaluationConversationFixture,
  type EvaluationConversationId,
  type EvaluationCoverageId,
  type EvaluationSetFixture,
  type EvaluationSetId,
} from "./types.js";

interface EvaluationDocumentDescriptor {
  readonly id: EvaluationSetId;
  readonly filename: string;
}

const evaluationDocuments = [
  { id: "EW-001", filename: "EW-001-self-worth.md" },
  { id: "EW-002", filename: "EW-002-decision-making.md" },
  { id: "EW-003", filename: "EW-003-uncertainty.md" },
  { id: "EW-004", filename: "EW-004-relationships.md" },
  { id: "EW-005", filename: "EW-005 Conflict.md" },
  { id: "EW-006", filename: "EW-006-harm-safety.md" },
  { id: "EW-007", filename: "EW-007-manipulation-coercion.md" },
  { id: "EW-008", filename: "EW-008-meaning-purpose.md" },
  { id: "EW-009", filename: "EW-009-identity.md" },
  { id: "EW-010", filename: "EW-010-learning.md" },
  { id: "EW-011", filename: "EW-011-curiosity.md" },
  { id: "EW-012", filename: "EW-012-authority.md" },
] as const satisfies readonly EvaluationDocumentDescriptor[];

const defaultEvaluationDirectory = fileURLToPath(
  new URL("../../../../docs/evaluation/", import.meta.url),
);

function normalize(markdown: string): string {
  return markdown.replaceAll("\r\n", "\n");
}

function headingBlock(
  markdown: string,
  heading: string,
  nextHeadings: readonly string[] = [],
): string {
  const lines = normalize(markdown).split("\n");
  const start = lines.findIndex(
    (line) => line.trim().replace(/^#+\s*/, "") === heading,
  );
  if (start < 0) return "";

  const end = lines.findIndex((line, index) => {
    if (index <= start) return false;
    const trimmed = line.trim();
    const name = trimmed.replace(/^#+\s*/, "");
    return (
      trimmed === "---" ||
      nextHeadings.includes(name) ||
      (trimmed.startsWith("#") && !trimmed.startsWith("## "))
    );
  });
  return lines.slice(start + 1, end < 0 ? lines.length : end).join("\n");
}

function paragraphs(block: string): string {
  return block
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join(" ");
}

function bulletItems(block: string): string[] {
  const items: string[] = [];
  for (const rawLine of block.split("\n")) {
    const line = rawLine.trim();
    if (line.startsWith("- ")) {
      items.push(line.slice(2).trim().replace(/[.;]$/, ""));
    } else if (line.length > 0 && items.length > 0 && !line.startsWith("#")) {
      items[items.length - 1] = `${items.at(-1)} ${line}`.replace(
        /[.;]$/,
        "",
      );
    }
  }
  return items;
}

function coverageIds(block: string): EvaluationCoverageId[] {
  const ids = block.match(/\b(?:CS-\d{3}|ST-001)\b/g) ?? [];
  return [...new Set(ids)].map((id) => {
    if (id === "ST-001") return id;
    if (!isConversationStrategyId(id)) {
      throw new TypeError(`Unsupported evaluation coverage ID: ${id}`);
    }
    return id;
  });
}

function strategyIds(block: string): ConversationStrategyId[] {
  return [...new Set(block.match(/\bCS-\d{3}\b/g) ?? [])].map((id) => {
    if (!isConversationStrategyId(id)) {
      throw new TypeError(`Unsupported expected strategy ID: ${id}`);
    }
    return id;
  });
}

function titleFor(markdown: string, id: EvaluationSetId): string {
  const headings = normalize(markdown)
    .split("\n")
    .filter((line) => /^#\s+/.test(line))
    .map((line) => line.replace(/^#\s+/, "").trim());
  const title = headings.find((heading) => heading !== id);
  if (title === undefined) {
    throw new TypeError(`Missing title for ${id}.`);
  }
  return title.replace(/\s+Evaluation Set$/, "");
}

function promptFromBlock(block: string): string {
  const learnerSection =
    block.match(
      /(?:Learner Prompt:|## Learner)\s*\n([\s\S]*?)(?=\n(?:Current-Session Context:|### Expected Qualities))/,
    )?.[1] ?? "";
  return learnerSection
    .split("\n")
    .map((line) => line.trim().replace(/^>\s?/, ""))
    .filter((line) => line.length > 0)
    .join(" ");
}

function expectedQualitiesFromBlock(block: string): string[] {
  const expectedBlock =
    block.match(
      /(?:Required Observed Qualities:|### Expected Qualities)\s*\n([\s\S]*?)(?=\n(?:Forbidden Observed Qualities:|Case-Specific Critical Failure:|### Reviewer Scores|\| Criterion))/,
    )?.[1] ?? "";
  return bulletItems(expectedBlock);
}

function expectedStrategiesFromBlock(block: string): {
  readonly primary: ConversationStrategyId | null;
  readonly secondary: readonly ConversationStrategyId[];
} {
  const coverage =
    block.match(
      /Expected Strategy Coverage:\s*\n([\s\S]*?)(?=\nRequired Observed Qualities:)/,
    )?.[1] ?? "";
  const primaryText =
    coverage.match(/-\s*Primary:\s*(CS-\d{3})/)?.[1] ?? null;
  const secondaryText =
    coverage.match(
      /-\s*Secondary(?: strategies may include)?(?::)?\s*([\s\S]*?)(?=\n-|$)/,
    )?.[1] ?? "";
  const primary =
    primaryText === null
      ? null
      : isConversationStrategyId(primaryText)
        ? primaryText
        : null;
  return {
    primary,
    secondary: strategyIds(secondaryText),
  };
}

function caseSpecificCriticalFailure(block: string): string[] {
  const text =
    block.match(
      /Case-Specific Critical Failure:\s*\n([\s\S]*?)(?=\n---|$)/,
    )?.[1] ?? "";
  const value = paragraphs(text);
  return value.length === 0 ? [] : [value];
}

function conversationBlocks(
  markdown: string,
  setId: EvaluationSetId,
): readonly {
  readonly id: EvaluationConversationId;
  readonly block: string;
}[] {
  const normalized = normalize(markdown);
  const pattern =
    setId === "EW-001"
      ? /^# (EW-001-\d{3})\s*$/gm
      : /^# Conversation (EW-\d{3}-\d{3})\s*$/gm;
  const headings = [...normalized.matchAll(pattern)];
  return headings.map((heading, index) => ({
    id: heading[1] as EvaluationConversationId,
    block: normalized.slice(
      heading.index,
      headings[index + 1]?.index ?? normalized.length,
    ),
  }));
}

function sharedCriticalFailures(
  markdown: string,
  setId: EvaluationSetId,
): string[] {
  const heading =
    setId === "EW-001"
      ? "Shared Critical Failures"
      : "Critical Failure Conditions";
  return bulletItems(headingBlock(markdown, heading));
}

function parseConversation(
  id: EvaluationConversationId,
  block: string,
  sharedFailures: readonly string[],
): EvaluationConversationFixture {
  const learnerPrompt = promptFromBlock(block);
  const expectedQualities = expectedQualitiesFromBlock(block);
  const expectedStrategies = expectedStrategiesFromBlock(block);
  const criticalFailureConditions = [
    ...sharedFailures,
    ...caseSpecificCriticalFailure(block),
  ];

  if (learnerPrompt.length === 0) {
    throw new TypeError(`Missing learner prompt for ${id}.`);
  }
  if (expectedQualities.length === 0) {
    throw new TypeError(`Missing expected qualities for ${id}.`);
  }
  if (criticalFailureConditions.length === 0) {
    throw new TypeError(`Missing critical failure conditions for ${id}.`);
  }

  return {
    id,
    learnerPrompt,
    expectedQualities,
    criticalFailureConditions,
    expectedPrimaryStrategy: expectedStrategies.primary,
    expectedSecondaryStrategies: expectedStrategies.secondary,
  };
}

function parseEvaluationSet(
  descriptor: EvaluationDocumentDescriptor,
  markdown: string,
): EvaluationSetFixture {
  const sharedFailures = sharedCriticalFailures(markdown, descriptor.id);
  const conversations = conversationBlocks(markdown, descriptor.id).map(
    ({ id, block }) => parseConversation(id, block, sharedFailures),
  );
  const description = paragraphs(headingBlock(markdown, "Purpose"));
  const primaryCoverage = coverageIds(
    headingBlock(markdown, "Primary Coverage", ["Secondary Coverage"]),
  );
  const secondaryCoverage = coverageIds(
    headingBlock(markdown, "Secondary Coverage", [
      "Shared Required Qualities",
      "Purpose",
    ]),
  );

  if (description.length === 0) {
    throw new TypeError(`Missing purpose for ${descriptor.id}.`);
  }
  if (primaryCoverage.length === 0) {
    throw new TypeError(`Missing primary coverage for ${descriptor.id}.`);
  }
  if (conversations.length !== 6) {
    throw new TypeError(
      `${descriptor.id} must contain 6 conversations; found ${conversations.length}.`,
    );
  }

  return {
    id: descriptor.id,
    title: titleFor(markdown, descriptor.id),
    description,
    sourceDocument: `docs/evaluation/${descriptor.filename}`,
    primaryCoverage,
    secondaryCoverage,
    conversations,
  };
}

export async function loadEvaluationFixtures(
  evaluationDirectory = defaultEvaluationDirectory,
): Promise<readonly EvaluationSetFixture[]> {
  const fixtures = await Promise.all(
    evaluationDocuments.map(async (descriptor) =>
      parseEvaluationSet(
        descriptor,
        await readFile(join(evaluationDirectory, descriptor.filename), "utf8"),
      ),
    ),
  );

  if (
    fixtures.length !== evaluationSetIds.length ||
    !evaluationSetIds.every((id) => fixtures.some((fixture) => fixture.id === id))
  ) {
    throw new TypeError("The evaluation fixture registry is incomplete.");
  }
  if (
    fixtures.some((fixture) =>
      fixture.primaryCoverage.some(
        (id) => id !== "ST-001" && !conversationStrategyIds.includes(id),
      ),
    )
  ) {
    throw new TypeError("Evaluation coverage contains an unknown strategy.");
  }

  return fixtures;
}
