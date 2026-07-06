import { access, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

interface PackageMetadata {
  readonly name?: string;
  readonly version?: string;
  readonly private?: boolean;
  readonly main?: string;
  readonly engines?: { readonly node?: string };
  readonly scripts?: Readonly<Record<string, string>>;
}

describe("production deployment metadata", () => {
  it("defines Hostinger-compatible package metadata and scripts", async () => {
    const packageJson = JSON.parse(
      await readFile(new URL("../../package.json", import.meta.url), "utf8"),
    ) as PackageMetadata;

    expect(packageJson.name).toBeTruthy();
    expect(packageJson.version).toBeTruthy();
    expect(packageJson.private).toBe(true);
    expect(packageJson.engines?.node).toBe("22.x");
    expect(packageJson.main).toBe("dist/server/production-server.js");
    expect(packageJson.scripts).toMatchObject({
      dev: expect.any(String),
      build: "node scripts/build.mjs",
      start: "node dist/server/production-server.js",
    });
    expect(packageJson.scripts?.start).not.toMatch(/tsx|local-server\.ts/);
  });

  it("exposes the nested application through the Git repository root", async () => {
    const rootPackage = JSON.parse(
      await readFile(
        new URL("../../../../package.json", import.meta.url),
        "utf8",
      ),
    ) as PackageMetadata & { readonly workspaces?: readonly string[] };

    expect(rootPackage.private).toBe(true);
    expect(rootPackage.engines?.node).toBe("22.x");
    expect(rootPackage.workspaces).toEqual(["platform/steward-app"]);
    expect(rootPackage.main).toBe("server.js");
    expect(rootPackage.scripts).toMatchObject({
      build: "npm run build --workspace=platform/steward-app",
      start: "node server.js",
    });
    await expect(
      access(
        fileURLToPath(new URL("../../../../server.js", import.meta.url)),
      ),
    ).resolves.toBeUndefined();
  });

  it("documents every production environment variable without secrets", async () => {
    const example = await readFile(
      new URL("../../.env.example", import.meta.url),
      "utf8",
    );

    for (const name of [
      "NODE_ENV",
      "HOST",
      "PORT",
      "STEWARD_PROVIDER",
      "OPENAI_API_KEY",
      "OPENAI_MODEL",
      "OPENAI_TIMEOUT_MS",
    ]) {
      expect(example).toMatch(new RegExp(`^${name}=`, "m"));
    }
    expect(example).not.toMatch(/sk-[A-Za-z0-9_-]{10,}/);
  });

  it("produces the compiled server and static learner assets", async () => {
    const outputRoot = join(
      fileURLToPath(new URL("../../", import.meta.url)),
      "dist",
    );

    await expect(
      Promise.all([
        access(join(outputRoot, "server", "production-server.js")),
        access(join(outputRoot, "client", "learn.html")),
        access(join(outputRoot, "client", "learn.css")),
        access(join(outputRoot, "client", "learn.js")),
        access(join(outputRoot, "i18n", "locales", "en.json")),
        access(join(outputRoot, "i18n", "locales", "el.json")),
      ]),
    ).resolves.toBeDefined();
  });
});
