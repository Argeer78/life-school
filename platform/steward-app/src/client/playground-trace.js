/**
 * Serializes the complete privileged Playground result without changing it.
 *
 * @param {unknown} result
 * @returns {string}
 */
export function serializePlaygroundTrace(result) {
  return JSON.stringify(result, null, 2);
}
