// Simple logging utility
export const logger = {
  warn(message, error = null) {
    // In development, log to console
    if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV !== 'production') {
      console.warn(message, error);
    }
    // In production, could send to error tracking service
    // TODO: Add production error tracking
  },

  error(message, error = null) {
    // In development, log to console
    if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV !== 'production') {
      console.error(message, error);
    }
    // In production, could send to error tracking service
    // TODO: Add production error tracking
  },
};
