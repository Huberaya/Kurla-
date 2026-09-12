import * as Sentry from '@sentry/node';

let enabled = false;

export function initServerMonitoring(): void {
  const dsn = process.env.SENTRY_DSN?.trim();
  if (!dsn || enabled) return;
  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT || process.env.VERCEL_ENV || process.env.NODE_ENV || 'production',
    release: process.env.VERCEL_GIT_COMMIT_SHA || undefined,
    tracesSampleRate: 0,
    sendDefaultPii: false,
    maxBreadcrumbs: 50,
  });
  enabled = true;
  console.log('[Monitoring] Sentry server activé.');
}

export function captureServerException(error: unknown, context: Record<string, string | number | undefined> = {}): void {
  if (!enabled) return;
  Sentry.withScope(scope => {
    for (const [key, value] of Object.entries(context)) {
      if (value !== undefined) scope.setTag(key, String(value));
    }
    Sentry.captureException(error);
  });
}

export async function flushServerMonitoring(timeoutMs = 1500): Promise<void> {
  if (enabled) await Sentry.flush(timeoutMs);
}

export function isServerMonitoringEnabled(): boolean {
  return enabled;
}
