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
  readonly dependencies?: Readonly<Record<string, string>>;
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

  it("exposes the nested application as a conventional root Node app", async () => {
    const rootPackage = JSON.parse(
      await readFile(
        new URL("../../../../package.json", import.meta.url),
        "utf8",
      ),
    ) as PackageMetadata;

    expect(rootPackage.private).toBe(true);
    expect(rootPackage.engines?.node).toBe("22.x");
    expect(rootPackage.main).toBe("app.js");
    expect(rootPackage.scripts).toMatchObject({
      install: "node scripts/install.mjs",
      build: "node platform/steward-app/scripts/build.mjs",
      start: "node app.js",
    });
    expect(rootPackage.dependencies).toHaveProperty("express");
    await expect(
      access(
        fileURLToPath(new URL("../../../../app.js", import.meta.url)),
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
