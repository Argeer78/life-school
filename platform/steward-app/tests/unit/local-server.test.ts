import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import { createLocalStewardServer } from "../../src/server/local-server.js";

const servers: ReturnType<typeof createLocalStewardServer>[] = [];

afterEach(async () => {
  await Promise.all(
    servers.splice(0).map(
      (server) =>
        new Promise<void>((resolve, reject) => {
          server.close((error) => (error ? reject(error) : resolve()));
        }),
    ),
  );
});

async function startServer() {
  const server = createLocalStewardServer();
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  return `http://127.0.0.1:${port}`;
}

describe("local HTTP server", () => {
  it("returns exactly the learner-safe response over HTTP", async () => {
    const origin = await startServer();
    const response = await fetch(`${origin}/api/message`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Should I make this decision?" }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const body = (await response.json()) as Record<string, unknown>;
    expect(Object.keys(body).sort()).toEqual(["kind", "revisions", "text"]);
    expect(body).not.toHaveProperty("inspection");
    expect(JSON.stringify(body)).not.toMatch(
      /principleResults|revisionRequirement|internalPrompt|rawError/,
    );
  });

  it("returns stable error codes without raw error details", async () => {
    const origin = await startServer();
    const response = await fetch(`${origin}/api/message`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{not valid json",
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: { code: "INVALID_MESSAGE_REQUEST" },
    });
  });
});
