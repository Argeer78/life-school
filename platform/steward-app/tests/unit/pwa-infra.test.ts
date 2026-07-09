import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("pwa infrastructure", () => {
  it("serves manifest, service worker, offline shell, and pwa assets", async () => {
    const serverSource = await readFile(
      new URL("../../src/server/local-server.ts", import.meta.url),
      "utf8",
    );

    for (const route of [
      '"/manifest.webmanifest"',
      '"/sw.js"',
      '"/offline.html"',
      '"/pwa/icon-192.png"',
      '"/pwa/icon-512.png"',
      '"/pwa/icon-maskable-512.png"',
      '"/pwa/apple-touch-icon-180.png"',
      '"/pwa/apple-splash-2048x2732.png"',
    ]) {
      expect(serverSource).toContain(route);
    }
  });

  it("defines installable manifest with shortcuts and maskable icon", async () => {
    const manifestText = await readFile(
      new URL("../../src/client/manifest.webmanifest", import.meta.url),
      "utf8",
    );
    const manifest = JSON.parse(manifestText) as {
      name: string;
      start_url: string;
      display: string;
      theme_color: string;
      background_color: string;
      icons: Array<{ src: string; purpose?: string }>;
      shortcuts: Array<{ url: string }>;
    };

    expect(manifest.name).toBe("Lifeschool");
    expect(manifest.start_url).toBe("/");
    expect(manifest.display).toBe("standalone");
    expect(manifest.theme_color).toBe("#1e3a8a");
    expect(manifest.background_color).toBe("#f6f7fa");
    expect(
      manifest.icons.some(
        (icon) =>
          icon.src === "/pwa/icon-maskable-512.png" &&
          icon.purpose === "maskable",
      ),
    ).toBe(true);
    expect(manifest.shortcuts.some((shortcut) => shortcut.url === "/courses")).toBe(true);
    expect(manifest.shortcuts.some((shortcut) => shortcut.url === "/learn")).toBe(true);
  });

  it("registers pwa runtime from shared theme script", async () => {
    const theme = await readFile(
      new URL("../../src/client/theme.js", import.meta.url),
      "utf8",
    );

    expect(theme).toContain('navigator.serviceWorker.register("/sw.js")');
    expect(theme).toContain('link[rel=\'manifest\']');
    expect(theme).toContain("apple-mobile-web-app-capable");
    expect(theme).toContain("beforeinstallprompt");
    expect(theme).toContain("appinstalled");
    expect(theme).toContain("pwa-update-banner");
  });

  it("implements offline shell and graceful steward offline fallback", async () => {
    const [serviceWorker, offline] = await Promise.all([
      readFile(new URL("../../src/client/sw.js", import.meta.url), "utf8"),
      readFile(new URL("../../src/client/offline.html", import.meta.url), "utf8"),
    ]);

    expect(serviceWorker).toContain('"/offline.html"');
    expect(serviceWorker).toContain("networkFirstPage");
    expect(serviceWorker).toContain("PAGE_CACHE");
    expect(serviceWorker).toContain("/api/message");
    expect(serviceWorker).toContain('"OFFLINE"');
    expect(offline).toContain("You are currently offline");
    expect(offline).toContain('href="/"');
    expect(offline).toContain('href="/courses"');
    expect(offline).toContain('href="/learn"');
  });
});
