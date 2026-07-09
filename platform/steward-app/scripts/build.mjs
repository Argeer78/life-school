import { copyFile, mkdir, readdir, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const outputDirectory = join(projectRoot, "dist");
const clientSourceDirectory = join(projectRoot, "src", "client");
const clientOutputDirectory = join(outputDirectory, "client");
const typeScriptCompiler = createRequire(import.meta.url).resolve(
  "typescript/bin/tsc",
);
const copiedClientExtensions = new Set([
  ".js",
  ".html",
  ".css",
  ".svg",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".gif",
  ".ico",
  ".webmanifest",
]);

async function copyClientAssets(sourceDirectory, targetDirectory) {
  await mkdir(targetDirectory, { recursive: true });
  const entries = await readdir(sourceDirectory, {
    withFileTypes: true,
  });
  for (const entry of entries) {
    const sourcePath = join(sourceDirectory, entry.name);
    const targetPath = join(targetDirectory, entry.name);
    if (entry.isDirectory()) {
      await copyClientAssets(sourcePath, targetPath);
      continue;
    }
    if (!entry.isFile()) continue;

    const extensionIndex = entry.name.lastIndexOf(".");
    const extension =
      extensionIndex === -1
        ? ""
        : entry.name.slice(extensionIndex).toLowerCase();
    if (!copiedClientExtensions.has(extension)) continue;
    await copyFile(sourcePath, targetPath);
  }
}

await rm(outputDirectory, { force: true, recursive: true });

const compilation = spawnSync(
  process.execPath,
  [typeScriptCompiler, "-p", "tsconfig.build.json"],
  { cwd: projectRoot, stdio: "inherit" },
);
if (compilation.status !== 0) {
  process.exit(compilation.status ?? 1);
}

await copyClientAssets(clientSourceDirectory, clientOutputDirectory);
