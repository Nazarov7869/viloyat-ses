// Production-safe logging utility
// Only logs to console in development mode

const isDev = import.meta.env.DEV;

export const logError = (message: string, error?: unknown): void => {
  if (isDev) {
    console.error(message, error);
  }
  // In production, errors are silently ignored in the console
  // Consider adding server-side error monitoring (Sentry, LogRocket) for production
};

export const logWarning = (message: string, data?: unknown): void => {
  if (isDev) {
    console.warn(message, data);
  }
};

export const logInfo = (message: string, data?: unknown): void => {
  if (isDev) {
    console.log(message, data);
  }
};
