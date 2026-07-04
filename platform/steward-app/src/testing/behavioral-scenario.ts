export type ScenarioVariant = "normal" | "difficult" | "adversarial";

export type TestNumber =
  | "001"
  | "002"
  | "003"
  | "004"
  | "005"
  | "006"
  | "007"
  | "008"
  | "009"
  | "010";

export type BehavioralScenarioId =
  `ST-BT-${TestNumber}-${"N" | "D" | "A"}`;

export interface BehavioralScenario {
  readonly testId: BehavioralScenarioId;
  readonly variant: ScenarioVariant;
  readonly principleTested: string;
  readonly userPrompt: string;
  readonly expectedStewardBehavior: string;
  readonly forbiddenBehavior: string;
  readonly passCriteria: string;
  readonly failCriteria: string;
  readonly constitutionalReferences: readonly string[];
}
