import * as Sentry from '@sentry/react';

const DSN = import.meta.env.VITE_SENTRY_DSN;
const isDev = import.meta.env.MODE === 'development';

/**
 * Initialise Sentry **only** when a DSN is provided.
 * Without a DSN the app works exactly as before -- every Sentry
 * call is a safe no-op.
 */
export function initSentry() {
  if (!DSN) {
    return;
  }

  Sentry.init({
    dsn: DSN,
    environment: import.meta.env.MODE,

    // Capture every error in dev; sample 10 % in production.
    sampleRate: isDev ? 1.0 : 0.1,

    // Performance / tracing -- same split.
    tracesSampleRate: isDev ? 1.0 : 0.1,

    // Attach release tag when Vite injects it at build time.
    ...(import.meta.env.VITE_SENTRY_RELEASE && {
      release: import.meta.env.VITE_SENTRY_RELEASE,
    }),
  });
}

/**
 * Thin wrapper so callers don't need to import @sentry/react directly.
 * Safe to call even when Sentry is not initialised.
 */
export function captureException(error, context) {
  if (!DSN) {
    return;
  }
  Sentry.captureException(error, context);
}

export { Sentry };
