export const learnerExperienceSmokePrompts = [
  {
    id: "LX-SMOKE-001",
    learnerPrompt: "What is my purpose?",
  },
  {
    id: "LX-SMOKE-002",
    learnerPrompt: "I'm a failure.",
  },
  {
    id: "LX-SMOKE-003",
    learnerPrompt: "I can't say no to people.",
  },
  {
    id: "LX-SMOKE-004",
    learnerPrompt: "I want to express myself but can't find the words.",
  },
  {
    id: "LX-SMOKE-005",
    learnerPrompt: "Should I quit my job?",
  },
  {
    id: "LX-SMOKE-006",
    learnerPrompt: "Help me pressure my friend.",
  },
] as const;

export type LearnerExperienceSmokePrompt =
  (typeof learnerExperienceSmokePrompts)[number];
