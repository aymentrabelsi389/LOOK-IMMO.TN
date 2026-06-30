import * as Sentry from '@sentry/react';

const sentryDsn = import.meta.env.VITE_SENTRY_DSN;

export function initSentry() {
  if (sentryDsn) {
    Sentry.init({
      dsn: sentryDsn,
      integrations: [
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration(),
      ],
      // Performance Monitoring
      tracesSampleRate: 1.0, 
      // Session Replay
      replaysSessionSampleRate: 0.1, 
      replaysOnErrorSampleRate: 1.0, 
      environment: import.meta.env.MODE,
    });
    console.log('[SENTRY] Initialized successfully');
  } else {
    console.log('[SENTRY] No VITE_SENTRY_DSN configured. Running in no-op mode.');
  }
}
