import * as Sentry from '@sentry/react';

let enabled = false;

export function initBrowserMonitoring(): void {
  if (enabled || typeof window === 'undefined') return;
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
  if (!dsn) return;
  Sentry.init({
    dsn,
    environment: (import.meta.env.VITE_SENTRY_ENVIRONMENT as string | undefined) || (import.meta.env.MODE === 'production' ? 'production' : import.meta.env.MODE),
    release: (import.meta.env.VITE_SENTRY_RELEASE as string | undefined) || undefined,
    tracesSampleRate: 0,
    sendDefaultPii: false,
  });
  enabled = true;
}

export function isBrowserMonitoringEnabled(): boolean {
  return enabled;
}
