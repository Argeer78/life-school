export type AnalyticsEventType =
  | "page_view"
  | "module_started"
  | "module_completed"
  | "lesson_completed"
  | "lesson_duration"
  | "module_helpful"
  | "language_usage";

export interface AnalyticsEvent {
  readonly type: AnalyticsEventType;
  readonly path?: string;
  readonly moduleSlug?: string;
  readonly lessonNumber?: number;
  readonly durationMs?: number;
  readonly locale?: string;
}

export interface AnalyticsSummary {
  readonly totals: {
    readonly eventsIngested: number;
    readonly uniquePages: number;
    readonly uniqueModulesStarted: number;
    readonly uniqueModulesCompleted: number;
    readonly uniqueHelpfulModules: number;
    readonly uniqueLessonCompletions: number;
    readonly averageLessonDurationMs: number;
    readonly averageLessonDurationSeconds: number;
  };
  readonly modulesStarted: Readonly<Record<string, number>>;
  readonly modulesCompleted: Readonly<Record<string, number>>;
  readonly lessonCompletion: Readonly<Record<string, number>>;
  readonly helpfulModules: Readonly<Record<string, number>>;
  readonly mostVisitedPages: ReadonlyArray<{ path: string; count: number }>;
  readonly languageUsage: Readonly<Record<string, number>>;
  readonly deviceTypes: Readonly<Record<string, number>>;
  readonly lastUpdatedAt: string | null;
}

export class InvalidAnalyticsRequest extends Error {
  readonly code = "INVALID_ANALYTICS_REQUEST";

  constructor() {
    super("INVALID_ANALYTICS_REQUEST");
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null) {
    throw new InvalidAnalyticsRequest();
  }
  return value as Record<string, unknown>;
}

function asOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  return normalized.length === 0 ? undefined : normalized;
}

function sanitizePath(path: string): string {
  if (!path.startsWith("/")) throw new InvalidAnalyticsRequest();
  if (/\s/.test(path) || path.length > 180) {
    throw new InvalidAnalyticsRequest();
  }
  return path;
}

function sanitizeModuleSlug(value: string): string {
  if (!/^[a-z0-9-]{3,40}$/.test(value)) {
    throw new InvalidAnalyticsRequest();
  }
  return value;
}

function sanitizeLocale(value: string): string {
  const locale = value.toLowerCase();
  if (locale !== "en" && locale !== "el") {
    throw new InvalidAnalyticsRequest();
  }
  return locale;
}

function sanitizeLessonNumber(value: unknown): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1 || value > 6) {
    throw new InvalidAnalyticsRequest();
  }
  return value;
}

function sanitizeDuration(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 12 * 60 * 60 * 1000) {
    throw new InvalidAnalyticsRequest();
  }
  return Math.round(value);
}

function parseAcceptedLanguage(headerValue: string | undefined): string | null {
  if (typeof headerValue !== "string" || headerValue.trim().length === 0) {
    return null;
  }
  const token = headerValue.split(",")[0]?.trim().toLowerCase() ?? "";
  if (token.startsWith("el")) return "el";
  if (token.startsWith("en")) return "en";
  return null;
}

export function deviceTypeFromUserAgent(userAgent: string | undefined): string {
  const ua = (userAgent ?? "").toLowerCase();
  if (ua.length === 0) return "unknown";
  if (/bot|crawler|spider|preview|fetch/i.test(ua)) return "bot";
  if (/ipad|tablet|kindle|silk/i.test(ua)) return "tablet";
  if (/mobi|iphone|android/i.test(ua)) return "mobile";
  return "desktop";
}

function increment(store: Map<string, number>, key: string): void {
  store.set(key, (store.get(key) ?? 0) + 1);
}

function sortedEntries(store: Map<string, number>): Array<{ key: string; count: number }> {
  return [...store.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((left, right) => {
      if (right.count !== left.count) return right.count - left.count;
      return left.key.localeCompare(right.key);
    });
}

function asRecordObject(store: Map<string, number>): Record<string, number> {
  return Object.fromEntries(sortedEntries(store).map(({ key, count }) => [key, count]));
}

export function parseAnalyticsEvent(body: unknown): AnalyticsEvent {
  const record = asRecord(body);

  // Explicit privacy guardrails: these fields are never accepted.
  for (const forbidden of ["message", "conversation", "transcript", "reflection", "reflections", "prompt", "response"]) {
    if (forbidden in record) {
      throw new InvalidAnalyticsRequest();
    }
  }

  const type = asOptionalString(record.type);
  if (
    type !== "page_view" &&
    type !== "module_started" &&
    type !== "module_completed" &&
    type !== "lesson_completed" &&
    type !== "lesson_duration" &&
    type !== "module_helpful" &&
    type !== "language_usage"
  ) {
    throw new InvalidAnalyticsRequest();
  }

  const path = asOptionalString(record.path);
  const moduleSlug = asOptionalString(record.moduleSlug);
  const locale = asOptionalString(record.locale);

  switch (type) {
    case "page_view":
      if (path === undefined) throw new InvalidAnalyticsRequest();
      return { type, path: sanitizePath(path), ...(locale === undefined ? {} : { locale: sanitizeLocale(locale) }) };
    case "module_started":
    case "module_completed":
    case "module_helpful":
      if (moduleSlug === undefined) throw new InvalidAnalyticsRequest();
      return { type, moduleSlug: sanitizeModuleSlug(moduleSlug) };
    case "lesson_completed": {
      if (moduleSlug === undefined) throw new InvalidAnalyticsRequest();
      return {
        type,
        moduleSlug: sanitizeModuleSlug(moduleSlug),
        lessonNumber: sanitizeLessonNumber(record.lessonNumber),
      };
    }
    case "lesson_duration": {
      if (moduleSlug === undefined) throw new InvalidAnalyticsRequest();
      return {
        type,
        moduleSlug: sanitizeModuleSlug(moduleSlug),
        lessonNumber: sanitizeLessonNumber(record.lessonNumber),
        durationMs: sanitizeDuration(record.durationMs),
      };
    }
    case "language_usage":
      if (locale === undefined) throw new InvalidAnalyticsRequest();
      return { type, locale: sanitizeLocale(locale) };
  }
}

export class InternalAnalytics {
  private readonly modulesStarted = new Map<string, number>();
  private readonly modulesCompleted = new Map<string, number>();
  private readonly lessonCompletion = new Map<string, number>();
  private readonly lessonDurationTotals = new Map<string, { totalMs: number; count: number }>();
  private readonly helpfulModules = new Map<string, number>();
  private readonly pageVisits = new Map<string, number>();
  private readonly languageUsage = new Map<string, number>();
  private readonly deviceTypes = new Map<string, number>();
  private eventsIngested = 0;
  private lastUpdatedAt: string | null = null;

  ingest(event: AnalyticsEvent, requestMeta: { userAgent?: string; acceptLanguage?: string }): void {
    this.eventsIngested += 1;
    this.lastUpdatedAt = new Date().toISOString();
    increment(this.deviceTypes, deviceTypeFromUserAgent(requestMeta.userAgent));

    const languageFromHeader = parseAcceptedLanguage(requestMeta.acceptLanguage);
    if (languageFromHeader !== null) {
      increment(this.languageUsage, languageFromHeader);
    }

    switch (event.type) {
      case "page_view": {
        if (event.path !== undefined) increment(this.pageVisits, event.path);
        if (event.locale !== undefined) increment(this.languageUsage, event.locale);
        break;
      }
      case "module_started": {
        if (event.moduleSlug !== undefined) increment(this.modulesStarted, event.moduleSlug);
        break;
      }
      case "module_completed": {
        if (event.moduleSlug !== undefined) increment(this.modulesCompleted, event.moduleSlug);
        break;
      }
      case "lesson_completed": {
        if (event.moduleSlug !== undefined && event.lessonNumber !== undefined) {
          increment(this.lessonCompletion, `${event.moduleSlug}/lesson-${event.lessonNumber}`);
        }
        break;
      }
      case "lesson_duration": {
        if (
          event.moduleSlug !== undefined &&
          event.lessonNumber !== undefined &&
          event.durationMs !== undefined
        ) {
          const key = `${event.moduleSlug}/lesson-${event.lessonNumber}`;
          const existing = this.lessonDurationTotals.get(key) ?? { totalMs: 0, count: 0 };
          this.lessonDurationTotals.set(key, {
            totalMs: existing.totalMs + event.durationMs,
            count: existing.count + 1,
          });
        }
        break;
      }
      case "module_helpful": {
        if (event.moduleSlug !== undefined) increment(this.helpfulModules, event.moduleSlug);
        break;
      }
      case "language_usage": {
        if (event.locale !== undefined) increment(this.languageUsage, event.locale);
        break;
      }
    }
  }

  summary(): AnalyticsSummary {
    const durationRows = [...this.lessonDurationTotals.values()];
    const totalDurationMs = durationRows.reduce((sum, row) => sum + row.totalMs, 0);
    const durationCount = durationRows.reduce((sum, row) => sum + row.count, 0);
    const averageLessonDurationMs = durationCount === 0 ? 0 : Math.round(totalDurationMs / durationCount);

    return {
      totals: {
        eventsIngested: this.eventsIngested,
        uniquePages: this.pageVisits.size,
        uniqueModulesStarted: this.modulesStarted.size,
        uniqueModulesCompleted: this.modulesCompleted.size,
        uniqueHelpfulModules: this.helpfulModules.size,
        uniqueLessonCompletions: this.lessonCompletion.size,
        averageLessonDurationMs,
        averageLessonDurationSeconds: Number((averageLessonDurationMs / 1000).toFixed(2)),
      },
      modulesStarted: asRecordObject(this.modulesStarted),
      modulesCompleted: asRecordObject(this.modulesCompleted),
      lessonCompletion: asRecordObject(this.lessonCompletion),
      helpfulModules: asRecordObject(this.helpfulModules),
      mostVisitedPages: sortedEntries(this.pageVisits).map(({ key, count }) => ({ path: key, count })),
      languageUsage: asRecordObject(this.languageUsage),
      deviceTypes: asRecordObject(this.deviceTypes),
      lastUpdatedAt: this.lastUpdatedAt,
    };
  }
}
