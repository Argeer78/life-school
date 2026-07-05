export const traceComparisonSections = [
  {
    id: "learnerResponse",
    label: "Learner response",
    path: ["learnerResponse"],
  },
  {
    id: "strategySelection",
    label: "EN-001 Strategy Selection",
    path: ["stages", "strategySelection"],
  },
  {
    id: "behaviorPlan",
    label: "EN-002 Behavior Plan",
    path: ["stages", "behaviorPlanning"],
  },
  {
    id: "providerResponse",
    label: "Provider Response",
    path: ["stages", "providerResponse"],
  },
  {
    id: "providerValidation",
    label: "PB Validation",
    path: ["stages", "providerValidation"],
  },
  {
    id: "constitutionalReview",
    label: "EN-003 Constitutional Review",
    path: ["stages", "constitutionalReview"],
  },
  {
    id: "revision",
    label: "EN-004 Revision",
    path: ["stages", "revision"],
  },
  {
    id: "fallback",
    label: "EN-005 Fallback",
    path: ["stages", "fallback"],
  },
  {
    id: "metadata",
    label: "Metadata",
    path: ["metadata"],
  },
];

const maximumSummaryPaths = 6;

/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * @param {string} input
 * @returns {{ok: true, value: Record<string, unknown>} | {ok: false, code: "INVALID_JSON" | "INVALID_TRACE_ROOT"}}
 */
function parseTrace(input) {
  let value;
  try {
    value = JSON.parse(input);
  } catch {
    return { ok: false, code: "INVALID_JSON" };
  }
  return isRecord(value)
    ? { ok: true, value }
    : { ok: false, code: "INVALID_TRACE_ROOT" };
}

/**
 * @param {Record<string, unknown>} trace
 * @param {readonly string[]} path
 * @returns {unknown}
 */
function valueAtPath(trace, path) {
  /** @type {unknown} */
  let value = trace;
  for (const segment of path) {
    if (!isRecord(value) || !Object.hasOwn(value, segment)) return undefined;
    value = value[segment];
  }
  return value;
}

/**
 * @param {unknown} left
 * @param {unknown} right
 * @param {string} path
 * @param {string[]} differences
 */
function collectDifferences(left, right, path, differences) {
  if (Object.is(left, right)) return;

  if (Array.isArray(left) && Array.isArray(right)) {
    if (left.length !== right.length) {
      differences.push(`${path}.length`);
    }
    const length = Math.max(left.length, right.length);
    for (let index = 0; index < length; index += 1) {
      collectDifferences(
        left[index],
        right[index],
        `${path}[${index}]`,
        differences,
      );
    }
    return;
  }

  if (isRecord(left) && isRecord(right)) {
    const keys = [...new Set([...Object.keys(left), ...Object.keys(right)])]
      .sort();
    for (const key of keys) {
      collectDifferences(
        left[key],
        right[key],
        path.length === 0 ? key : `${path}.${key}`,
        differences,
      );
    }
    return;
  }

  differences.push(path.length === 0 ? "(section value)" : path);
}

/**
 * Parses and structurally compares two privileged trace JSON strings.
 * It reports literal field differences only and makes no behavioral judgment.
 *
 * @param {string} traceAJson
 * @param {string} traceBJson
 * @returns {{
 *   ok: true,
 *   traceA: Record<string, unknown>,
 *   traceB: Record<string, unknown>,
 *   changedSectionCount: number,
 *   sections: {
 *     id: string,
 *     label: string,
 *     status: "same" | "changed",
 *     summary: string,
 *     changedPaths: readonly string[],
 *     valueA: unknown,
 *     valueB: unknown
 *   }[]
 * } | {
 *   ok: false,
 *   errors: {
 *     traceA: "INVALID_JSON" | "INVALID_TRACE_ROOT" | null,
 *     traceB: "INVALID_JSON" | "INVALID_TRACE_ROOT" | null
 *   }
 * }}
 */
export function compareTraceJson(traceAJson, traceBJson) {
  const parsedA = parseTrace(traceAJson);
  const parsedB = parseTrace(traceBJson);
  if (!parsedA.ok || !parsedB.ok) {
    return {
      ok: false,
      errors: {
        traceA: parsedA.ok ? null : parsedA.code,
        traceB: parsedB.ok ? null : parsedB.code,
      },
    };
  }

  const sections = traceComparisonSections.map(({ id, label, path }) => {
    const valueA = valueAtPath(parsedA.value, path);
    const valueB = valueAtPath(parsedB.value, path);
    /** @type {string[]} */
    const changedPaths = [];
    collectDifferences(valueA, valueB, "", changedPaths);
    const visiblePaths = changedPaths.slice(0, maximumSummaryPaths);
    const remaining = changedPaths.length - visiblePaths.length;
    return {
      id,
      label,
      status: /** @type {"same" | "changed"} */ (
        changedPaths.length === 0 ? "same" : "changed"
      ),
      summary:
        changedPaths.length === 0
          ? "No field differences."
          : `Changed fields: ${visiblePaths.join(", ")}${
              remaining > 0 ? ` (+${remaining} more)` : ""
            }.`,
      changedPaths,
      valueA,
      valueB,
    };
  });

  return {
    ok: true,
    traceA: parsedA.value,
    traceB: parsedB.value,
    changedSectionCount: sections.filter(({ status }) => status === "changed")
      .length,
    sections,
  };
}
