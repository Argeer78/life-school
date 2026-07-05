/**
 * Creates one browser-memory-only transcript. It has no serialization or
 * persistence behavior.
 *
 * @returns {{
 *   add: (role: "learner" | "steward", text: string) => void,
 *   clear: () => void,
 *   entries: () => readonly {role: "learner" | "steward", text: string}[],
 *   version: () => number
 * }}
 */
export function createMemoryTranscript() {
  /** @type {{role: "learner" | "steward", text: string}[]} */
  const transcript = [];
  let transcriptVersion = 0;

  return {
    add(role, text) {
      transcript.push({ role, text });
    },
    clear() {
      transcript.splice(0, transcript.length);
      transcriptVersion += 1;
    },
    entries() {
      return transcript.map((entry) => ({ ...entry }));
    },
    version() {
      return transcriptVersion;
    },
  };
}
