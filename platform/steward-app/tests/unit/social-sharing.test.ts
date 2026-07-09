import { readFile } from "node:fs/promises";
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import { createLocalStewardServer } from "../../src/server/local-server.js";
import { createShareLinks } from "../../src/client/share-actions.js";

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
  const server = createLocalStewardServer({
    environment: {
      NODE_ENV: "test",
      STEWARD_PROVIDER: "fake",
      ALPHA_ACCESS_CODE: "",
    },
  });
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  return `http://127.0.0.1:${port}`;
}

describe("social sharing and metadata", () => {
  it("generates encoded share URLs for all supported providers", () => {
    const links = createShareLinks(
      "https://lifesh.app/courses/thinking-clearly",
      "Learn to think clearly.",
    );

    expect(links.x).toContain("https://x.com/intent/tweet?");
    expect(links.facebook).toContain("https://www.facebook.com/sharer/sharer.php");
    expect(links.linkedin).toContain("https://www.linkedin.com/sharing/share-offsite/");
    expect(links.whatsapp).toContain("https://wa.me/?text=");
    expect(links.email).toContain("mailto:?");
    expect(links.x).toContain(encodeURIComponent("https://lifesh.app/courses/thinking-clearly"));
  });

  it("keeps homepage sharing controls in footer", async () => {
    const homepage = await readFile(
      new URL("../../src/client/index.html", import.meta.url),
      "utf8",
    );

    expect(homepage).toContain("data-share-root");
    expect(homepage).toContain('data-share-link="x"');
    expect(homepage).toContain('data-share-link="facebook"');
    expect(homepage).toContain('data-share-link="linkedin"');
    expect(homepage).toContain('data-share-link="whatsapp"');
    expect(homepage).toContain('data-share-link="email"');
    expect(homepage).toContain("data-share-copy");
    expect(homepage).toContain('data-i18n="share.homeTitle"');
  });

  it("includes OG and Twitter metadata on core shareable pages", async () => {
    const [home, about, contact, courses, lesson] = await Promise.all([
      readFile(new URL("../../src/client/index.html", import.meta.url), "utf8"),
      readFile(new URL("../../src/client/about.html", import.meta.url), "utf8"),
      readFile(new URL("../../src/client/contact.html", import.meta.url), "utf8"),
      readFile(new URL("../../src/client/courses.html", import.meta.url), "utf8"),
      readFile(new URL("../../src/client/lesson.html", import.meta.url), "utf8"),
    ]);

    for (const page of [home, about, contact, courses, lesson]) {
      expect(page).toContain('name="description"');
      expect(page).toContain('rel="canonical"');
      expect(page).toContain('property="og:title"');
      expect(page).toContain('property="og:description"');
      expect(page).toContain('property="og:image"');
      expect(page).toContain('name="twitter:card"');
      expect(page).toContain('name="twitter:title"');
      expect(page).toContain('name="twitter:description"');
      expect(page).toContain('name="twitter:image"');
    }
  });

  it("renders module and lesson metadata with canonical URLs at runtime", async () => {
    const origin = await startServer();
    const [moduleResponse, lessonResponse] = await Promise.all([
      fetch(`${origin}/courses/thinking-clearly`),
      fetch(`${origin}/courses/thinking-clearly/lesson-2`),
    ]);
    const [moduleHtml, lessonHtml] = await Promise.all([
      moduleResponse.text(),
      lessonResponse.text(),
    ]);

    expect(moduleResponse.status).toBe(200);
    expect(moduleHtml).toContain("Thinking Clearly | Lifeschool");
    expect(moduleHtml).toContain('https://lifesh.app/courses/thinking-clearly');
    expect(moduleHtml).not.toContain("__META_TITLE__");

    expect(lessonResponse.status).toBe(200);
    expect(lessonHtml).toContain("Thinking Clearly - Lesson 2 | Lifeschool");
    expect(lessonHtml).toContain('https://lifesh.app/courses/thinking-clearly/lesson-2');
    expect(lessonHtml).not.toContain("__META_DESCRIPTION__");
  });
});
