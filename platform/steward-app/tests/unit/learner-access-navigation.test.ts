import { readFile } from "node:fs/promises";
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import { renderLessonPage } from "../../src/client/lesson-renderer.js";
import { curriculumLessons } from "../../src/client/curriculum-lessons.js";
import {
  createLocalStewardServer,
  type LocalStewardServerOptions,
} from "../../src/server/local-server.js";

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

async function startServer(options: LocalStewardServerOptions = {}) {
  const server = createLocalStewardServer(options);
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  return `http://127.0.0.1:${port}`;
}

function environment(alphaAccessCode?: string): NodeJS.ProcessEnv {
  return {
    NODE_ENV: "test",
    STEWARD_PROVIDER: "fake",
    ...(alphaAccessCode === undefined
      ? {}
      : { ALPHA_ACCESS_CODE: alphaAccessCode }),
  };
}

function expectLearnerNavigation(html: string) {
  expect(html).toContain('class="learner-nav"');
  expect(html).toContain('href="/"');
  expect(html).toContain('href="/courses"');
}

describe("learner homepage, navigation, and private alpha access", () => {
  it("serves a Lifeschool homepage instead of the chat page", async () => {
    const origin = await startServer({ environment: environment() });
    const response = await fetch(origin);
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");
    expect(html).toContain(
      "Learn to think clearly. Understand yourself. Live intentionally.",
    );
    expect(html).toContain(
      "Lifeschool helps you develop better thinking",
    );
    expect(html).toContain("Start Learning");
    expect(html).toContain("Talk with Steward");
    expect(html).toContain("Thinking Clearly");
    expect(html).toContain('href="/about"');
    expect(html).toContain('href="/contact"');
    expect(html).not.toContain('id="learn-form"');
    expect(html).not.toContain('id="message-form"');
    expect(html).toContain("data-alpha-note hidden");
  });

  it("shows consistent navigation on learner pages and every lesson", async () => {
    const pages = await Promise.all(
      ["index.html", "learn.html", "courses.html"].map((file) =>
        readFile(new URL(`../../src/client/${file}`, import.meta.url), "utf8"),
      ),
    );

    for (const page of pages) {
      expectLearnerNavigation(page);
    }
    expect(pages[0]).toContain('href="/about"');
    expect(pages[0]).toContain('href="/contact"');
    expect(pages[1]).toContain('href="/learn"');
    expect(pages[2]).toContain('href="/learn"');
    for (const lesson of curriculumLessons.en) {
      expectLearnerNavigation(renderLessonPage(lesson));
      expect(renderLessonPage(lesson)).toContain('href="/learn"');
    }
  });

  it("returns a friendly HTML 404 for browser routes and JSON for API routes", async () => {
    const origin = await startServer({ environment: environment() });
    const [browserResponse, apiResponse] = await Promise.all([
      fetch(`${origin}/not-a-page`),
      fetch(`${origin}/api/not-a-route`),
    ]);
    const html = await browserResponse.text();

    expect(browserResponse.status).toBe(404);
    expect(browserResponse.headers.get("content-type")).toContain("text/html");
    expect(html).toContain("Page not found");
    expect(html).toContain('href="/"');
    expect(html).toContain('href="/courses"');
    expect(html).toContain('href="/learn"');
    expect(apiResponse.status).toBe(404);
    expect(apiResponse.headers.get("content-type")).toContain(
      "application/json",
    );
    expect(await apiResponse.json()).toEqual({
      error: { code: "NOT_FOUND" },
    });
  });

  it("keeps health public while gating all configured learner routes", async () => {
    const origin = await startServer({
      environment: environment("private-alpha-code"),
    });
    const routes = [
      "/",
      "/learn",
      "/courses",
      "/courses/thinking-clearly",
      "/courses/thinking-clearly/lesson-6",
      "/courses/communicating-clearly",
      "/courses/making-decisions/lesson-6",
      "/courses/understanding-emotions/lesson-6",
      "/courses/relationships/lesson-6",
      "/courses/purpose-meaning/lesson-6",
    ];
    const responses = await Promise.all(
      routes.map((route) => fetch(`${origin}${route}`)),
    );
    const pages = await Promise.all(responses.map((response) => response.text()));
    const health = await fetch(`${origin}/health`);
    const stylesheet = await fetch(`${origin}/styles.css`);

    expect(responses.every(({ status }) => status === 200)).toBe(true);
    expect(pages.every((page) => page.includes("Private alpha"))).toBe(true);
    expect(pages.every((page) => page.includes("/alpha-access.js"))).toBe(true);
    expect(health.status).toBe(200);
    expect(await health.json()).toEqual({ status: "ok" });
    expect(stylesheet.status).toBe(200);
  });

  it("leaves learner routes open when ALPHA_ACCESS_CODE is unset", async () => {
    const origin = await startServer({ environment: environment() });
    const [home, learn, courses, lesson] = await Promise.all([
      fetch(origin).then((response) => response.text()),
      fetch(`${origin}/learn`).then((response) => response.text()),
      fetch(`${origin}/courses`).then((response) => response.text()),
      fetch(`${origin}/courses/purpose-meaning/lesson-2`).then((response) => response.text()),
    ]);

    expect(home).toContain("Learn to think clearly. Understand yourself. Live intentionally.");
    expect(home).not.toContain("/alpha-access.js");
    expect(learn).toContain('id="learn-form"');
    expect(courses).toContain("Learning Home");
    expect(lesson).toContain('id="lesson-root"');
  });

  it("unlocks protected HTML with an opaque browser-session proof", async () => {
    const accessCode = "private-alpha-code";
    const origin = await startServer({
      environment: environment(accessCode),
    });
    const denied = await fetch(`${origin}/api/alpha-access`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: "wrong", path: "/learn" }),
    });
    expect(denied.status).toBe(401);
    expect(await denied.json()).toEqual({
      error: { code: "ALPHA_ACCESS_DENIED" },
    });

    const granted = await fetch(`${origin}/api/alpha-access`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: accessCode, path: "/learn" }),
    });
    const result = (await granted.json()) as {
      granted: boolean;
      proof: string;
      html: string;
    };

    expect(granted.status).toBe(200);
    expect(result.granted).toBe(true);
    expect(result.proof).toMatch(/^[a-f0-9]{64}$/);
    expect(result.proof).not.toBe(accessCode);
    expect(result.html).toContain('id="learn-form"');

    const homepage = await fetch(`${origin}/api/alpha-access`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ proof: result.proof, path: "/" }),
    });
    const homepageResult = (await homepage.json()) as { html: string };
    expect(homepageResult.html).toContain("data-alpha-note");
    expect(homepageResult.html).not.toContain("data-alpha-note hidden");

    const restored = await fetch(`${origin}/api/alpha-access`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ proof: result.proof, path: "/courses" }),
    });
    const restoredResult = (await restored.json()) as { html: string };
    expect(restored.status).toBe(200);
    expect(restoredResult.html).toContain("Learning Home");

    const lessonRestored = await fetch(`${origin}/api/alpha-access`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        proof: result.proof,
        path: "/courses/thinking-clearly/lesson-2",
      }),
    });
    const lessonResult = (await lessonRestored.json()) as { html: string };
    expect(lessonRestored.status).toBe(200);
    expect(lessonResult.html).toContain("Thinking Clearly - Lesson 2 | Lifeschool");
    expect(lessonResult.html).toContain("https://lifesh.app/courses/thinking-clearly/lesson-2");
    expect(lessonResult.html).not.toContain("__META_TITLE__");

    const gateSource = await readFile(
      new URL("../../src/client/alpha-access.js", import.meta.url),
      "utf8",
    );
    expect(gateSource).toContain("window.sessionStorage.setItem");
    expect(gateSource).toContain("result.proof");
    expect(gateSource).not.toContain("localStorage");
    expect(gateSource).not.toMatch(/document\.cookie|indexedDB|account|database/i);
  });

  it("never exposes privileged trace data through learner or gate pages", async () => {
    const origin = await startServer({
      environment: environment("private-alpha-code"),
    });
    const response = await fetch(`${origin}/api/alpha-access`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: "private-alpha-code",
        path: "/courses/relationships",
      }),
    });
    const serialized = JSON.stringify(await response.json());

    expect(serialized).not.toMatch(
      /developerTrace|inspection|strategySelection|reviewResult|principleResults|providerRequest|providerResponse|internalPrompt|rawError/,
    );
  });

  it("keeps sitemap and robots public while alpha gate is enabled", async () => {
    const origin = await startServer({
      environment: environment("private-alpha-code"),
    });

    const [sitemapResponse, robotsResponse] = await Promise.all([
      fetch(`${origin}/sitemap.xml`),
      fetch(`${origin}/robots.txt`),
    ]);
    const [sitemap, robots] = await Promise.all([
      sitemapResponse.text(),
      robotsResponse.text(),
    ]);

    expect(sitemapResponse.status).toBe(200);
    expect(sitemapResponse.headers.get("content-type")).toBe("application/xml; charset=utf-8");
    expect(sitemap).toContain("<urlset");
    expect(sitemap).toContain("https://lifesh.app/learn");
    expect(sitemap).not.toContain("Private alpha");

    expect(robotsResponse.status).toBe(200);
    expect(robotsResponse.headers.get("content-type")).toBe("text/plain; charset=utf-8");
    expect(robots).toContain("Allow: /");
    expect(robots).toContain("Sitemap: https://lifesh.app/sitemap.xml");
  });
});
