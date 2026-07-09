import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createLocalStewardServer,
  type LocalStewardServerOptions,
} from "../../src/server/local-server.js";
import { OpenAIGenerationProvider } from "../../src/provider/openai/adapter.js";
import type { ContactMailTransport } from "../../src/server/contact-mail.js";

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

describe("local HTTP server", () => {
  it("exposes a minimal production health endpoint", async () => {
    const origin = await startServer();
    const response = await fetch(`${origin}/health`);

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ status: "ok" });
  });

  it("serves sitemap.xml for search engines", async () => {
    const origin = await startServer();
    const response = await fetch(`${origin}/sitemap.xml`);
    const xml = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/xml");
    expect(xml).toContain("<urlset");
    expect(xml).toContain("https://lifesh.app/");
    expect(xml).toContain("https://lifesh.app/courses/thinking-clearly/lesson-6");
  });

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

  it("serves the developer Playground page", async () => {
    const origin = await startServer();
    const response = await fetch(`${origin}/playground`);
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");
    expect(html).toContain("Steward Playground");
    expect(html).toContain("EN-001 Strategy Selection");
    expect(html).toContain("EN-002 Behavior Plan / Generation Request");
    expect(html).toContain("Provider Response");
    expect(html).toContain("PB Validation");
    expect(html).toContain("EN-003 Constitutional Review");
    expect(html).toContain("EN-004 Revision");
    expect(html).toContain("EN-005 Fallback");
    expect(html).toContain("Copy Trace JSON");
    expect(html).toContain("/playground.js");
  });

  it("returns privileged inspection only from the Playground API", async () => {
    const origin = await startServer();
    const response = await fetch(`${origin}/api/playground`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Should I make this decision?" }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const body = (await response.json()) as Record<string, unknown>;
    expect(Object.keys(body).sort()).toEqual([
      "learnerResponse",
      "metadata",
      "stages",
    ]);
    expect(body).toHaveProperty("stages.strategySelection");
    expect(body).toHaveProperty("stages.providerRequest");
    expect(body).toHaveProperty("stages.providerValidation");
    expect(body).toHaveProperty("stages.constitutionalReview");
    expect(body).toHaveProperty("metadata.provider", "fake");
    expect(body).toHaveProperty("metadata.model", "local-demo");

    const learnerResponse = body.learnerResponse as Record<string, unknown>;
    expect(Object.keys(learnerResponse).sort()).toEqual([
      "kind",
      "revisions",
      "text",
    ]);
  });

  it("serves the Benchmark Runner and all canonical suite summaries", async () => {
    const origin = await startServer();
    const [pageResponse, fixtureResponse] = await Promise.all([
      fetch(`${origin}/benchmarks`),
      fetch(`${origin}/api/benchmarks`),
    ]);
    const html = await pageResponse.text();
    const fixtures = (await fixtureResponse.json()) as {
      sets: {
        id: string;
        totalConversations: number;
      }[];
    };

    expect(pageResponse.status).toBe(200);
    expect(html).toContain("Steward Benchmark Runner");
    expect(html).toContain("Run Selected");
    expect(html).toContain("Run All");
    expect(html).toContain("/benchmarks.js");
    expect(fixtureResponse.status).toBe(200);
    expect(fixtures.sets).toHaveLength(12);
    expect(fixtures.sets[0]).toMatchObject({
      id: "EW-001",
      totalConversations: 6,
    });
    expect(fixtures.sets.at(-1)).toMatchObject({
      id: "EW-012",
      totalConversations: 6,
    });
  });

  it("defaults Benchmark API runs to learner-safe unscored results", async () => {
    const origin = await startServer();
    const response = await fetch(`${origin}/api/benchmarks/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scope: "selected", setId: "EW-001" }),
    });
    const body = (await response.json()) as Record<string, unknown>;
    const serialized = JSON.stringify(body);

    expect(response.status).toBe(200);
    expect(body).toHaveProperty("status", "UNSCORED");
    expect(body).toHaveProperty("sets.0.casesUnscored", 6);
    expect(serialized).not.toMatch(
      /developerTrace|strategySelection|reviewResult|fallback/,
    );
  });

  it("serves the Foundation Certification Dashboard", async () => {
    const origin = await startServer();
    const response = await fetch(`${origin}/certification`);
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");
    expect(html).toContain("Steward Certification Dashboard");
    expect(html).toContain("Run Foundation Certification");
    expect(html).toContain(
      "Certification execution collects outputs. Human scoring is still",
    );
    expect(html).toContain("required under EVAL-000.");
    expect(html).toContain("/certification.js");
  });

  it("serves the developer Trace Comparison page", async () => {
    const origin = await startServer();
    const response = await fetch(`${origin}/compare`);
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");
    expect(html).toContain("Trace Comparison");
    expect(html).toContain("Trace A pasted JSON");
    expect(html).toContain("Trace B pasted JSON");
    expect(html).toContain("does not");
    expect(html).toContain("infer constitutional meaning");
    expect(html).toContain("/compare.js");
  });

  it("serves the Steward DevTools Home", async () => {
    const origin = await startServer();
    const response = await fetch(`${origin}/devtools`);
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");
    expect(html).toContain("Steward developer tools");
    expect(html).toContain("Foundation v1.0 Certified");
    expect(html).toContain('href="/playground"');
    expect(html).toContain('href="/benchmarks"');
    expect(html).toContain('href="/certification"');
    expect(html).toContain('href="/compare"');
  });

  it("serves /learn and returns only learner-safe responses to it", async () => {
    const origin = await startServer();
    const pageResponse = await fetch(`${origin}/learn`);
    const html = await pageResponse.text();
    const messageResponse = await fetch(`${origin}/api/message`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "What should I examine first?" }),
    });
    const message = (await messageResponse.json()) as Record<string, unknown>;

    expect(pageResponse.status).toBe(200);
    expect(html).toContain("Steward helps you examine questions honestly");
    expect(html).toContain("Clear conversation");
    expect(html).toContain("/learn.js");
    expect(messageResponse.status).toBe(200);
    expect(Object.keys(message).sort()).toEqual(["kind", "revisions", "text"]);
    expect(JSON.stringify(message)).not.toMatch(
      /inspection|strategySelection|reviewResult|provider|metadata/,
    );
  });

  it("serves English and Greek learner UI locale catalogs", async () => {
    const origin = await startServer();
    const [englishResponse, greekResponse, greekLessonsResponse] =
      await Promise.all([
      fetch(`${origin}/i18n/locales/en.json`),
      fetch(`${origin}/i18n/locales/el.json`),
      fetch(`${origin}/thinking-clearly-lessons-el.js`),
    ]);
    const [english, greek] = await Promise.all([
      englishResponse.json() as Promise<Record<string, string>>,
      greekResponse.json() as Promise<Record<string, string>>,
    ]);
    const greekLessons = await greekLessonsResponse.text();

    expect(englishResponse.status).toBe(200);
    expect(greekResponse.status).toBe(200);
    expect(greekLessonsResponse.status).toBe(200);
    expect(english["learn.clear"]).toBe("Clear conversation");
    expect(greek["learn.clear"]).toBe("Καθάρισε τη συνομιλία");
    expect(greek["courses.moduleTitle"]).toBe("Καθαρή σκέψη");
    expect(greekLessons).toContain("Τι συνέβη και τι σημαίνει");
  });

  it("keeps every DevTools route available after adding /learn", async () => {
    const origin = await startServer();
    const routes = [
      "/devtools",
      "/playground",
      "/benchmarks",
      "/certification",
      "/compare",
    ];
    const responses = await Promise.all(
      routes.map((route) => fetch(`${origin}${route}`)),
    );

    expect(responses.map(({ status }) => status)).toEqual([
      200,
      200,
      200,
      200,
      200,
    ]);
  });

  it("serves curriculum home, all six module routes, and all 36 lesson routes", async () => {
    const origin = await startServer();
    const moduleSlugs = [
      "thinking-clearly",
      "communicating-clearly",
      "making-decisions",
      "understanding-emotions",
      "relationships",
      "purpose-meaning",
    ] as const;
    const lessonRoutes = moduleSlugs.flatMap((slug) => [
      `/courses/${slug}`,
      ...[2, 3, 4, 5, 6].map((lessonNumber) =>
        `/courses/${slug}/lesson-${lessonNumber}`,
      ),
    ]);
    const [
      homeResponse,
      lessonDataResponse,
      lessonPageResponse,
      rendererResponse,
    ] = await Promise.all([
      fetch(`${origin}/courses`),
      fetch(`${origin}/thinking-clearly-lessons.js`),
      fetch(`${origin}/lesson-page.js`),
      fetch(`${origin}/lesson-renderer.js`),
    ]);
    const [home, lessonData, lessonPage, renderer] =
      await Promise.all([
        homeResponse.text(),
        lessonDataResponse.text(),
        lessonPageResponse.text(),
        rendererResponse.text(),
      ]);

    const routeResponses = await Promise.all(
      lessonRoutes.map((route) => fetch(`${origin}${route}`)),
    );
    const routeBodies = await Promise.all(
      routeResponses.map((response) => response.text()),
    );

    expect(homeResponse.status).toBe(200);
    expect(home).toContain("Learning Home");
    expect(home).toContain("Thinking Clearly");
    expect(home).toContain("Communicating Clearly");
    expect(home).toContain("Making Decisions");
    expect(home).toContain("Understanding Emotions");
    expect(home).toContain("Relationships");
    expect(home).toContain("Purpose & Meaning");
    expect(routeResponses.every(({ status }) => status === 200)).toBe(true);
    for (const [index, body] of routeBodies.entries()) {
      expect(body).toContain('id="lesson-root"');
      expect(body).toContain("/lesson-page.js");
      expect(body).toContain(`https://lifesh.app${lessonRoutes[index]}`);
      expect(body).not.toContain("__META_TITLE__");
    }
    expect(lessonDataResponse.status).toBe(200);
    expect(lessonData).toContain('id: "CUR-001-LESSON-1"');
    expect(lessonData).toContain('title: "What happened vs. what it means"');
    expect(lessonData).toContain(
      "Feelings are real, but not always final evidence",
    );
    expect(lessonData).toContain("Assumptions and missing information");
    expect(lessonData).toContain("Better questions create better thinking");
    expect(lessonData).toContain(
      "Evidence, alternatives, and consequences",
    );
    expect(lessonData).toContain("From reaction to examination");
    expect(lessonData).toContain(
      "/courses/thinking-clearly/lesson-2",
    );
    expect(lessonPageResponse.status).toBe(200);
    expect(lessonPage).toContain('fetch("/api/message"');
    expect(rendererResponse.status).toBe(200);
    expect(renderer).toContain("renderWhyThisMatters");
    expect(renderer).toContain("renderPracticeWithSteward");
  });

  it("keeps curriculum Steward practice on the learner-safe API", async () => {
    const origin = await startServer();
    const response = await fetch(`${origin}/api/message`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message:
          "Help me separate the observation from my interpretation: my friend looked at their phone while I was speaking.",
      }),
    });
    const body = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(Object.keys(body).sort()).toEqual(["kind", "revisions", "text"]);
    expect(JSON.stringify(body)).not.toMatch(
      /inspection|strategySelection|reviewResult|provider|metadata/,
    );
  });

  it("logs provider error details server-side while returning learner-safe fallback", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const failingProvider = new OpenAIGenerationProvider({
      client: {
        create: async () => {
          const error = Object.assign(new Error("quota exceeded"), {
            status: 429,
            code: "insufficient_quota",
            type: "insufficient_quota",
          });
          throw error;
        },
      },
      model: "gpt-5.4-mini",
      timeoutMs: 1_000,
    });

    try {
      const origin = await startServer({ generationProvider: failingProvider });
      const response = await fetch(`${origin}/api/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "Can you answer in Greek?" }),
      });
      const body = (await response.json()) as Record<string, unknown>;

      expect(response.status).toBe(200);
      expect(Object.keys(body).sort()).toEqual(["kind", "revisions", "text"]);
      expect(body.kind).toBe("fallback");
      expect(String(body.text)).toContain("technical limitation");
      expect(String(body.text)).not.toContain("insufficient_quota");
      expect(String(body.text)).not.toContain("429");

      expect(errorSpy).toHaveBeenCalledWith(
        "[provider:openai:generate:error]",
        expect.objectContaining({
          model: "gpt-5.4-mini",
          timeoutMs: 1_000,
          error: expect.objectContaining({
            status: 429,
            code: "insufficient_quota",
            type: "insufficient_quota",
          }),
        }),
      );
    } finally {
      errorSpy.mockRestore();
    }
  });

  it("sends production contact form requests through the mail transport", async () => {
    const send = vi.fn<
      ContactMailTransport["send"]
    >(async () => {});
    const origin = await startServer({
      contactMailTransport: { send },
    });

    const response = await fetch(`${origin}/api/contact`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Learner",
        email: "learner@example.com",
        subject: "Question about lessons",
        category: "General Question",
        message: "Could you add one more example to lesson 2?",
        company: "",
        startedAt: Date.now() - 2_000,
      }),
    });

    expect(response.status).toBe(200);
    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "contact",
        to: "contact@alphasynthai.com",
        replyTo: "learner@example.com",
        subject: "[Lifeschool Contact] General Question: Question about lessons",
        text: expect.stringContaining("Name: Learner"),
      }),
    );
  });

  it("sends modal feedback requests including page and viewport metadata", async () => {
    const send = vi.fn<
      ContactMailTransport["send"]
    >(async () => {});
    const origin = await startServer({
      contactMailTransport: { send },
    });

    const response = await fetch(`${origin}/api/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category: "Report Bug",
        message: "The submit button appears disabled on Safari after one failure.",
        email: "",
        page: "/learn",
        language: "en",
        browser: "Mozilla/5.0 test",
        viewport: "390x844",
        company: "",
        startedAt: Date.now() - 2_000,
      }),
    });

    expect(response.status).toBe(200);
    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "feedback",
        to: "contact@alphasynthai.com",
        replyTo: null,
        subject: "[Lifeschool Feedback] Report Bug",
        text: expect.stringContaining("Viewport: 390x844"),
        metadata: expect.objectContaining({
          page: "/learn",
        }),
      }),
    );
  });

  it("returns safe success when SMTP env is missing in development", async () => {
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const origin = await startServer({
        environment: {
          ...process.env,
          NODE_ENV: "development",
          SMTP_HOST: "",
          SMTP_PORT: "",
          SMTP_SECURE: "",
          SMTP_USER: "",
          SMTP_PASS: "",
        },
      });
      const response = await fetch(`${origin}/api/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Fallback Learner",
          email: "fallback@example.com",
          subject: "Fallback check",
          category: "General Question",
          message: "Checking missing SMTP fallback behavior in development mode.",
          company: "",
          startedAt: Date.now() - 2_000,
        }),
      });

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({
        ok: true,
        destination: "contact@alphasynthai.com",
      });
      expect(warnSpy).toHaveBeenCalledWith(
        "[contact:mail:fallback]",
        expect.objectContaining({ mode: "development" }),
      );
      expect(infoSpy).toHaveBeenCalledWith(
        "[contact:mail:queued]",
        expect.objectContaining({ kind: "contact" }),
      );
    } finally {
      infoSpy.mockRestore();
      warnSpy.mockRestore();
    }
  });

  it("enforces communication endpoint rate limiting", async () => {
    const send = vi.fn<
      ContactMailTransport["send"]
    >(async () => {});
    const origin = await startServer({
      contactMailTransport: { send },
      communicationRateLimit: { maxRequests: 1, windowMs: 60_000 },
    });

    const first = await fetch(`${origin}/api/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category: "General Feedback",
        message: "First feedback message with enough detail.",
        email: "",
        page: "/",
        language: "en",
        browser: "Mozilla/5.0 test",
        viewport: "1280x720",
        company: "",
        startedAt: Date.now() - 2_000,
      }),
    });
    const second = await fetch(`${origin}/api/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category: "General Feedback",
        message: "Second feedback message that should be rate limited.",
        email: "",
        page: "/",
        language: "en",
        browser: "Mozilla/5.0 test",
        viewport: "1280x720",
        company: "",
        startedAt: Date.now() - 2_000,
      }),
    });

    expect(first.status).toBe(200);
    expect(second.status).toBe(429);
    expect(await second.json()).toEqual({
      error: { code: "RATE_LIMITED" },
    });
  });
});
