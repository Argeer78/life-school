export const providerFailureCategories = [
  "PB-FAIL-001",
  "PB-FAIL-002",
  "PB-FAIL-003",
  "PB-FAIL-004",
  "PB-FAIL-005",
  "PB-FAIL-006",
  "PB-FAIL-007",
] as const;

export type ProviderFailureCategory =
  (typeof providerFailureCategories)[number];

export class ProviderBoundaryError extends Error {
  constructor(
    readonly category: ProviderFailureCategory,
    readonly auditCode: string,
  ) {
    super(auditCode);
    this.name = "ProviderBoundaryError";
  }
}

export function classifyProviderFailure(
  error: unknown,
): ProviderFailureCategory {
  if (error instanceof ProviderBoundaryError) return error.category;
  if (error instanceof Error) return "PB-FAIL-006";
  return "PB-FAIL-007";
}
